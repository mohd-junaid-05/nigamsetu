-- =====================================================================
-- NigamSetu: Phase 12 Agent Traces and Transparency Migration
-- File: 20260311000000_phase_12_agent_traces_and_transparency.sql
-- =====================================================================

-- 1. Performance Indexes for Trace Lookups and Filtering
CREATE INDEX IF NOT EXISTS idx_agent_traces_complaint_id ON public.agent_traces(complaint_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_tool_name ON public.agent_traces(tool_name);
CREATE INDEX IF NOT EXISTS idx_agent_traces_created_at ON public.agent_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_traces_model_used ON public.agent_traces(model_used);

-- 2. Strict Row-Level Security Policy for agent_traces
-- Enforces Acceptance Check 4:
-- "A citizen clicks 'Why this score?' on their own complaint. They see the trace.
--  They do not see traces for other citizens' complaints (RLS on agent_traces)."
-- Admins see all traces. Officials see ward-scoped traces & general chat traces.
ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_traces_select" ON public.agent_traces;

CREATE POLICY "agent_traces_select" ON public.agent_traces
  FOR SELECT USING (
    public.requesting_user_id() IS NOT NULL
    AND (
      -- 1. Admins have global audit access to all traces
      public.requesting_user_role() = 'admin'
      OR
      -- 2. Municipal officials see traces for complaints in their ward, or general traces (null complaint_id)
      (
        public.requesting_user_role() = 'official'
        AND (
          agent_traces.complaint_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = agent_traces.complaint_id
            AND (c.ward_id = public.requesting_user_ward_id() OR public.requesting_user_ward_id() IS NULL)
          )
        )
      )
      OR
      -- 3. Citizens can ONLY view traces for their own complaints
      (
        public.requesting_user_role() = 'citizen'
        AND agent_traces.complaint_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.complaints c
          WHERE c.id = agent_traces.complaint_id
          AND c.reporter_id = public.requesting_user_id()
        )
      )
      OR
      -- 4. Facility workers can view traces for complaints assigned to their facility
      (
        public.requesting_user_role() = 'facility'
        AND agent_traces.complaint_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.complaints c
          WHERE c.id = agent_traces.complaint_id
          AND c.facility_id = (SELECT facility_id FROM public.profiles WHERE id = public.requesting_user_id())
        )
      )
    )
  );

-- 3. RPC Function for Filtered Traces (Admin & Official Transparency View)
-- Supports filtering by tool, complaint, date range, and model with pagination
CREATE OR REPLACE FUNCTION public.get_filtered_agent_traces(
  p_tool_name text DEFAULT NULL,
  p_complaint_id uuid DEFAULT NULL,
  p_model_used text DEFAULT NULL,
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  complaint_id uuid,
  tool_name text,
  input_summary jsonb,
  output_summary jsonb,
  model_used text,
  latency_ms int,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH filtered AS (
    SELECT 
      t.id,
      t.complaint_id,
      t.tool_name,
      t.input_summary,
      t.output_summary,
      t.model_used,
      t.latency_ms,
      t.created_at,
      COUNT(*) OVER() AS total_count
    FROM public.agent_traces t
    WHERE 
      -- Strict authorization check matching RLS
      (
        public.requesting_user_role() = 'admin'
        OR (
          public.requesting_user_role() = 'official'
          AND (
            t.complaint_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.complaints c
              WHERE c.id = t.complaint_id
              AND (c.ward_id = public.requesting_user_ward_id() OR public.requesting_user_ward_id() IS NULL)
            )
          )
        )
        OR (
          public.requesting_user_role() = 'citizen'
          AND t.complaint_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = t.complaint_id
            AND c.reporter_id = public.requesting_user_id()
          )
        )
      )
      AND (
        p_tool_name IS NULL 
        OR p_tool_name = 'all'
        OR t.tool_name = p_tool_name
        OR (p_tool_name = 'verifyResolution' AND t.tool_name IN ('verifyResolution', 'verify_resolution'))
        OR (p_tool_name = 'scoreSeverity' AND t.tool_name IN ('scoreSeverity', 'severity_score'))
        OR (p_tool_name = 'checkDuplicate' AND t.tool_name IN ('checkDuplicate', 'duplicate_check'))
        OR (p_tool_name = 'generateEscalation' AND t.tool_name IN ('generateEscalation', 'generate_escalation'))
        OR (p_tool_name = 'answerChat' AND t.tool_name IN ('answerChat', 'chat_answer'))
      )
      AND (p_complaint_id IS NULL OR t.complaint_id = p_complaint_id)
      AND (p_model_used IS NULL OR p_model_used = 'all' OR t.model_used ILIKE '%' || p_model_used || '%')
      AND (p_from_date IS NULL OR t.created_at >= p_from_date)
      AND (p_to_date IS NULL OR t.created_at <= p_to_date)
    ORDER BY t.created_at DESC
    LIMIT COALESCE(p_limit, 50)
    OFFSET COALESCE(p_offset, 0)
  )
  SELECT * FROM filtered;
$$;

GRANT EXECUTE ON FUNCTION public.get_filtered_agent_traces(text, uuid, text, timestamptz, timestamptz, int, int) TO anon, authenticated, service_role;
