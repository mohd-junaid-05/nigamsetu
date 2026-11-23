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
const SHOWCASE_ADMIN_EMAILS = [
  'sessionbyilder@gmail.com',
  'sessionbyilder7@gmail.com',
  'junaid03mo22@gmail.com',
];

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

  // Check email address if available
  let primaryEmail: string | null = null;
  try {
    const user = await currentUser();
    if (user?.emailAddresses && user.emailAddresses.length > 0) {
      primaryEmail = user.emailAddresses[0].emailAddress.toLowerCase();
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

  let role: UserRole = (rawRole === 'official' || rawRole === 'admin' || rawRole === 'facility') ? rawRole : 'admin';
  let wardId = rawWardId || DEFAULT_WARD_ID;
  let facilityId = rawFacilityId || null;

  // If the user's email is one of our designated showcase emails, guarantee admin role, ward authority & facility depot authority
  if (primaryEmail && SHOWCASE_ADMIN_EMAILS.includes(primaryEmail)) {
    role = 'admin';
    wardId = DEFAULT_WARD_ID;
    facilityId = 'b0000000-0000-0000-0000-000000000001';
  }

  // Query public.profiles using service role key to bypass RLS and get true profile
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
        if (prof.role && (prof.role === 'admin' || prof.role === 'official' || prof.role === 'facility')) {
          role = prof.role;
        }
        if (prof.ward_id) {
          wardId = prof.ward_id;
        }
        if (prof.facility_id) {
          facilityId = prof.facility_id;
        }
      } else {
        // If profile does not exist yet in Supabase, create it with admin role and default ward
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
            role: 'admin',
            ward_id: DEFAULT_WARD_ID,
            phone: '+91 ••••••••••',
          }),
        }).catch(() => {});
      }
    }
  } catch {
    // fallback gracefully
  }

  // Fallback defaults for seamless showcase testing
  if (!wardId) {
    wardId = DEFAULT_WARD_ID;
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
