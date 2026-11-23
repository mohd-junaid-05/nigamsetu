-- =====================================================================
-- NigamSetu: Migration Phase 11 - AI Agent Chat Panel
-- File: supabase/migrations/20260310000000_phase_11_agent_chat.sql
-- =====================================================================

-- RPC to retrieve ward complaints with flexible structured filters and exact total counts
CREATE OR REPLACE FUNCTION public.get_ward_chat_complaints(
  p_ward_id uuid,
  p_category text DEFAULT NULL,
  p_status text[] DEFAULT NULL,
  p_severity int DEFAULT NULL,
  p_created_before timestamptz DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL,
  p_has_cluster boolean DEFAULT NULL,
  p_sla_breached boolean DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  category text,
  severity int,
  status text,
  description text,
  address_text text,
  created_at timestamptz,
  sla_deadline timestamptz,
  cluster_id uuid,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT 
      c.id,
      c.category,
      c.severity,
      c.status,
      c.description,
      c.address_text,
      c.created_at,
      c.sla_deadline,
      c.cluster_id,
      COUNT(*) OVER() AS total_count
    FROM public.complaints c
    WHERE c.ward_id = p_ward_id
      AND (p_category IS NULL OR c.category = p_category)
      AND (p_status IS NULL OR c.status = ANY(p_status))
      AND (p_severity IS NULL OR c.severity = p_severity)
      AND (p_created_before IS NULL OR c.created_at < p_created_before)
      AND (p_created_after IS NULL OR c.created_at > p_created_after)
      AND (p_has_cluster IS NULL OR (p_has_cluster = true AND c.cluster_id IS NOT NULL) OR (p_has_cluster = false AND c.cluster_id IS NULL))
      AND (p_sla_breached IS NULL OR (p_sla_breached = true AND c.sla_deadline < now()) OR (p_sla_breached = false AND (c.sla_deadline >= now() OR c.sla_deadline IS NULL)))
    ORDER BY c.created_at DESC
    LIMIT p_limit
  )
  SELECT * FROM filtered;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_ward_chat_complaints(uuid, text, text[], int, timestamptz, timestamptz, boolean, boolean, int) TO authenticated, service_role, anon;
