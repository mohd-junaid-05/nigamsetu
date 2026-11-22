-- Migration: 20260306000000_phase_07_official_dashboard.sql
-- Phase 07: Official Dashboard, SLA Deadlines, and Facility Assignment

-- 1. SLA Deadline Trigger for Complaints
CREATE OR REPLACE FUNCTION public.calculate_complaint_sla_deadline()
RETURNS trigger AS $$
BEGIN
  IF NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline := NEW.created_at + CASE NEW.category
      WHEN 'sewage' THEN INTERVAL '12 hours'
      WHEN 'garbage' THEN INTERVAL '24 hours'
      WHEN 'healthcenter' THEN INTERVAL '48 hours'
      WHEN 'road' THEN INTERVAL '72 hours'
      WHEN 'school' THEN INTERVAL '168 hours'
      ELSE INTERVAL '72 hours'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_complaints_sla_deadline
BEFORE INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.calculate_complaint_sla_deadline();

-- Backfill existing complaints without sla_deadline
UPDATE public.complaints
SET sla_deadline = created_at + CASE category
  WHEN 'sewage' THEN INTERVAL '12 hours'
  WHEN 'garbage' THEN INTERVAL '24 hours'
  WHEN 'healthcenter' THEN INTERVAL '48 hours'
  WHEN 'road' THEN INTERVAL '72 hours'
  WHEN 'school' THEN INTERVAL '168 hours'
  ELSE INTERVAL '72 hours'
END
WHERE sla_deadline IS NULL;

-- 2. Atomic Complaint Assignment RPC
CREATE OR REPLACE FUNCTION public.assign_complaint_to_facility(
  p_complaint_id uuid,
  p_facility_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.complaints
  SET facility_id = p_facility_id,
      status = 'assigned',
      updated_at = now()
  WHERE id = p_complaint_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_complaint_to_facility(uuid, uuid) TO anon, authenticated, service_role;

-- 3. Facilities in Ward RPC
CREATE OR REPLACE FUNCTION public.get_ward_facilities(target_ward_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  ward_id uuid,
  name text,
  type text,
  contact_phone text,
  lat float,
  lng float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    f.id,
    f.ward_id,
    f.name,
    f.type,
    f.contact_phone,
    ST_Y(f.location::geometry) AS lat,
    ST_X(f.location::geometry) AS lng
  FROM public.facilities f
  WHERE (target_ward_id IS NULL OR f.ward_id = target_ward_id)
  ORDER BY f.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_ward_facilities(uuid) TO anon, authenticated, service_role;

-- 4. Updated Priority Queue: strict Phase 7 sort order (severity DESC, weight DESC, created_at ASC)
CREATE OR REPLACE FUNCTION public.get_priority_queue(target_ward_id uuid)
RETURNS TABLE (
  id uuid,
  reporter_id text,
  ward_id uuid,
  cluster_id uuid,
  facility_id uuid,
  category text,
  severity int,
  status text,
  description text,
  image_url text,
  location geometry,
  address_text text,
  sla_deadline timestamptz,
  resolved_at timestamptz,
  resolution_image_url text,
  verification_score float,
  verification_status text,
  escalation_letter_url text,
  created_at timestamptz,
  updated_at timestamptz,
  weight int,
  sla_breached boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    c.id,
    c.reporter_id,
    c.ward_id,
    c.cluster_id,
    c.facility_id,
    c.category,
    c.severity,
    c.status,
    c.description,
    c.image_url,
    c.location,
    c.address_text,
    c.sla_deadline,
    c.resolved_at,
    c.resolution_image_url,
    c.verification_score,
    c.verification_status,
    c.escalation_letter_url,
    c.created_at,
    c.updated_at,
    COALESCE(cl.complaint_count, 1) AS weight,
    (c.sla_deadline IS NOT NULL AND c.sla_deadline < NOW()) AS sla_breached
  FROM public.complaints c
  LEFT JOIN public.complaint_clusters cl ON c.cluster_id = cl.id
  WHERE (target_ward_id IS NULL OR c.ward_id = target_ward_id)
    AND c.status IN ('open', 'assigned', 'in_progress')
    AND (c.cluster_id IS NULL OR cl.representative_id = c.id)
  ORDER BY c.severity DESC, COALESCE(cl.complaint_count, 1) DESC, c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_priority_queue(uuid) TO anon, authenticated, service_role;
