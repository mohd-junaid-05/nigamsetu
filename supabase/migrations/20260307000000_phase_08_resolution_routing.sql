-- Migration: 20260307000000_phase_08_resolution_routing.sql
-- Phase 08: Resolution upload and routing, GPS validation, status transition enforcement, and facility scoping

-- 1. Extend profiles table with facility_id and update role check constraint
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL;

DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('citizen', 'official', 'admin', 'facility'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Extend complaints table with resolution metadata
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS resolution_location geometry(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_complaints_facility_id ON public.complaints(facility_id);
CREATE INDEX IF NOT EXISTS idx_complaints_resolution_location ON public.complaints USING GIST(resolution_location);

-- 3. Ensure resolutions storage bucket exists with public access
INSERT INTO storage.buckets (id, name, public)
VALUES ('resolutions', 'resolutions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Resolutions' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public Access Resolutions" ON storage.objects FOR SELECT USING (bucket_id = 'resolutions');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public upload Resolutions' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public upload Resolutions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resolutions');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete Resolutions' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public delete Resolutions" ON storage.objects FOR DELETE USING (bucket_id = 'resolutions');
  END IF;
END $$;

-- 4. Auth helper: requesting_user_facility_id()
CREATE OR REPLACE FUNCTION public.requesting_user_facility_id() 
RETURNS uuid 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-user-facility-id', '')::uuid,
    ((nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'public_metadata' ->> 'facility_id'))::uuid,
    ((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'facility_id'))::uuid,
    (SELECT facility_id FROM public.profiles WHERE id = public.requesting_user_id()),
    nullif(current_setting('request.jwt.claim.facility_id', true), '')::uuid
  );
$$;

-- 5. RLS policies for facility-scoped complaint access and updates
DROP POLICY IF EXISTS "complaints_select_facility" ON public.complaints;
CREATE POLICY "complaints_select_facility" ON public.complaints
  FOR SELECT USING (
    public.requesting_user_id() IS NOT NULL
    AND facility_id IS NOT NULL 
    AND facility_id = public.requesting_user_facility_id()
  );

DROP POLICY IF EXISTS "complaints_update_facility" ON public.complaints;
CREATE POLICY "complaints_update_facility" ON public.complaints
  FOR UPDATE USING (
    public.requesting_user_id() IS NOT NULL
    AND (
      (facility_id IS NOT NULL AND facility_id = public.requesting_user_facility_id())
      OR (public.requesting_user_role() = 'official' AND ward_id = public.requesting_user_ward_id())
      OR (public.requesting_user_role() = 'admin')
    )
  );

-- 6. Enforce strict status transitions: 'resolved' can ONLY be reached from 'in_progress'
CREATE OR REPLACE FUNCTION public.check_complaint_status_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'in_progress' THEN
    RAISE EXCEPTION 'Invalid status transition: A complaint can only move to resolved from in_progress (current status: %)', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_status_transition ON public.complaints;
CREATE TRIGGER trg_complaint_status_transition
BEFORE UPDATE OF status ON public.complaints
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.check_complaint_status_transition();

-- 7. Facility work log and activity timeline table
CREATE TABLE IF NOT EXISTS public.complaint_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'assigned', 'in_progress', 'resolved', 'verified', 'reopened'
  performed_by text,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_complaint_id ON public.complaint_activity_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.complaint_activity_logs(created_at DESC);

ALTER TABLE public.complaint_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select" ON public.complaint_activity_logs;
CREATE POLICY "activity_logs_select" ON public.complaint_activity_logs
  FOR SELECT USING (public.requesting_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "activity_logs_insert" ON public.complaint_activity_logs;
CREATE POLICY "activity_logs_insert" ON public.complaint_activity_logs
  FOR INSERT WITH CHECK (public.requesting_user_id() IS NOT NULL);

-- 8. Atomic complaint resolution RPC function
CREATE OR REPLACE FUNCTION public.resolve_complaint(
  p_complaint_id uuid,
  p_resolution_image_url text,
  p_resolution_notes text DEFAULT NULL,
  p_lat float DEFAULT NULL,
  p_lng float DEFAULT NULL,
  p_resolver_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  status text,
  resolved_at timestamptz,
  resolution_image_url text,
  resolution_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_current_status text;
  v_res_location geometry(Point, 4326) := NULL;
  v_resolved_at timestamptz := now();
  v_facility_id uuid;
BEGIN
  SELECT c.status, c.facility_id INTO v_current_status, v_facility_id
  FROM public.complaints c
  WHERE c.id = p_complaint_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint not found';
  END IF;

  IF v_current_status != 'in_progress' THEN
    RAISE EXCEPTION 'Invalid status transition: A complaint can only move to resolved from in_progress (current status: %)', v_current_status;
  END IF;

  IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    v_res_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  END IF;

  UPDATE public.complaints
  SET status = 'resolved',
      resolution_image_url = p_resolution_image_url,
      resolution_notes = p_resolution_notes,
      resolution_location = v_res_location,
      resolved_at = v_resolved_at,
      verification_status = 'pending',
      updated_at = v_resolved_at
  WHERE public.complaints.id = p_complaint_id;

  -- Insert audit activity log
  INSERT INTO public.complaint_activity_logs (
    complaint_id,
    action,
    performed_by,
    facility_id,
    notes,
    metadata
  ) VALUES (
    p_complaint_id,
    'resolved',
    COALESCE(p_resolver_id, public.requesting_user_id()),
    v_facility_id,
    p_resolution_notes,
    jsonb_build_object(
      'resolution_image_url', p_resolution_image_url,
      'lat', p_lat,
      'lng', p_lng
    )
  );

  RETURN QUERY
  SELECT c.id, c.status, c.resolved_at, c.resolution_image_url, c.resolution_notes
  FROM public.complaints c
  WHERE c.id = p_complaint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_complaint(uuid, text, text, float, float, text) TO anon, authenticated, service_role;

-- 9. Atomic mark in-progress RPC function
CREATE OR REPLACE FUNCTION public.mark_complaint_in_progress(
  p_complaint_id uuid,
  p_user_id text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_facility_id uuid;
  v_status text;
BEGIN
  SELECT status, facility_id INTO v_status, v_facility_id
  FROM public.complaints
  WHERE id = p_complaint_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint not found';
  END IF;

  IF v_status NOT IN ('assigned', 'open') THEN
    RAISE EXCEPTION 'Cannot mark in progress from status %', v_status;
  END IF;

  UPDATE public.complaints
  SET status = 'in_progress',
      updated_at = now()
  WHERE id = p_complaint_id;

  INSERT INTO public.complaint_activity_logs (
    complaint_id,
    action,
    performed_by,
    facility_id,
    notes
  ) VALUES (
    p_complaint_id,
    'in_progress',
    COALESCE(p_user_id, public.requesting_user_id()),
    v_facility_id,
    COALESCE(p_notes, 'Work started by municipal facility team')
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_complaint_in_progress(uuid, text, text) TO anon, authenticated, service_role;

-- 10. RPC function to get complaints scoped to a facility
CREATE OR REPLACE FUNCTION public.get_facility_complaints(p_facility_id uuid)
RETURNS TABLE (
  id uuid,
  category text,
  severity int,
  status text,
  description text,
  image_url text,
  address_text text,
  lat float,
  lng float,
  sla_deadline timestamptz,
  resolved_at timestamptz,
  resolution_image_url text,
  resolution_notes text,
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
    c.category,
    c.severity,
    c.status,
    c.description,
    c.image_url,
    c.address_text,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng,
    c.sla_deadline,
    c.resolved_at,
    c.resolution_image_url,
    c.resolution_notes,
    c.created_at,
    c.updated_at,
    COALESCE(cl.complaint_count, 1) AS weight,
    (c.sla_deadline IS NOT NULL AND c.sla_deadline < NOW()) AS sla_breached
  FROM public.complaints c
  LEFT JOIN public.complaint_clusters cl ON c.cluster_id = cl.id
  WHERE c.facility_id = p_facility_id
  ORDER BY 
    CASE c.status
      WHEN 'in_progress' THEN 1
      WHEN 'assigned' THEN 2
      WHEN 'resolved' THEN 3
      ELSE 4
    END ASC,
    c.severity DESC,
    c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_facility_complaints(uuid) TO anon, authenticated, service_role;
