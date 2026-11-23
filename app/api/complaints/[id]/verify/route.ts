import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const verifyActionSchema = z.object({
  action: z.enum(['verify', 'reject', 'flag']),
  notes: z.string().optional(),
});

export type OfficialVerifyResponse = {
  success: boolean;
  complaintId?: string;
  status?: string;
  verification_status?: string;
  action?: string;
  message?: string;
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
        { success: false, error: 'Complaint ID is required' } satisfies OfficialVerifyResponse,
        { status: 400 }
      );
    }

    // 1. Auth & role check
    const { userId, sessionClaims } = await auth();
    const claims = sessionClaims as Record<string, unknown> | null;
    const userRole =
      (claims?.role as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.role as string) ||
      'citizen';

    const isAuthorized = userRole === 'official' || userRole === 'admin';
    if (!isAuthorized) {
      return Response.json(
        {
          success: false,
          error: 'Unauthorized: Only municipal officials or administrators can manually verify resolutions.',
        } satisfies OfficialVerifyResponse,
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const parseResult = verifyActionSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        {
          success: false,
          error: parseResult.error.issues.map((e: { message: string }) => e.message).join(', '),
        } satisfies OfficialVerifyResponse,
        { status: 400 }
      );
    }

    const { action, notes } = parseResult.data;
    const supabase = await createServerSupabaseClient();

    // 3. Fetch complaint to verify status
    const { data: complaint, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, status, verification_score, verification_status')
      .eq('id', complaintId)
      .single();

    if (fetchErr || !complaint) {
      return Response.json(
        { success: false, error: 'Complaint not found' } satisfies OfficialVerifyResponse,
        { status: 404 }
      );
    }

    // Map action to status and verification_status
    let newStatus = complaint.status;
    let newVerificationStatus = complaint.verification_status;
    let message = '';

    if (action === 'verify') {
      // "Verify & Close"
      newStatus = 'verified';
      newVerificationStatus = 'passed';
      message = 'Resolution verified and closed by municipal official';
    } else if (action === 'reject') {
      // "Reject & Reopen"
      newStatus = 'in_progress';
      newVerificationStatus = 'failed';
      message = 'Resolution rejected and reopened for rework by municipal official';
    } else if (action === 'flag') {
      // "Flag for Review"
      newStatus = 'resolved';
      newVerificationStatus = 'pending';
      message = 'Resolution flagged for manual inspection/review';
    }

    const actionNotes = notes ? `${message}: ${notes}` : message;

    // Apply update via RPC or direct update
    const { error: rpcErr } = await supabase.rpc('apply_verification_result', {
      p_complaint_id: complaintId,
      p_status: newStatus,
      p_verification_score: complaint.verification_score ?? (action === 'verify' ? 1.0 : 0.0),
      p_verification_status: newVerificationStatus ?? 'pending',
      p_reason: actionNotes,
      p_performed_by: userId || 'official',
    });

    if (rpcErr) {
      await supabase
        .from('complaints')
        .update({
          status: newStatus as any,
          verification_status: newVerificationStatus as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaintId);

      await supabase.from('complaint_activity_logs').insert({
        complaint_id: complaintId,
        action: action === 'verify' ? 'verified' : action === 'reject' ? 'reopened' : 'flagged_for_review',
        performed_by: userId || 'official',
        notes: actionNotes,
      });
    }

    return Response.json({
      success: true,
      complaintId,
      status: newStatus,
      verification_status: newVerificationStatus || 'pending',
      action,
      message,
    } satisfies OfficialVerifyResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        error: error.message || 'Internal server error while applying verification action',
      } satisfies OfficialVerifyResponse,
      { status: 500 }
    );
  }
}
