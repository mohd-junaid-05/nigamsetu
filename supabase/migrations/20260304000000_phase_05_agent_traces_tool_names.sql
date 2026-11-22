-- Phase 05: AI Agent Severity Scoring Migration
-- 1. Update agent_traces check constraint to allow both camelCase and snake_case tool names
ALTER TABLE public.agent_traces DROP CONSTRAINT IF EXISTS agent_traces_tool_name_check;
ALTER TABLE public.agent_traces ADD CONSTRAINT agent_traces_tool_name_check 
  CHECK (tool_name = ANY (ARRAY[
    'scoreSeverity'::text, 'severity_score'::text, 
    'checkDuplicate'::text, 'duplicate_check'::text, 
    'verifyResolution'::text, 'verify_resolution'::text, 
    'generateEscalation'::text, 'generate_escalation'::text, 
    'answerChat'::text, 'chat_answer'::text
  ]));

-- 2. Secure RPC to update severity column only (PATCH constraint)
CREATE OR REPLACE FUNCTION public.update_complaint_severity(
  p_complaint_id uuid,
  p_severity int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.complaints
  SET severity = p_severity,
      updated_at = now()
  WHERE id = p_complaint_id;
  RETURN FOUND;
END;
$$;

-- 3. Secure RPC to log agent traces
CREATE OR REPLACE FUNCTION public.record_agent_trace(
  p_complaint_id uuid,
  p_tool_name text,
  p_input_summary jsonb,
  p_output_summary jsonb,
  p_model_used text,
  p_latency_ms int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trace_id uuid;
BEGIN
  INSERT INTO public.agent_traces (
    complaint_id,
    tool_name,
    input_summary,
    output_summary,
    model_used,
    latency_ms
  )
  VALUES (
    p_complaint_id,
    p_tool_name,
    p_input_summary,
    p_output_summary,
    p_model_used,
    p_latency_ms
  )
  RETURNING id INTO v_trace_id;
  RETURN v_trace_id;
END;
$$;
