import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

export type AssignComplaintResponse = {
  success: boolean;
  complaintId?: string;
  facilityId?: string;
  facilityName?: string;
  status?: string;
  error?: string;
};

const assignBodySchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const params = await props.params;
    const complaintId = params.id;

    if (!complaintId) {
      return Response.json(
        { success: false, error: 'Complaint ID is required' } satisfies AssignComplaintResponse,
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = assignBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        } satisfies AssignComplaintResponse,
        { status: 400 }
      );
    }

    const { facilityId } = parsed.data;
    const supabase = await createServerSupabaseClient();

    // Verify facility exists
    const { data: facility, error: facError } = await supabase
      .from('facilities')
      .select('id, name, type, ward_id')
      .eq('id', facilityId)
      .single();

    if (facError || !facility) {
      return Response.json(
        { success: false, error: 'Target facility not found' } satisfies AssignComplaintResponse,
        { status: 404 }
      );
    }

    // Atomically assign facility and set status to 'assigned' via secure RPC
    const { data: updated, error: rpcError } = await supabase.rpc(
      'assign_complaint_to_facility',
      {
        p_complaint_id: complaintId,
        p_facility_id: facilityId,
      }
    );

    if (rpcError || !updated) {
      // Fallback direct table update
      const { error: directError } = await supabase
        .from('complaints')
        .update({
          facility_id: facilityId,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaintId);

      if (directError) {
        return Response.json(
          {
            success: false,
            error: `Failed to assign complaint: ${directError.message}`,
          } satisfies AssignComplaintResponse,
          { status: 500 }
        );
      }
    }

    return Response.json({
      success: true,
      complaintId,
      facilityId,
      facilityName: facility.name,
      status: 'assigned',
    } satisfies AssignComplaintResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        error: error.message || 'Internal server error while assigning complaint',
      } satisfies AssignComplaintResponse,
      { status: 500 }
    );
  }
}
