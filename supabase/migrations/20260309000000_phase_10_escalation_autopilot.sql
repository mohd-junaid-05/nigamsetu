-- =====================================================================
-- NigamSetu: Migration Phase 10 - Escalation Autopilot
-- File: supabase/migrations/20260309000000_phase_10_escalation_autopilot.sql
-- =====================================================================

-- 1. Ensure public escalations storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('escalations', 'escalations', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies for escalations bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Escalations Access' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public Escalations Access" ON storage.objects FOR SELECT USING (bucket_id = 'escalations');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public upload escalations' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public upload escalations" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'escalations');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete escalations' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public delete escalations" ON storage.objects FOR DELETE USING (bucket_id = 'escalations');
  END IF;
END $$;

-- 2. Extend escalations table
ALTER TABLE public.escalations ADD COLUMN IF NOT EXISTS letter_url text;

-- Relax / extend trigger_reason constraint to include 'manual'
ALTER TABLE public.escalations DROP CONSTRAINT IF EXISTS escalations_trigger_reason_check;
ALTER TABLE public.escalations ADD CONSTRAINT escalations_trigger_reason_check 
  CHECK (trigger_reason IN ('sla_breach', 'verification_failed', 'ghost_closure', 'manual'));

-- 3. Extend complaints table for escalation lifecycle
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS previous_status text;

-- 4. RPC to atomically record escalation, update complaint status, and log activity
CREATE OR REPLACE FUNCTION public.create_escalation_record(
  p_complaint_id uuid,
  p_trigger_reason text,
  p_letter_content text,
  p_authority text,
  p_deadline date,
  p_letter_url text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  escalation_id uuid,
  complaint_id uuid,
  status text,
  deadline date,
  letter_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_escalation_id uuid;
  v_old_status text;
BEGIN
  -- 1. Get current status of complaint
  SELECT c.status INTO v_old_status
  FROM public.complaints c
  WHERE c.id = p_complaint_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint % not found', p_complaint_id;
  END IF;

  -- 2. Insert escalation record
  INSERT INTO public.escalations (
    complaint_id,
    trigger_reason,
    letter_content,
    authority,
    deadline,
    status,
    letter_url
  )
  VALUES (
    p_complaint_id,
    p_trigger_reason,
    p_letter_content,
    p_authority,
    p_deadline,
    'draft',
    p_letter_url
  )
  RETURNING id INTO v_escalation_id;

  -- 3. Update complaint
  UPDATE public.complaints
  SET 
    previous_status = COALESCE(previous_status, v_old_status),
    status = 'escalated',
    escalation_letter_url = p_letter_url,
    updated_at = now()
  WHERE id = p_complaint_id;

  -- 4. Log in complaint_activity_logs
  INSERT INTO public.complaint_activity_logs (
    complaint_id,
    action,
    performed_by,
    notes,
    metadata
  )
  VALUES (
    p_complaint_id,
    'escalated',
    public.requesting_user_id(),
    COALESCE(p_notes, 'Statutory escalation letter generated (' || p_authority || ')'),
    jsonb_build_object(
      'escalation_id', v_escalation_id,
      'trigger_reason', p_trigger_reason,
      'authority', p_authority,
      'deadline', p_deadline,
      'letter_url', p_letter_url
    )
  );

  RETURN QUERY
  SELECT 
    v_escalation_id,
    p_complaint_id,
    'draft'::text,
    p_deadline,
    p_letter_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_escalation_record(uuid, text, text, text, date, text, text) TO anon, authenticated, service_role;

-- 5. RPC to fetch all escalations for official dashboard queue
CREATE OR REPLACE FUNCTION public.get_ward_escalations(target_ward_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  complaint_id uuid,
  trigger_reason text,
  letter_content text,
  authority text,
  deadline date,
  status text,
  letter_url text,
  created_at timestamptz,
  days_remaining int,
  is_overdue boolean,
  category text,
  severity int,
  address_text text,
  ward_id uuid,
  ward_name text,
  reporter_id text,
  image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    e.id,
    e.complaint_id,
    e.trigger_reason,
    e.letter_content,
    e.authority,
    e.deadline,
    e.status,
    COALESCE(e.letter_url, c.escalation_letter_url) AS letter_url,
    e.created_at,
    (e.deadline - CURRENT_DATE)::int AS days_remaining,
    (e.deadline < CURRENT_DATE AND e.status != 'resolved') AS is_overdue,
    c.category,
    c.severity,
    c.address_text,
    c.ward_id,
    w.name AS ward_name,
    c.reporter_id,
    c.image_url
  FROM public.escalations e
  JOIN public.complaints c ON e.complaint_id = c.id
  LEFT JOIN public.wards w ON c.ward_id = w.id
  WHERE (target_ward_id IS NULL OR c.ward_id = target_ward_id)
  ORDER BY 
    CASE WHEN e.deadline < CURRENT_DATE AND e.status != 'resolved' THEN 1 ELSE 2 END ASC,
    e.deadline ASC,
    e.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_ward_escalations(uuid) TO anon, authenticated, service_role;

-- 6. RPC to update escalation status (draft -> submitted -> acknowledged -> resolved)
CREATE OR REPLACE FUNCTION public.update_escalation_status(
  p_escalation_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_complaint_id uuid;
BEGIN
  IF p_status NOT IN ('draft', 'submitted', 'acknowledged', 'resolved') THEN
    RAISE EXCEPTION 'Invalid escalation status: %', p_status;
  END IF;

  UPDATE public.escalations
  SET status = p_status
  WHERE id = p_escalation_id
  RETURNING complaint_id INTO v_complaint_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Activity log
  INSERT INTO public.complaint_activity_logs (
    complaint_id,
    action,
    performed_by,
    notes,
    metadata
  )
  VALUES (
    v_complaint_id,
    'escalation_' || p_status,
    public.requesting_user_id(),
    COALESCE(p_notes, 'Escalation status updated to ' || p_status),
    jsonb_build_object('escalation_id', p_escalation_id, 'new_status', p_status)
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_escalation_status(uuid, text, text) TO anon, authenticated, service_role;

-- 7. Update get_priority_queue to also include escalated complaints
CREATE OR REPLACE FUNCTION public.get_priority_queue(target_ward_id uuid)
RETURNS TABLE(
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
    AND c.status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'escalated')
    AND (c.cluster_id IS NULL OR cl.representative_id = c.id)
  ORDER BY 
    CASE 
      WHEN c.status = 'escalated' THEN 0
      WHEN c.status = 'resolved' AND (c.verification_status IS NULL OR c.verification_status = 'pending') THEN 1
      WHEN c.status = 'open' THEN 2
      WHEN c.status = 'assigned' THEN 3
      WHEN c.status = 'in_progress' THEN 4
      WHEN c.status = 'verified' THEN 5
      ELSE 6
    END ASC,
    c.severity DESC,
    COALESCE(cl.complaint_count, 1) DESC,
    c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_priority_queue(uuid) TO anon, authenticated, service_role;
