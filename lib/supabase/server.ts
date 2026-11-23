import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/**
 * Server-side Supabase client.
 * Carries the Clerk JWT and custom claim headers with every request so RLS policies can evaluate
 * auth.uid() and custom claims safely without hydration or cookie mismatch.
 * Sessions belong to Clerk; Supabase session persistence and refresh are disabled.
 */
export async function createServerSupabaseClient() {
  const { userId, sessionClaims } = await auth();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';

  const role =
    (sessionClaims?.role as string) ||
    ((sessionClaims?.public_metadata as Record<string, unknown>)?.role as string) ||
    'citizen';
  const wardId =
    (sessionClaims?.ward_id as string) ||
    ((sessionClaims?.public_metadata as Record<string, unknown>)?.ward_id as string) ||
    '';
  const facilityId =
    (sessionClaims?.facility_id as string) ||
    ((sessionClaims?.public_metadata as Record<string, unknown>)?.facility_id as string) ||
    '';

  const headers: Record<string, string> = {};
  // DO NOT inject Clerk's RS256 token into Supabase Storage / PostgREST Authorization header.
  // Supabase expects HS256 JWT or its own publishable/service key; Clerk's token triggers
  // '"alg" (Algorithm) Header Parameter value not allowed'.
  // Identity is securely conveyed via custom Postgres headers (x-user-id, x-user-role, etc.)
  if (userId) headers['x-user-id'] = userId;
  if (role) headers['x-user-role'] = role;
  if (wardId) headers['x-user-ward-id'] = wardId;
  if (facilityId) headers['x-user-facility-id'] = facilityId;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Clean Supabase client dedicated to storage operations (uploads, downloads, public URLs).
 * Uses the Supabase publishable/anon key directly without custom headers to prevent auth gate rejections.
 */
export function createStorageSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Creates an anonymous Supabase client (no auth headers).
 * Useful for public data queries or testing anonymous access constraints.
 */
export function createAnonymousSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Creates an authenticated Supabase client for a specific user ID and role.
 * Injects required PostgREST identity headers (x-user-id, x-user-role, x-user-ward-id, x-user-facility-id).
 */
export function createAuthenticatedSupabaseClient(
  userId: string,
  role = 'citizen',
  wardId?: string,
  facilityId?: string
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';

  const headers: Record<string, string> = {
    'x-user-id': userId,
    'x-user-role': role,
  };
  if (wardId) headers['x-user-ward-id'] = wardId;
  if (facilityId) headers['x-user-facility-id'] = facilityId;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
