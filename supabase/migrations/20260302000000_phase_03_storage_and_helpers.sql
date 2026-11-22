-- =====================================================================
-- NigamSetu: Migration Phase 03 - Storage Buckets & PostgREST Headers Support
-- File: supabase/migrations/20260302000000_phase_03_storage_and_helpers.sql
-- =====================================================================

-- 1. Ensure public complaint-images bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage RLS Policies for complaint-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'complaint-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public upload' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'complaint-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public delete" ON storage.objects FOR DELETE USING (bucket_id = 'complaint-images');
  END IF;
END $$;

-- 3. Update auth helper functions to support both Clerk JWT claims and PostgREST request headers
CREATE OR REPLACE FUNCTION public.requesting_user_id() 
RETURNS text 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'),
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-user-id', '')
  );
$$;

CREATE OR REPLACE FUNCTION public.requesting_user_role() 
RETURNS text 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-user-role', ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'public_metadata' ->> 'role'),
    (SELECT role FROM public.profiles WHERE id = public.requesting_user_id()),
    CASE 
      WHEN current_setting('request.jwt.claim.role', true) IN ('official', 'admin', 'citizen') 
      THEN current_setting('request.jwt.claim.role', true)
      ELSE NULL 
    END,
    'citizen'
  );
$$;

CREATE OR REPLACE FUNCTION public.requesting_user_ward_id() 
RETURNS uuid 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-user-ward-id', '')::uuid,
    ((nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'public_metadata' ->> 'ward_id'))::uuid,
    ((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'ward_id'))::uuid,
    (SELECT ward_id FROM public.profiles WHERE id = public.requesting_user_id()),
    nullif(current_setting('request.jwt.claim.ward_id', true), '')::uuid
  );
$$;
