// =====================================================================
// Route: POST /api/agent/chat
// Natural language query endpoint for official municipal ward data
// Phase 11: AI Agent Chat Panel
// =====================================================================

import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CivicAgent, AnswerChatOutput } from '@/lib/agent/CivicAgent';

export interface ChatApiRequest {
  query: string;
  wardId?: string;
}

export interface ChatApiResponse extends AnswerChatOutput {
  success: boolean;
  error?: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return Response.json(
        {
          success: false,
          error: 'Unauthorized',
          answer: '',
          dataQuery: '',
          resultCount: 0,
          sources: [],
          modelUsed: '',
          latencyMs: 0,
        } satisfies ChatApiResponse,
        { status: 401 }
      );
    }

    const claims = sessionClaims as Record<string, unknown> | null;
    const userRole =
      (claims?.role as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.role as string) ||
      ((claims?.metadata as Record<string, unknown>)?.role as string) ||
      'citizen';

    const claimWardId =
      (claims?.ward_id as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.ward_id as string) ||
      ((claims?.metadata as Record<string, unknown>)?.ward_id as string) ||
      null;

    const supabase = await createServerSupabaseClient();

    let effectiveRole = userRole;
    let effectiveWardId = claimWardId;

    // Check profiles table if role is citizen or wardId is missing from token claims
    if (!effectiveWardId || userRole === 'citizen') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('ward_id, role')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        if (profile.role) effectiveRole = profile.role;
        if (profile.ward_id) effectiveWardId = profile.ward_id;
      }
    }

    // Official or admin role required
    if (effectiveRole !== 'official' && effectiveRole !== 'admin') {
      return Response.json(
        {
          success: false,
          error: 'Forbidden: Official or Administrator access required.',
          answer: '',
          dataQuery: '',
          resultCount: 0,
          sources: [],
          modelUsed: '',
          latencyMs: 0,
        } satisfies ChatApiResponse,
        { status: 403 }
      );
    }

    const body: ChatApiRequest = await req.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    // Admin can query a specific ward if requested, but official is strictly locked to their ward
    const targetWardId =
      effectiveRole === 'admin' && body.wardId ? body.wardId : effectiveWardId;

    if (!targetWardId) {
      return Response.json(
        {
          success: false,
          error: 'No ward assigned. Contact your administrator.',
          answer: '',
          dataQuery: '',
          resultCount: 0,
          sources: [],
          modelUsed: '',
          latencyMs: 0,
        } satisfies ChatApiResponse,
        { status: 400 }
      );
    }

    if (!query) {
      return Response.json(
        {
          success: false,
          error: 'Query text cannot be empty.',
          answer: '',
          dataQuery: '',
          resultCount: 0,
          sources: [],
          modelUsed: '',
          latencyMs: 0,
        } satisfies ChatApiResponse,
        { status: 400 }
      );
    }

    const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);
    const result: AnswerChatOutput = await agent.run(
      'answerChat',
      {
        query,
        wardId: targetWardId,
        userRole: effectiveRole,
      },
      {
        wardId: targetWardId,
        userRole: effectiveRole,
        supabase,
      }
    );

    return Response.json({
      success: true,
      ...result,
    } satisfies ChatApiResponse);
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[POST /api/agent/chat] Internal Error:', e);
    return Response.json(
      {
        success: false,
        error: e.message || 'Internal Server Error',
        answer: 'An unexpected error occurred while processing your query.',
        dataQuery: '',
        resultCount: 0,
        sources: [],
        modelUsed: '',
        latencyMs: 0,
      } satisfies ChatApiResponse,
      { status: 500 }
    );
  }
}
