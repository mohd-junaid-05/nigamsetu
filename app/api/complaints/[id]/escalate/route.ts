// =====================================================================
// Route: POST /api/complaints/[id]/escalate
// Generates a formal escalation letter (RTI or Commissioner appeal)
// =====================================================================

import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CivicAgent, GenerateEscalationOutput } from '@/lib/agent/CivicAgent';
import { z } from 'zod';

const escalateRequestSchema = z.object({
  trigger: z.enum(['sla_breach', 'verification_failed', 'ghost_closure', 'manual']).optional(),
  authority: z.enum(['municipal_commissioner', 'ward_officer', 'rti']).optional(),
  notes: z.string().optional(),
});

export type EscalateComplaintResponse = {
  success: boolean;
  complaintId?: string;
  escalation?: GenerateEscalationOutput;
  error?: string;
};

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const params = await props.params;
    const complaintId = params.id;

    if (!complaintId) {
      return Response.json(
        { success: false, error: 'Complaint ID is required' } satisfies EscalateComplaintResponse,
        { status: 400 }
      );
    }

    // 1. Authenticate user
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized: You must be signed in to escalate a complaint' } satisfies EscalateComplaintResponse,
        { status: 401 }
      );
    }

    const claims = sessionClaims as Record<string, unknown> | null;
    const userRole =
      (claims?.role as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.role as string) ||
      'citizen';

    const supabase = await createServerSupabaseClient();

    // 2. Fetch complaint to verify existence and check authorization
    const { data: complaint, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, reporter_id, ward_id, status, severity, category, sla_deadline, verification_status')
      .eq('id', complaintId)
      .maybeSingle();

    if (fetchErr || !complaint) {
      return Response.json(
        { success: false, error: 'Complaint not found' } satisfies EscalateComplaintResponse,
        { status: 404 }
      );
    }

    // 3. Authorization: officials, admins, or the original citizen reporter can trigger
    const isReporter = complaint.reporter_id === userId;
    const isOfficialOrAdmin = userRole === 'official' || userRole === 'admin';

    if (!isReporter && !isOfficialOrAdmin) {
      return Response.json(
        { success: false, error: 'Forbidden: You do not have permission to escalate this complaint' } satisfies EscalateComplaintResponse,
        { status: 403 }
      );
    }

    // 4. Parse request body
    const body = await req.json().catch(() => ({}));
    const parseResult = escalateRequestSchema.safeParse(body);
    const parsedData = parseResult.success ? parseResult.data : {};

    // 5. Determine default trigger reason if not specified
    let trigger: 'sla_breach' | 'verification_failed' | 'ghost_closure' | 'manual' =
      parsedData.trigger || 'manual';

    if (!parsedData.trigger) {
      if (complaint.verification_status === 'failed') {
        trigger = 'verification_failed';
      } else if (complaint.sla_deadline && new Date(complaint.sla_deadline) < new Date()) {
        trigger = 'sla_breach';
      }
    }

    // 6. Invoke CivicAgent generateEscalation tool
    const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);
    const output = await agent.run<any, GenerateEscalationOutput>(
      'generateEscalation',
      {
        complaintId: complaint.id,
        trigger,
        manualAuthority: parsedData.authority,
        notes: parsedData.notes || `Escalation requested by ${userRole} (${userId})`,
      },
      {
        supabase,
        complaintId: complaint.id,
        wardId: complaint.ward_id || undefined,
        userRole,
      }
    );

    return Response.json({
      success: true,
      complaintId: complaint.id,
      escalation: output,
    } satisfies EscalateComplaintResponse);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[API /complaints/[id]/escalate] Error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to generate escalation letter',
      } satisfies EscalateComplaintResponse,
      { status: 500 }
    );
  }
}
