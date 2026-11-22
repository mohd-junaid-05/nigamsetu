import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';

const promoteRequestSchema = z.object({
  targetUserId: z.string().min(1, 'targetUserId is required'),
  role: z.enum(['official', 'admin', 'citizen']),
  wardId: z.string().optional(),
});

type PromoteResponse = {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    role: string;
    wardId?: string;
  };
};

/**
 * Admin promotion endpoint.
 * Promotes a user to official/admin and assigns a ward in Clerk publicMetadata.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const { userId, sessionClaims } = await auth();

    // Verify authentication
    if (!userId) {
      return Response.json(
        { success: false, message: 'Unauthorized: Authentication required' } satisfies PromoteResponse,
        { status: 401 }
      );
    }

    // Check caller's role (allow admin, or allow initial bootstrap in development)
    const rawRole =
      (sessionClaims?.role as string) ||
      ((sessionClaims?.public_metadata as Record<string, unknown>)?.role as string);

    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (rawRole !== 'admin' && !isDevelopment) {
      return Response.json(
        { success: false, message: 'Forbidden: Admin privilege required' } satisfies PromoteResponse,
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = promoteRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        {
          success: false,
          message: parseResult.error.issues.map((e) => e.message).join(', '),
        } satisfies PromoteResponse,
        { status: 400 }
      );
    }

    const { targetUserId, role, wardId } = parseResult.data;

    // Update user publicMetadata in Clerk
    const client = await clerkClient();
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        role,
        ward_id: wardId ?? null,
      },
    });

    return Response.json({
      success: true,
      message: `User ${targetUserId} successfully promoted to ${role} with ward ${wardId ?? 'none'}`,
      data: {
        userId: targetUserId,
        role,
        wardId,
      },
    } satisfies PromoteResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        message: error.message || 'Internal server error',
      } satisfies PromoteResponse,
      { status: 500 }
    );
  }
}
