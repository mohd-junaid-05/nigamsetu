import { auth, currentUser } from '@clerk/nextjs/server';

export type UserRole = 'citizen' | 'official' | 'admin' | 'facility';

export interface ServerSessionClaims {
  userId: string | null;
  role: UserRole;
  wardId: string | null;
  facilityId: string | null;
  isAuthenticated: boolean;
  email?: string | null;
}

const DEFAULT_WARD_ID = 'a0000000-0000-0000-0000-000000000001'; // Ward 104 - Banjara Hills
const AUTHORIZED_ADMIN_EMAIL = 'nigamsetupanel@gmail.com';

/**
 * Reads the current role and ward claims during server rendering.
 * Resolves on the server before first paint, without client hydration delays.
 *
 * Security Policy:
 * - nigamsetupanel@gmail.com is the sole authorized administrator with global access across all wards, depots, and traces.
 * - All other users, new registrations, and Google/email sign-ins default strictly to 'citizen'.
 * - Government/official features are inaccessible to citizen accounts.
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

  // Check email address of authenticated user
  let primaryEmail: string | null = null;
  try {
    const user = await currentUser();
    if (user?.emailAddresses && user.emailAddresses.length > 0) {
      primaryEmail = user.emailAddresses[0].emailAddress.toLowerCase().trim();
    }
  } catch {
    // If currentUser() fails, continue
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

  // Default strictly to 'citizen' for all users
  let role: UserRole = 'citizen';
  let wardId: string | null = null;
  let facilityId: string | null = null;

  // Check if this is the sole authorized administrator
  const isMasterAdmin = primaryEmail === AUTHORIZED_ADMIN_EMAIL;

  if (isMasterAdmin) {
    role = 'admin';
    wardId = DEFAULT_WARD_ID;
    facilityId = 'b0000000-0000-0000-0000-000000000001';
  } else if (rawRole === 'official' || rawRole === 'facility') {
    // Allow non-admin municipal staff roles if explicitly assigned
    role = rawRole;
    wardId = rawWardId || null;
    facilityId = rawFacilityId || null;
  } else {
    // All other users (including any claiming admin without the master email) are strictly citizens
    role = 'citizen';
    wardId = null;
    facilityId = null;
  }

  // Sync / verify against public.profiles using service role key
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';

    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role,ward_id,facility_id`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const prof = rows[0];

        if (isMasterAdmin) {
          // Ensure master admin in Supabase is always admin
          if (prof.role !== 'admin' || !prof.ward_id) {
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
              method: 'PATCH',
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role: 'admin',
                ward_id: DEFAULT_WARD_ID,
                facility_id: 'b0000000-0000-0000-0000-000000000001',
              }),
            }).catch(() => {});
          }
          role = 'admin';
          wardId = DEFAULT_WARD_ID;
          facilityId = 'b0000000-0000-0000-0000-000000000001';
        } else {
          // If profile in Supabase is admin but email is NOT master admin, demote to citizen
          if (prof.role === 'admin') {
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
              method: 'PATCH',
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role: 'citizen',
                ward_id: null,
                facility_id: null,
              }),
            }).catch(() => {});
            role = 'citizen';
            wardId = null;
            facilityId = null;
          } else if (prof.role === 'official' || prof.role === 'facility') {
            role = prof.role;
            wardId = prof.ward_id;
            facilityId = prof.facility_id;
          } else {
            role = 'citizen';
          }
        }
      } else {
        // If profile does not exist yet in Supabase, create it with citizen role (or admin if master)
        const targetRole: UserRole = isMasterAdmin ? 'admin' : 'citizen';
        const targetWard = isMasterAdmin ? DEFAULT_WARD_ID : null;
        const targetFacility = isMasterAdmin ? 'b0000000-0000-0000-0000-000000000001' : null;

        await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: userId,
            role: targetRole,
            ward_id: targetWard,
            facility_id: targetFacility,
            phone: '+91 ••••••••••',
          }),
        }).catch(() => {});
      }
    }
  } catch {
    // fallback gracefully
  }

  return {
    userId,
    role,
    wardId,
    facilityId,
    isAuthenticated: true,
    email: primaryEmail,
  };
}
