import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CivicAgent, ScoreSeverityOutput } from '@/lib/agent/CivicAgent';
import { z } from 'zod';

export type SeverityPostResponse = {
  success: boolean;
  complaintId?: string;
  severity?: 1 | 2 | 3 | 4;
  reason?: string;
  fallback?: boolean;
  latencyMs?: number;
  error?: string;
};

export type SeverityGetResponse = {
  success: boolean;
  complaintId?: string;
  severity?: number;
  status?: string;
  reason?: string | null;
  fallback?: boolean;
  analyzed?: boolean;
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
          error: 'Unauthorized: You must be signed in to request severity scoring',
        } satisfies SeverityPostResponse,
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
        } satisfies SeverityPostResponse,
        { status: 400 }
      );
    }

    const { complaintId } = parsedBody.data;
    const supabase = await createServerSupabaseClient();

    // 1. Fetch complaint server-side (Constraint: client sends ID, server gets image from storage)
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('id, reporter_id, ward_id, category, severity, status, description, image_url')
      .eq('id', complaintId)
      .single();

    if (fetchError || !complaint) {
      return Response.json(
        {
          success: false,
          error: `Complaint not found: ${fetchError?.message || 'No record matching ID'}`,
        } satisfies SeverityPostResponse,
        { status: 404 }
      );
    }

    // 2. Initialize CivicAgent with server-side API key and supabase client
    const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);

    // 3. Execute scoreSeverity tool
    const result: ScoreSeverityOutput = await agent.run(
      'scoreSeverity',
      {
        complaintId: complaint.id,
        imageUrl: complaint.image_url,
        category: complaint.category,
        description: complaint.description || undefined,
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
      severity: result.severity,
      reason: result.reason,
      fallback: result.fallback,
      latencyMs: result.latencyMs,
    } satisfies SeverityPostResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        error: error.message || 'Internal server error while evaluating severity',
      } satisfies SeverityPostResponse,
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
          error: 'Unauthorized: You must be signed in to check severity status',
        } satisfies SeverityGetResponse,
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
        } satisfies SeverityGetResponse,
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 1. Fetch current complaint state
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select('id, severity, status')
      .eq('id', complaintId)
      .single();

    if (complaintError || !complaint) {
      return Response.json(
        {
          success: false,
          error: 'Complaint not found',
        } satisfies SeverityGetResponse,
        { status: 404 }
      );
    }

    // 2. Fetch latest trace for this complaint from agent_traces
    const { data: trace } = await supabase
      .from('agent_traces')
      .select('output_summary, latency_ms, created_at')
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const outputSummary = (trace?.output_summary as Record<string, unknown>) || null;
    const reason = (outputSummary?.reason as string) || null;
    const fallback = Boolean(outputSummary?.fallback);

    return Response.json({
      success: true,
      complaintId: complaint.id,
      severity: complaint.severity,
      status: complaint.status,
      reason,
      fallback,
      analyzed: !!trace,
      latencyMs: trace?.latency_ms ?? null,
    } satisfies SeverityGetResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve severity status',
      } satisfies SeverityGetResponse,
      { status: 500 }
    );
  }
}
