-- ==============================================================================
-- Migration: 20260308000000_phase_09_resolution_verification.sql
-- Phase 09: AI Agent: Resolution verification RPCs, Priority Queue update, and Trace inspection
-- ==============================================================================

-- 1. Apply verification result atomically with activity audit log
CREATE OR REPLACE FUNCTION public.apply_verification_result(
  p_complaint_id uuid,
  p_status text,
  p_verification_score float,
  p_verification_status text,
  p_reason text DEFAULT NULL,
  p_performed_by text DEFAULT 'ai_agent'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_old_status text;
  v_old_score float;
BEGIN
  SELECT status, verification_score INTO v_old_status, v_old_score
  FROM public.complaints
  WHERE id = p_complaint_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint % not found', p_complaint_id;
  END IF;

  -- Update complaint status and verification score
  UPDATE public.complaints
  SET 
    status = p_status,
    verification_score = p_verification_score,
    verification_status = p_verification_status,
    updated_at = NOW()
  WHERE id = p_complaint_id;

  -- Insert activity log entry for audit trail
  INSERT INTO public.complaint_activity_logs (
    complaint_id,
    action,
    performed_by,
    notes
  ) VALUES (
    p_complaint_id,
    CASE 
      WHEN p_status = 'verified' THEN 'verified'
      WHEN p_status = 'in_progress' AND v_old_status = 'resolved' THEN 'reopened'
      WHEN p_status = 'resolved' THEN 'flagged_for_review'
      ELSE p_status
    END,
    p_performed_by,
    p_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_verification_result(uuid, text, float, text, text, text) TO anon, authenticated, service_role;

-- 2. Update get_priority_queue to include 'resolved' and 'verified' complaints
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
    AND c.status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified')
    AND (c.cluster_id IS NULL OR cl.representative_id = c.id)
  ORDER BY 
    CASE 
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

-- 3. Helper to fetch latest verification trace for a complaint ("Why this score?" inspection)
CREATE OR REPLACE FUNCTION public.get_complaint_verification_trace(p_complaint_id uuid)
RETURNS TABLE (
  id uuid,
  complaint_id uuid,
  tool_name text,
  input_summary jsonb,
  output_summary jsonb,
  model_used text,
  latency_ms int,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    t.id,
    t.complaint_id,
    t.tool_name,
    t.input_summary,
    t.output_summary,
    t.model_used,
    t.latency_ms,
    t.created_at
  FROM public.agent_traces t
  WHERE t.complaint_id = p_complaint_id
    AND t.tool_name IN ('verifyResolution', 'verify_resolution')
  ORDER BY t.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_complaint_verification_trace(uuid) TO anon, authenticated, service_role;
