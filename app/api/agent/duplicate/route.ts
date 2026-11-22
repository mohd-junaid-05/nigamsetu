import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CivicAgent, CheckDuplicateOutput } from '@/lib/agent/CivicAgent';
import { z } from 'zod';

export type DuplicatePostResponse = {
  success: boolean;
  complaintId?: string;
  isDuplicate?: boolean;
  matchedComplaintId?: string;
  matchedClusterId?: string;
  clusterCount?: number;
  method?: 'geospatial' | 'hash' | 'vision';
  confidence?: number;
  hammingDistance?: number;
  reason?: string;
  latencyMs?: number;
  error?: string;
};

export type DuplicateGetResponse = {
  success: boolean;
  complaintId?: string;
  clusterId?: string | null;
  clusterCount?: number;
  isDuplicate?: boolean;
  method?: string | null;
  confidence?: number | null;
  hammingDistance?: number | null;
  reason?: string | null;
  checked?: boolean;
  latencyMs?: number | null;
  error?: string;
};

const postBodySchema = z.object({
  complaintId: z.string().uuid('Invalid complaint ID format'),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json(
        {
          success: false,
          error: 'Unauthorized: You must be signed in to request duplicate clustering check',
        } satisfies DuplicatePostResponse,
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsedBody = postBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return Response.json(
        {
          success: false,
          error: `Invalid request payload: ${parsedBody.error.issues.map((i) => i.message).join(', ')}`,
        } satisfies DuplicatePostResponse,
        { status: 400 }
      );
    }

    const { complaintId } = parsedBody.data;
    const supabase = await createServerSupabaseClient();

    // 1. Fetch complaint server-side with coordinates
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('id, reporter_id, ward_id, category, severity, status, description, image_url, cluster_id, location, created_at')
      .eq('id', complaintId)
      .single();

    if (fetchError || !complaint) {
      return Response.json(
        {
          success: false,
          error: `Complaint not found: ${fetchError?.message || 'No record matching ID'}`,
        } satisfies DuplicatePostResponse,
        { status: 404 }
      );
    }

    // Parse lat/lng from location geometry string (e.g., 'POINT(77.65 12.935)' or GeoJSON)
    let lat = 12.935;
    let lng = 77.65;
    if (typeof complaint.location === 'string') {
      const match = complaint.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    } else if (
      complaint.location &&
      typeof complaint.location === 'object' &&
      'coordinates' in (complaint.location as any)
    ) {
      const coords = (complaint.location as any).coordinates;
      lng = coords[0];
      lat = coords[1];
    }

    // 2. Initialize CivicAgent with server-side API key and supabase client
    const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);

    // 3. Execute checkDuplicate tool
    const result: CheckDuplicateOutput = await agent.run(
      'checkDuplicate',
      {
        complaintId: complaint.id,
        location: [lat, lng],
        category: complaint.category,
        imageUrl: complaint.image_url,
        createdAt: complaint.created_at,
      },
      {
        complaintId: complaint.id,
        wardId: complaint.ward_id || undefined,
        supabase,
      }
    );

    return Response.json({
      success: true,
      complaintId: complaint.id,
      isDuplicate: result.isDuplicate,
      matchedComplaintId: result.matchedComplaintId,
      matchedClusterId: result.matchedClusterId,
      clusterCount: result.clusterCount,
      method: result.method,
      confidence: result.confidence,
      hammingDistance: result.hammingDistance,
      reason: result.reason,
      latencyMs: result.latencyMs,
    } satisfies DuplicatePostResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        error: error.message || 'Internal server error while evaluating duplicate clustering',
      } satisfies DuplicatePostResponse,
      { status: 500 }
    );
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json(
        {
          success: false,
          error: 'Unauthorized: You must be signed in to check duplicate status',
        } satisfies DuplicateGetResponse,
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get('complaintId');

    if (!complaintId) {
      return Response.json(
        {
          success: false,
          error: 'Missing required query parameter: complaintId',
        } satisfies DuplicateGetResponse,
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 1. Fetch current complaint state and cluster count
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        id,
        cluster_id,
        complaint_clusters (
          id,
          complaint_count,
          representative_id
        )
      `)
      .eq('id', complaintId)
      .single();

    if (complaintError || !complaint) {
      return Response.json(
        {
          success: false,
          error: 'Complaint not found',
        } satisfies DuplicateGetResponse,
        { status: 404 }
      );
    }

    // 2. Fetch latest trace for this complaint from agent_traces
    const { data: trace } = await supabase
      .from('agent_traces')
      .select('output_summary, latency_ms, created_at')
      .eq('complaint_id', complaintId)
      .in('tool_name', ['checkDuplicate', 'duplicate_check'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const outputSummary = (trace?.output_summary as Record<string, unknown>) || null;
    const isDuplicate = Boolean(outputSummary?.isDuplicate);
    const method = (outputSummary?.method as string) || null;
    const confidence = typeof outputSummary?.confidence === 'number' ? outputSummary.confidence : null;
    const hammingDistance = typeof outputSummary?.hammingDistance === 'number' ? outputSummary.hammingDistance : null;
    const reason = (outputSummary?.reason as string) || null;

    const clusterData = complaint.complaint_clusters as any;
    const clusterCount = clusterData?.complaint_count ?? (outputSummary?.clusterCount as number) ?? 1;

    return Response.json({
      success: true,
      complaintId: complaint.id,
      clusterId: complaint.cluster_id,
      clusterCount,
      isDuplicate,
      method,
      confidence,
      hammingDistance,
      reason,
      checked: !!trace,
      latencyMs: trace?.latency_ms ?? null,
    } satisfies DuplicateGetResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve duplicate status',
      } satisfies DuplicateGetResponse,
      { status: 500 }
    );
  }
}
