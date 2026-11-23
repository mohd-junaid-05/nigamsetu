import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ComplaintTraceResponse = {
  success: boolean;
  complaintId: string;
  trace?: {
    id: string;
    tool_name: string;
    model_used: string;
    latency_ms: number;
    created_at: string;
    input_summary: Record<string, unknown>;
    output_summary: Record<string, unknown>;
  } | null;
  allTraces?: Array<{
    id: string;
    tool_name: string;
    model_used: string;
    latency_ms: number;
    created_at: string;
    output_summary: Record<string, unknown>;
  }>;
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

    const supabase = await createServerSupabaseClient();

    // 1. Fetch latest verification trace using the SECURITY DEFINER RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_complaint_verification_trace',
      { p_complaint_id: complaintId }
    );

    let latestTrace: any = null;
    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      latestTrace = rpcData[0];
    } else {
      // Fallback query directly from agent_traces
      const { data: directData } = await supabase
        .from('agent_traces')
        .select('id, complaint_id, tool_name, input_summary, output_summary, model_used, latency_ms, created_at')
        .eq('complaint_id', complaintId)
        .in('tool_name', ['verifyResolution', 'verify_resolution'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      latestTrace = directData || null;
    }

    // 2. Also retrieve all trace history for this complaint
    const { data: allTracesData } = await supabase
      .from('agent_traces')
      .select('id, tool_name, model_used, latency_ms, created_at, output_summary')
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: false });

    return Response.json({
      success: true,
      complaintId,
      trace: latestTrace,
      allTraces: (allTracesData as any[]) || [],
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
