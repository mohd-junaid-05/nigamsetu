import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CivicAgent, VerifyResolutionOutput } from '@/lib/agent/CivicAgent';
import { z } from 'zod';

const verifyRequestBodySchema = z.object({
  complaintId: z.string().min(1, 'complaintId is required'),
  beforeImageUrl: z.string().optional(),
  afterImageUrl: z.string().optional(),
  beforeLocation: z.tuple([z.number(), z.number()]).optional(),
  afterLocation: z.tuple([z.number(), z.number()]).optional(),
  beforeTimestamp: z.string().optional(),
  afterTimestamp: z.string().optional(),
  category: z.string().optional(),
});

export type VerifyAgentResponse = {
  success: boolean;
  complaintId: string;
  verification?: VerifyResolutionOutput;
  error?: string;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = verifyRequestBodySchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        {
          success: false,
          complaintId: body?.complaintId || '',
          error: parseResult.error.issues.map((e: { message: string }) => e.message).join(', '),
        } satisfies VerifyAgentResponse,
        { status: 400 }
      );
    }

    const {
      complaintId,
      beforeImageUrl: bodyBeforeUrl,
      afterImageUrl: bodyAfterUrl,
      beforeLocation: bodyBeforeLoc,
      afterLocation: bodyAfterLoc,
      beforeTimestamp: bodyBeforeTime,
      afterTimestamp: bodyAfterTime,
      category: bodyCategory,
    } = parseResult.data;

    const supabase = await createServerSupabaseClient();
    const { userId, sessionClaims } = await auth();

    // 1. Fetch complaint from database to fill any missing inputs
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('id, category, image_url, resolution_image_url, location, resolution_location, created_at, resolved_at, status')
      .eq('id', complaintId)
      .single();

    if (fetchError || !complaint) {
      return Response.json(
        {
          success: false,
          complaintId,
          error: `Complaint not found: ${fetchError?.message || 'unknown'}`,
        } satisfies VerifyAgentResponse,
        { status: 404 }
      );
    }

    // Parse location coordinates
    let beforeLat = 12.935;
    let beforeLng = 77.65;
    if (bodyBeforeLoc) {
      [beforeLat, beforeLng] = bodyBeforeLoc;
    } else if (typeof complaint.location === 'string') {
      const match = complaint.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        beforeLng = parseFloat(match[1]);
        beforeLat = parseFloat(match[2]);
      }
    } else if (
      complaint.location &&
      typeof complaint.location === 'object' &&
      'coordinates' in (complaint.location as any)
    ) {
      const coords = (complaint.location as any).coordinates;
      beforeLng = coords[0];
      beforeLat = coords[1];
    }

    let afterLat = beforeLat;
    let afterLng = beforeLng;
    if (bodyAfterLoc) {
      [afterLat, afterLng] = bodyAfterLoc;
    } else if (typeof complaint.resolution_location === 'string') {
      const match = (complaint.resolution_location as string).match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        afterLng = parseFloat(match[1]);
        afterLat = parseFloat(match[2]);
      }
    } else if (
      complaint.resolution_location &&
      typeof complaint.resolution_location === 'object' &&
      'coordinates' in (complaint.resolution_location as any)
    ) {
      const coords = (complaint.resolution_location as any).coordinates;
      afterLng = coords[0];
      afterLat = coords[1];
    }

    const beforeImageUrl = bodyBeforeUrl || complaint.image_url;
    const afterImageUrl = bodyAfterUrl || complaint.resolution_image_url;
    const beforeTimestamp = bodyBeforeTime || complaint.created_at;
    const afterTimestamp = bodyAfterTime || complaint.resolved_at || new Date().toISOString();
    const category = bodyCategory || complaint.category;

    if (!afterImageUrl) {
      return Response.json(
        {
          success: false,
          complaintId,
          error: 'Cannot verify resolution: No resolution image has been uploaded for this complaint.',
        } satisfies VerifyAgentResponse,
        { status: 400 }
      );
    }

    // 2. Execute verifyResolution on CivicAgent
    const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);
    const verification = await agent.run<any, VerifyResolutionOutput>(
      'verifyResolution',
      {
        complaintId,
        beforeImageUrl,
        afterImageUrl,
        beforeLocation: [beforeLat, beforeLng],
        afterLocation: [afterLat, afterLng],
        beforeTimestamp,
        afterTimestamp,
        category,
      },
      {
        complaintId,
        supabase,
        userRole: (sessionClaims as any)?.role || 'official',
      }
    );

    return Response.json({
      success: true,
      complaintId,
      verification,
    } satisfies VerifyAgentResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        complaintId: '',
        error: error.message || 'Internal server error during verification tool execution',
      } satisfies VerifyAgentResponse,
      { status: 500 }
    );
  }
}
