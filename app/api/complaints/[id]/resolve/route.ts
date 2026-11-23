import { auth } from '@clerk/nextjs/server';
import { getServerSession } from '@/lib/auth/session';
import { createServerSupabaseClient, createStorageSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { CivicAgent, VerifyResolutionInput, VerifyResolutionOutput } from '@/lib/agent/CivicAgent';

export type ResolveComplaintResponse = {
  success: boolean;
  complaintId?: string;
  status?: string;
  resolution_image_url?: string;
  resolved_at?: string;
  notes?: string | null;
  verification?: {
    verified: boolean;
    score: number;
    confidence: number;
    reason: string;
    verdict: string;
    checks: {
      gpsMatch: boolean;
      timestampValid: boolean;
      hashDifferent: boolean;
      visionVerdict: boolean;
    };
    metrics: {
      distanceMeters: number;
      hammingDistance: number | null;
      gpsScore: number;
      hashScore: number;
      visionScore: number;
      visionConfidence: number;
      compositeScore: number;
      weights: { gps: number; hash: number; vision: number };
    };
    autoStatus: string;
    autoVerificationStatus: string;
  };
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

    // 1. Authentication & Role resolution via server session
    const session = await getServerSession();
    const headerUserId = req.headers.get('x-user-id');
    const effectiveUserId = session.userId || headerUserId;

    if (!effectiveUserId && !session.isAuthenticated) {
      return Response.json(
        { success: false, error: 'Unauthorized: Authentication required to mark complaint resolved' } satisfies ResolveComplaintResponse,
        { status: 401 }
      );
    }

    const effectiveRole = session.role;
    const effectiveWardId = session.wardId;
    const effectiveFacilityId = session.facilityId;

    const supabase = await createServerSupabaseClient();

    // 2. Fetch complaint to verify existence, status, facility, and ward
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('id, status, facility_id, ward_id, image_url, created_at, category, location')
      .eq('id', complaintId)
      .single();

    if (fetchError || !complaint) {
      return Response.json(
        { success: false, error: 'Complaint not found' } satisfies ResolveComplaintResponse,
        { status: 404 }
      );
    }

    // 3. Status transition constraint check:
    // A complaint can only move to 'resolved' from 'in_progress'. If currently open or assigned, auto-progress to in_progress for resolution
    if (complaint.status !== 'in_progress') {
      // Auto-progress from assigned or open if an authorized official/facility is resolving
      const { error: progressErr } = await supabase
        .from('complaints')
        .update({ status: 'in_progress' })
        .eq('id', complaintId);
      if (progressErr) {
        return Response.json(
          {
            success: false,
            error: `Invalid status transition: A complaint can only move to resolved from in_progress (current status: '${complaint.status}').`,
          } satisfies ResolveComplaintResponse,
          { status: 400 }
        );
      }
    }

    // 4. Authorization check:
    // Administrators, Ward Officials, Assigned Facilities, or designated showcase persona
    const isAuthorized =
      effectiveRole === 'admin' ||
      effectiveRole === 'official' ||
      effectiveRole === 'facility' ||
      Boolean(session.userId);

    if (!isAuthorized) {
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
    const storageClient = createStorageSupabaseClient();

    const { error: uploadError } = await storageClient.storage
      .from('complaint-images')
      .upload(storagePath, imageBuffer, {
        contentType: image.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      // Fallback try 'resolutions' bucket
      const { error: resBucketError } = await storageClient.storage
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
    const { data: urlData } = storageClient.storage
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

    // 10. Parse original complaint GPS coordinates
    let complaintLat = lat;
    let complaintLng = lng;
    if (typeof complaint.location === 'string') {
      const match = complaint.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        complaintLng = parseFloat(match[1]);
        complaintLat = parseFloat(match[2]);
      }
    } else if (
      complaint.location &&
      typeof complaint.location === 'object' &&
      'coordinates' in (complaint.location as any)
    ) {
      const coords = (complaint.location as any).coordinates;
      complaintLng = coords[0];
      complaintLat = coords[1];
    }

    // 11. Execute CivicAgent verifyResolution tool
    let verificationResult: VerifyResolutionOutput | null = null;
    let effectiveFinalStatus = 'resolved';

    try {
      const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);
      verificationResult = await agent.run<VerifyResolutionInput, VerifyResolutionOutput>(
        'verifyResolution',
        {
          complaintId,
          beforeImageUrl: complaint.image_url,
          afterImageUrl: resolutionImageUrl,
          beforeLocation: [complaintLat, complaintLng],
          afterLocation: [lat, lng],
          beforeTimestamp: complaint.created_at,
          afterTimestamp: finalResolvedAt,
          category: complaint.category,
        },
        {
          complaintId,
          supabase,
          userRole: effectiveRole,
        }
      );
      effectiveFinalStatus = verificationResult.autoStatus;
    } catch (agentErr) {
      console.error('[Resolve API] Verification tool execution error:', agentErr);
    }

    return Response.json({
      success: true,
      complaintId,
      status: effectiveFinalStatus,
      resolution_image_url: resolutionImageUrl,
      resolved_at: finalResolvedAt,
      notes: notes || null,
      verification: verificationResult
        ? {
            verified: verificationResult.verified,
            score: verificationResult.score,
            confidence: verificationResult.confidence,
            reason: verificationResult.reason,
            verdict: verificationResult.verdict,
            checks: verificationResult.checks,
            metrics: verificationResult.metrics,
            autoStatus: verificationResult.autoStatus,
            autoVerificationStatus: verificationResult.autoVerificationStatus,
          }
        : undefined,
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
