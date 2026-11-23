import { createServerSupabaseClient } from '@/lib/supabase/server';

export type AgentTraceItem = {
  id: string;
  complaint_id: string | null;
  tool_name: string;
  model_used: string;
  latency_ms: number;
  created_at: string;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
};

export type ComplaintTraceResponse = {
  success: boolean;
  complaintId: string;
  trace?: AgentTraceItem | null;
  allTraces?: AgentTraceItem[];
  error?: string;
};

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const params = await props.params;
    const complaintId = params.id;

    if (!complaintId) {
      return Response.json(
        { success: false, complaintId: '', error: 'Complaint ID is required' } satisfies ComplaintTraceResponse,
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedTool = searchParams.get('tool');

    const supabase = await createServerSupabaseClient();

    // 1. Fetch all traces recorded for this complaint, strictly governed by RLS
    // Citizens will ONLY receive rows if they are the reporter of this complaint.
    const { data: allTracesData, error: traceError } = await supabase
      .from('agent_traces')
      .select('id, complaint_id, tool_name, input_summary, output_summary, model_used, latency_ms, created_at')
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: false });

    if (traceError) {
      console.warn('[ComplaintTraceRoute] Error fetching traces:', traceError);
    }

    const allTraces: AgentTraceItem[] = (allTracesData as AgentTraceItem[]) || [];

    // 2. Select primary target trace:
    let primaryTrace: AgentTraceItem | null = null;

    if (requestedTool) {
      // Find matching tool trace
      const match = allTraces.find(
        (t) =>
          t.tool_name === requestedTool ||
          (requestedTool === 'scoreSeverity' && t.tool_name === 'severity_score') ||
          (requestedTool === 'verifyResolution' && t.tool_name === 'verify_resolution') ||
          (requestedTool === 'checkDuplicate' && t.tool_name === 'duplicate_check') ||
          (requestedTool === 'generateEscalation' && t.tool_name === 'generate_escalation') ||
          (requestedTool === 'answerChat' && t.tool_name === 'chat_answer')
      );
      primaryTrace = match || null;
    }

    // Default to verification trace if available, else latest trace
    if (!primaryTrace && allTraces.length > 0) {
      const verificationMatch = allTraces.find((t) =>
        ['verifyResolution', 'verify_resolution'].includes(t.tool_name)
      );
      primaryTrace = verificationMatch || allTraces[0];
    }

    // Fallback: If verification trace was requested or default, check RPC if not returned by direct query
    if (!primaryTrace && (!requestedTool || ['verifyResolution', 'verify_resolution'].includes(requestedTool))) {
      try {
        const { data: rpcData } = await supabase.rpc('get_complaint_verification_trace', {
          p_complaint_id: complaintId,
        });
        if (Array.isArray(rpcData) && rpcData.length > 0) {
          primaryTrace = rpcData[0] as AgentTraceItem;
          if (!allTraces.some((t) => t.id === primaryTrace?.id)) {
            allTraces.unshift(primaryTrace);
          }
        }
      } catch {
        // Ignore RPC error
      }
    }

    return Response.json({
      success: true,
      complaintId,
      trace: primaryTrace,
      allTraces,
    } satisfies ComplaintTraceResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        complaintId: '',
        error: error.message || 'Internal server error while fetching trace',
      } satisfies ComplaintTraceResponse,
      { status: 500 }
    );
  }
}
