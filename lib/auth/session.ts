import { auth } from '@clerk/nextjs/server';

export type UserRole = 'citizen' | 'official' | 'admin';

export interface ServerSessionClaims {
  userId: string | null;
  role: UserRole;
  wardId: string | null;
  isAuthenticated: boolean;
}

/**
 * Reads the current role and ward claims during server rendering.
 * Resolves on the server before first paint, without client hydration delays.
 */
export async function getServerSession(): Promise<ServerSessionClaims> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return {
      userId: null,
      role: 'citizen',
      wardId: null,
      isAuthenticated: false,
    };
  }

  // Session token carries role and ward_id claim either directly or nested in metadata
  const claims = sessionClaims as Record<string, unknown> | null;
  
  const rawRole = (claims?.role as string) 
    || ((claims?.public_metadata as Record<string, unknown>)?.role as string)
    || ((claims?.metadata as Record<string, unknown>)?.role as string);

  const rawWardId = (claims?.ward_id as string)
    || ((claims?.public_metadata as Record<string, unknown>)?.ward_id as string)
    || ((claims?.metadata as Record<string, unknown>)?.ward_id as string);

  const role: UserRole = (rawRole === 'official' || rawRole === 'admin') ? rawRole : 'citizen';
  const wardId = rawWardId || null;

  return {
    userId,
    role,
    wardId,
    isAuthenticated: true,
  };
}
