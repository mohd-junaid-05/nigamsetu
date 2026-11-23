// =====================================================================
// Route: PATCH /api/escalations/[id]
// Updates escalation letter status (draft / submitted / acknowledged / resolved)
// =====================================================================

import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EscalationStatus } from '@/lib/types/database';
import { z } from 'zod';

const updateEscalationSchema = z.object({
  status: z.enum(['draft', 'submitted', 'acknowledged', 'resolved']),
  notes: z.string().optional(),
});

export type UpdateEscalationResponse = {
  success: boolean;
  status?: EscalationStatus;
  error?: string;
};

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const params = await props.params;
    const escalationId = params.id;

    if (!escalationId) {
      return Response.json(
        { success: false, error: 'Escalation ID is required' } satisfies UpdateEscalationResponse,
        { status: 400 }
      );
    }

    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized' } satisfies UpdateEscalationResponse,
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = updateEscalationSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { success: false, error: 'Invalid status. Must be draft, submitted, acknowledged, or resolved.' } satisfies UpdateEscalationResponse,
        { status: 400 }
      );
    }

    const { status, notes } = parseResult.data;
    const supabase = await createServerSupabaseClient();

    // Call RPC update_escalation_status
    const { data: updated, error } = await supabase.rpc('update_escalation_status', {
      p_escalation_id: escalationId,
      p_status: status,
      p_notes: notes || `Escalation updated to ${status} by user ${userId}`,
    });

    if (error || !updated) {
      return Response.json(
        { success: false, error: error?.message || 'Failed to update escalation status' } satisfies UpdateEscalationResponse,
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      status,
    } satisfies UpdateEscalationResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      { success: false, error: error.message || 'Internal error' } satisfies UpdateEscalationResponse,
      { status: 500 }
    );
  }
}
