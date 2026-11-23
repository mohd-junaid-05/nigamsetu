import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/auth/session';
import { AgentTraceItem } from '@/components/dashboard/AgentTraceModal';

export type AdminTracesResponse = {
  success: boolean;
  traces: AgentTraceItem[];
  totalCount: number;
  availableTools: string[];
  availableModels: string[];
  error?: string;
};

const STANDARD_TOOLS = [
  'scoreSeverity',
  'checkDuplicate',
  'verifyResolution',
  'generateEscalation',
  'answerChat',
];

export async function GET(req: Request): Promise<Response> {
  try {
    const session = await getServerSession();

    // Only officials and admins can access the admin audit traces view
    if (!session.isAuthenticated || (session.role !== 'admin' && session.role !== 'official')) {
      return Response.json(
        {
          success: false,
          traces: [],
          totalCount: 0,
          availableTools: STANDARD_TOOLS,
          availableModels: [],
          error: 'Unauthorized: Admin or Official role required to view agent traces.',
        } satisfies AdminTracesResponse,
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tool = searchParams.get('tool') || null;
    const complaintId = searchParams.get('complaintId') || null;
    const model = searchParams.get('model') || null;
    const fromDate = searchParams.get('fromDate') || null;
    const toDate = searchParams.get('toDate') || null;
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const supabase = await createServerSupabaseClient();

    // 1. Fetch filtered traces via secure RPC
    const { data: rpcRows, error: rpcError } = await supabase.rpc('get_filtered_agent_traces', {
      p_tool_name: tool === 'all' ? null : tool,
      p_complaint_id: complaintId,
      p_model_used: model === 'all' ? null : model,
      p_from_date: fromDate,
      p_to_date: toDate,
      p_limit: limit,
      p_offset: offset,
    });

    let traces: AgentTraceItem[] = [];
    let totalCount = 0;

    if (!rpcError && Array.isArray(rpcRows)) {
      traces = rpcRows as AgentTraceItem[];
      totalCount = rpcRows.length > 0 ? Number((rpcRows[0] as any).total_count || rpcRows.length) : 0;
    } else {
      // Direct table query fallback respecting RLS
      let qb = supabase
        .from('agent_traces')
        .select('id, complaint_id, tool_name, input_summary, output_summary, model_used, latency_ms, created_at', {
          count: 'exact',
        });

      if (tool && tool !== 'all') {
        if (tool === 'verifyResolution') {
          qb = qb.in('tool_name', ['verifyResolution', 'verify_resolution']);
        } else if (tool === 'scoreSeverity') {
          qb = qb.in('tool_name', ['scoreSeverity', 'severity_score']);
        } else if (tool === 'checkDuplicate') {
          qb = qb.in('tool_name', ['checkDuplicate', 'duplicate_check']);
        } else if (tool === 'generateEscalation') {
          qb = qb.in('tool_name', ['generateEscalation', 'generate_escalation']);
        } else if (tool === 'answerChat') {
          qb = qb.in('tool_name', ['answerChat', 'chat_answer']);
        } else {
          qb = qb.eq('tool_name', tool);
        }
      }

      if (complaintId) {
        qb = qb.eq('complaint_id', complaintId);
      }

      if (model && model !== 'all') {
        qb = qb.ilike('model_used', `%${model}%`);
      }

      if (fromDate) {
        qb = qb.gte('created_at', fromDate);
      }

      if (toDate) {
        qb = qb.lte('created_at', toDate);
      }

      const { data: directData, count: directCount, error: directErr } = await qb
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (directErr) {
        console.warn('[AdminTracesRoute] Fallback direct query error:', directErr);
      }

      traces = (directData as AgentTraceItem[]) || [];
      totalCount = directCount ?? traces.length;
    }

    // 2. Fetch distinct models available for filter options
    const availableModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.5-pro',
      'gemini-3.5-flash',
      'algorithm:phash+dbscan',
      'algorithm:geospatial-reject',
      'algorithm:phash-fake-detector',
      'template-fallback',
      'heuristic-filter-engine',
    ];

    return Response.json({
      success: true,
      traces,
      totalCount,
      availableTools: STANDARD_TOOLS,
      availableModels,
    } satisfies AdminTracesResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        traces: [],
        totalCount: 0,
        availableTools: STANDARD_TOOLS,
        availableModels: [],
        error: error.message || 'Internal server error while fetching admin traces',
      } satisfies AdminTracesResponse,
      { status: 500 }
    );
  }
}
