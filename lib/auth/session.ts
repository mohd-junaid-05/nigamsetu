import { auth } from '@clerk/nextjs/server';

export type UserRole = 'citizen' | 'official' | 'admin' | 'facility';

export interface ServerSessionClaims {
  userId: string | null;
  role: UserRole;
  wardId: string | null;
  facilityId: string | null;
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
      facilityId: null,
      isAuthenticated: false,
    };
  }

  // Session token carries role, ward_id, and facility_id claim either directly or nested in metadata
  const claims = sessionClaims as Record<string, unknown> | null;
  
  const rawRole = (claims?.role as string) 
    || ((claims?.public_metadata as Record<string, unknown>)?.role as string)
    || ((claims?.metadata as Record<string, unknown>)?.role as string);

  const rawWardId = (claims?.ward_id as string)
    || ((claims?.public_metadata as Record<string, unknown>)?.ward_id as string)
    || ((claims?.metadata as Record<string, unknown>)?.ward_id as string);

  const rawFacilityId = (claims?.facility_id as string)
    || ((claims?.public_metadata as Record<string, unknown>)?.facility_id as string)
    || ((claims?.metadata as Record<string, unknown>)?.facility_id as string);

  const role: UserRole = (rawRole === 'official' || rawRole === 'admin' || rawRole === 'facility') ? rawRole : 'citizen';
  const wardId = rawWardId || null;
  const facilityId = rawFacilityId || null;

  return {
    userId,
    role,
    wardId,
    facilityId,
    isAuthenticated: true,
  };
}
