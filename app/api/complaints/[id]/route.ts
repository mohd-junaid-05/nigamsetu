import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { ComplaintStatus } from '@/lib/types/database';

export type SingleComplaintResponse = {
  success: boolean;
  complaint?: Record<string, unknown>;
  timeline?: Array<{
    id: string;
    action: string;
    performed_by: string | null;
    facility_id: string | null;
    notes: string | null;
    created_at: string;
  }>;
  error?: string;
};

export type PatchComplaintResponse = {
  success: boolean;
  complaintId?: string;
  status?: string;
  error?: string;
};

const patchComplaintSchema = z.object({
  status: z.enum([
    'open',
    'assigned',
    'in_progress',
    'resolved',
    'verified',
    'escalated',
    'rejected',
  ] as [ComplaintStatus, ...ComplaintStatus[]]),
  notes: z.string().optional(),
});

/**
 * GET /api/complaints/[id]
 * Fetch single complaint with timeline activity logs
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const params = await props.params;
    const complaintId = params.id;

    if (!complaintId) {
      return Response.json(
        { success: false, error: 'Complaint ID is required' } satisfies SingleComplaintResponse,
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        *,
        wards (id, name, city),
        facilities (id, name, type, contact_phone)
      `)
      .eq('id', complaintId)
      .single();

    if (complaintError || !complaint) {
      return Response.json(
        { success: false, error: 'Complaint not found' } satisfies SingleComplaintResponse,
        { status: 404 }
      );
    }

    // Fetch timeline activity logs
    const { data: timeline } = await supabase
      .from('complaint_activity_logs')
      .select('id, action, performed_by, facility_id, notes, created_at')
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: true });

    return Response.json({
      success: true,
      complaint: complaint as Record<string, unknown>,
      timeline: timeline || [],
    } satisfies SingleComplaintResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      { success: false, error: error.message || 'Internal error' } satisfies SingleComplaintResponse,
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/complaints/[id]
 * Transition complaint status (e.g., mark in_progress)
 */
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const params = await props.params;
    const complaintId = params.id;

    if (!complaintId) {
      return Response.json(
        { success: false, error: 'Complaint ID is required' } satisfies PatchComplaintResponse,
        { status: 400 }
      );
    }

    const { userId: clerkUserId, sessionClaims } = await auth();
    const headerUserId = req.headers.get('x-user-id');
    const headerRole = req.headers.get('x-user-role');
    const effectiveUserId = clerkUserId || headerUserId;

    if (!effectiveUserId) {
      return Response.json(
        { success: false, error: 'Unauthorized: Authentication required' } satisfies PatchComplaintResponse,
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = patchComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        } satisfies PatchComplaintResponse,
        { status: 400 }
      );
    }

    const { status: targetStatus, notes } = parsed.data;
    const supabase = await createServerSupabaseClient();

    // If moving to in_progress, call mark_complaint_in_progress RPC
    if (targetStatus === 'in_progress') {
      const { data: marked, error: markError } = await supabase.rpc(
        'mark_complaint_in_progress',
        {
          p_complaint_id: complaintId,
          p_user_id: effectiveUserId,
          p_notes: notes || 'Work started by facility team',
        }
      );

      if (markError || !marked) {
        // Fallback direct update
        const { error: directError } = await supabase
          .from('complaints')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', complaintId);

        if (directError) {
          return Response.json(
            { success: false, error: directError.message } satisfies PatchComplaintResponse,
            { status: 500 }
          );
        }
      }

      return Response.json({
        success: true,
        complaintId,
        status: 'in_progress',
      } satisfies PatchComplaintResponse);
    }

    // Other status updates
    const { error: updateError } = await supabase
      .from('complaints')
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', complaintId);

    if (updateError) {
      return Response.json(
        { success: false, error: updateError.message } satisfies PatchComplaintResponse,
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      complaintId,
      status: targetStatus,
    } satisfies PatchComplaintResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      { success: false, error: error.message || 'Internal error' } satisfies PatchComplaintResponse,
      { status: 500 }
    );
  }
}
