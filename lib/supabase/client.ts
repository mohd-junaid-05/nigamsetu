import { createClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client.
 * Configured so Clerk owns the session and tokens are passed via authorization headers.
 * Supabase self-refreshing cookies and session persistence are explicitly disabled.
 */
export function createBrowserSupabaseClient(clerkToken?: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
