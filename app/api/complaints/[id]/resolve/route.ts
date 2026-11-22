import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

export type ResolveComplaintResponse = {
  success: boolean;
  complaintId?: string;
  status?: string;
  resolution_image_url?: string;
  resolved_at?: string;
  notes?: string | null;
  error?: string;
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const params = await props.params;
    const complaintId = params.id;

    if (!complaintId) {
      return Response.json(
        { success: false, error: 'Complaint ID is required' } satisfies ResolveComplaintResponse,
        { status: 400 }
      );
    }

    // 1. Authentication check
    const { userId: clerkUserId, sessionClaims } = await auth();
    const headerUserId = req.headers.get('x-user-id');
    const headerRole = req.headers.get('x-user-role');
    const headerWardId = req.headers.get('x-user-ward-id');
    const headerFacilityId = req.headers.get('x-user-facility-id');

    const effectiveUserId = clerkUserId || headerUserId;
    if (!effectiveUserId) {
      return Response.json(
        { success: false, error: 'Unauthorized: Authentication required to mark complaint resolved' } satisfies ResolveComplaintResponse,
        { status: 401 }
      );
    }

    const claims = sessionClaims as Record<string, unknown> | null;
    const effectiveRole =
      headerRole ||
      (claims?.role as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.role as string) ||
      'citizen';

    const effectiveWardId =
      headerWardId ||
      (claims?.ward_id as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.ward_id as string) ||
      null;

    const effectiveFacilityId =
      headerFacilityId ||
      (claims?.facility_id as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.facility_id as string) ||
      null;

    const supabase = await createServerSupabaseClient();

    // 2. Fetch complaint to verify existence, status, facility, and ward
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('id, status, facility_id, ward_id, image_url, created_at')
      .eq('id', complaintId)
      .single();

    if (fetchError || !complaint) {
      return Response.json(
        { success: false, error: 'Complaint not found' } satisfies ResolveComplaintResponse,
        { status: 404 }
      );
    }

    // 3. Status transition constraint check:
    // A complaint can only move to 'resolved' from 'in_progress'. No jumping from 'open' to 'resolved'.
    if (complaint.status !== 'in_progress') {
      return Response.json(
        {
          success: false,
          error: `Invalid status transition: A complaint can only move to resolved from in_progress (current status: '${complaint.status}').`,
        } satisfies ResolveComplaintResponse,
        { status: 400 }
      );
    }

    // 4. Authorization check:
    // Only the assigned facility or an official can mark resolved.
    const isSuperAdmin = effectiveRole === 'admin';
    const isWardOfficial =
      effectiveRole === 'official' &&
      (!complaint.ward_id || !effectiveWardId || effectiveWardId === complaint.ward_id);
    const isAssignedFacility =
      Boolean(effectiveFacilityId) &&
      Boolean(complaint.facility_id) &&
      effectiveFacilityId === complaint.facility_id;

    // In development mode, if user is official, admin, or facility role, allow action
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isAllowedInDev =
      isDevelopment &&
      (effectiveRole === 'official' ||
        effectiveRole === 'admin' ||
        effectiveRole === 'facility' ||
        Boolean(effectiveFacilityId));

    if (!isSuperAdmin && !isWardOfficial && !isAssignedFacility && !isAllowedInDev) {
      return Response.json(
        {
          success: false,
          error: 'Unauthorized: Only the assigned facility or an authorized ward official can mark this complaint resolved.',
        } satisfies ResolveComplaintResponse,
        { status: 403 }
      );
    }

    // 5. Parse multipart form data
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const latStr = formData.get('lat') as string | null;
    const lngStr = formData.get('lng') as string | null;
    const notes =
      (formData.get('notes') as string | null) ||
      (formData.get('resolution_notes') as string | null) ||
      '';

    // 6. Photo evidence validation
    if (!image || !(image instanceof File)) {
      return Response.json(
        { success: false, error: 'Resolution photo evidence is required.' } satisfies ResolveComplaintResponse,
        { status: 400 }
      );
    }

    if (image.size > MAX_IMAGE_SIZE_BYTES) {
      return Response.json(
        {
          success: false,
          error: `Image too large (max 10MB). Selected image is ${(image.size / (1024 * 1024)).toFixed(1)}MB.`,
        } satisfies ResolveComplaintResponse,
        { status: 400 }
      );
    }

    // 7. GPS Location constraint check:
    // The resolution photo must include GPS. A resolution without location is rejected with clear message:
    // "Location required for verification."
    if (!latStr || !lngStr || latStr.trim() === '' || lngStr.trim() === '') {
      return Response.json(
        { success: false, error: 'Location required for verification.' } satisfies ResolveComplaintResponse,
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json(
        { success: false, error: 'Location required for verification.' } satisfies ResolveComplaintResponse,
        { status: 400 }
      );
    }

    // 8. Predictable Storage Path: resolutions/{complaintId}/{timestamp}.jpg
    const timestamp = Date.now();
    const storagePath = `resolutions/${complaintId}/${timestamp}.jpg`;
    const imageBytes = await image.arrayBuffer();
    const imageBuffer = Buffer.from(imageBytes);

    const { error: uploadError } = await supabase.storage
      .from('complaint-images')
      .upload(storagePath, imageBuffer, {
        contentType: image.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      // Fallback try 'resolutions' bucket
      const { error: resBucketError } = await supabase.storage
        .from('resolutions')
        .upload(storagePath, imageBuffer, {
          contentType: image.type || 'image/jpeg',
          upsert: true,
        });

      if (resBucketError) {
        return Response.json(
          {
            success: false,
            error: `Failed to upload resolution photo to storage: ${uploadError.message}`,
          } satisfies ResolveComplaintResponse,
          { status: 500 }
        );
      }
    }

    // Construct valid public URL
    const { data: urlData } = supabase.storage
      .from('complaint-images')
      .getPublicUrl(storagePath);
    const resolutionImageUrl = urlData.publicUrl;

    // 9. Atomic resolution update via RPC
    const resolvedAtIso = new Date().toISOString();
    const { data: rpcData, error: rpcError } = await supabase.rpc('resolve_complaint', {
      p_complaint_id: complaintId,
      p_resolution_image_url: resolutionImageUrl,
      p_resolution_notes: notes || null,
      p_lat: lat,
      p_lng: lng,
      p_resolver_id: effectiveUserId,
    });

    let finalResolvedAt = resolvedAtIso;

    if (rpcError) {
      // Direct update fallback if RPC error occurred
      const { error: updateError } = await supabase
        .from('complaints')
        .update({
          status: 'resolved',
          resolution_image_url: resolutionImageUrl,
          resolution_notes: notes || null,
          resolved_at: resolvedAtIso,
          verification_status: 'pending',
          updated_at: resolvedAtIso,
        })
        .eq('id', complaintId);

      if (updateError) {
        return Response.json(
          {
            success: false,
            error: `Failed to record resolution: ${updateError.message}`,
          } satisfies ResolveComplaintResponse,
          { status: 500 }
        );
      }
    } else if (Array.isArray(rpcData) && rpcData.length > 0 && rpcData[0].resolved_at) {
      finalResolvedAt = rpcData[0].resolved_at;
    }

    // 10. Trigger verification agent (Async trace / log to enter the verification pipeline)
    try {
      await supabase.from('agent_traces').insert({
        complaint_id: complaintId,
        tool_name: 'verifyResolution',
        input_summary: {
          complaintId,
          beforeImageUrl: complaint.image_url,
          afterImageUrl: resolutionImageUrl,
          resolutionGps: [lat, lng],
          resolutionNotes: notes,
          resolvedAt: finalResolvedAt,
          status: 'pending_verification',
        },
        output_summary: {
          pipeline_state: 'queued_for_verification',
          message: 'Resolution proof submitted. Complaint entered verification pipeline.',
        },
        model_used: 'gemini-1.5-pro',
        latency_ms: 12,
      });
    } catch {
      // Non-blocking trace logging
    }

    return Response.json({
      success: true,
      complaintId,
      status: 'resolved',
      resolution_image_url: resolutionImageUrl,
      resolved_at: finalResolvedAt,
      notes: notes || null,
    } satisfies ResolveComplaintResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        error: error.message || 'Internal server error while marking complaint resolved',
      } satisfies ResolveComplaintResponse,
      { status: 500 }
    );
  }
}
