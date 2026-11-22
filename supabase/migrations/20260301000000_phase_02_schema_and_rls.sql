-- =====================================================================
-- NigamSetu: Phase 02 Database Schema & Row-Level Security
-- File: 20260301000000_phase_02_schema_and_rls.sql
-- =====================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Basic Auth Helper (No Table Dependency)
CREATE OR REPLACE FUNCTION public.requesting_user_id() 
RETURNS text 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
$$;

-- 3. Create Tables in strict dependency order

-- 3.1 Wards Table
CREATE TABLE IF NOT EXISTS public.wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  boundary geometry(Polygon, 4326) NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.2 Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('citizen', 'official', 'admin')) DEFAULT 'citizen',
  ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.3 Facilities Table
CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('road', 'sanitation', 'education', 'health', 'healthcenter', 'sewage', 'other')),
  location geometry(Point, 4326) NOT NULL,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.4 Complaint Clusters Table
CREATE TABLE IF NOT EXISTS public.complaint_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_id uuid, -- Foreign key constraint added after complaints table
  complaint_count int NOT NULL DEFAULT 1,
  centroid geometry(Point, 4326) NOT NULL,
  bounding_radius float NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'escalated', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.5 Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  cluster_id uuid REFERENCES public.complaint_clusters(id) ON DELETE SET NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('road', 'garbage', 'sewage', 'school', 'healthcenter', 'other')),
  severity int NOT NULL CHECK (severity BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'escalated', 'rejected')),
  description text,
  image_url text NOT NULL,
  location geometry(Point, 4326) NOT NULL,
  address_text text,
  sla_deadline timestamptz,
  resolved_at timestamptz,
  resolution_image_url text,
  verification_score float,
  verification_status text CHECK (verification_status IN ('pending', 'passed', 'failed')),
  escalation_letter_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add circular foreign key for representative_id in complaint_clusters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_clusters_representative'
  ) THEN
    ALTER TABLE public.complaint_clusters
      ADD CONSTRAINT fk_clusters_representative
      FOREIGN KEY (representative_id) REFERENCES public.complaints(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.6 Cluster Members Table
CREATE TABLE IF NOT EXISTS public.cluster_members (
  cluster_id uuid NOT NULL REFERENCES public.complaint_clusters(id) ON DELETE CASCADE,
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cluster_id, complaint_id)
);

-- 3.7 Escalations Table
CREATE TABLE IF NOT EXISTS public.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  trigger_reason text NOT NULL CHECK (trigger_reason IN ('sla_breach', 'verification_failed', 'ghost_closure')),
  letter_content text NOT NULL,
  authority text NOT NULL CHECK (authority IN ('municipal_commissioner', 'ward_officer', 'rti')),
  deadline date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.8 Agent Traces Table
CREATE TABLE IF NOT EXISTS public.agent_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
  tool_name text NOT NULL CHECK (tool_name IN ('severity_score', 'duplicate_check', 'verify_resolution', 'generate_escalation', 'chat_answer')),
  input_summary jsonb NOT NULL,
  output_summary jsonb NOT NULL,
  model_used text NOT NULL,
  latency_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Auth Functions that query profiles table (profiles table now exists)
CREATE OR REPLACE FUNCTION public.requesting_user_role() 
RETURNS text 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'public_metadata' ->> 'role'),
    (SELECT role FROM public.profiles WHERE id = public.requesting_user_id()),
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
    nullif(current_setting('request.jwt.claim.ward_id', true), '')::uuid,
    ((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'ward_id'))::uuid,
    ((nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'public_metadata' ->> 'ward_id'))::uuid,
    (SELECT ward_id FROM public.profiles WHERE id = public.requesting_user_id())
  );
$$;

-- 5. PostGIS & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_location ON public.complaints USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON public.complaints(ward_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_cluster ON public.complaints(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_location ON public.facilities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON public.wards USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_clusters_centroid ON public.complaint_clusters USING GIST(centroid);

-- 6. Enable Row-Level Security on EVERY Table (Default: Deny All)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;

-- 7. Row-Level Security Policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (
    id = public.requesting_user_id()
    OR public.requesting_user_role() IN ('official', 'admin')
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (
    id = public.requesting_user_id()
    OR public.requesting_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (
    id = public.requesting_user_id()
    OR public.requesting_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "wards_select" ON public.wards;
CREATE POLICY "wards_select" ON public.wards
  FOR SELECT USING (public.requesting_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "wards_admin_all" ON public.wards;
CREATE POLICY "wards_admin_all" ON public.wards
  FOR ALL USING (public.requesting_user_role() = 'admin');

DROP POLICY IF EXISTS "facilities_select" ON public.facilities;
CREATE POLICY "facilities_select" ON public.facilities
  FOR SELECT USING (public.requesting_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "facilities_admin_all" ON public.facilities;
CREATE POLICY "facilities_admin_all" ON public.facilities
  FOR ALL USING (public.requesting_user_role() = 'admin');

DROP POLICY IF EXISTS "complaints_select_citizen" ON public.complaints;
CREATE POLICY "complaints_select_citizen" ON public.complaints
  FOR SELECT USING (
    public.requesting_user_id() IS NOT NULL
    AND public.requesting_user_role() = 'citizen'
    AND (
      reporter_id = public.requesting_user_id()
      OR status IN ('open', 'assigned', 'in_progress', 'verified')
    )
  );

DROP POLICY IF EXISTS "complaints_select_official" ON public.complaints;
CREATE POLICY "complaints_select_official" ON public.complaints
  FOR SELECT USING (
    public.requesting_user_id() IS NOT NULL
    AND public.requesting_user_role() = 'official'
    AND ward_id = public.requesting_user_ward_id()
  );

DROP POLICY IF EXISTS "complaints_select_admin" ON public.complaints;
CREATE POLICY "complaints_select_admin" ON public.complaints
  FOR SELECT USING (
    public.requesting_user_id() IS NOT NULL
    AND public.requesting_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "complaints_insert" ON public.complaints;
CREATE POLICY "complaints_insert" ON public.complaints
  FOR INSERT WITH CHECK (
    public.requesting_user_id() IS NOT NULL
    AND (
      reporter_id = public.requesting_user_id()
      OR public.requesting_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "complaints_update_reporter" ON public.complaints;
CREATE POLICY "complaints_update_reporter" ON public.complaints
  FOR UPDATE USING (
    public.requesting_user_id() IS NOT NULL
    AND reporter_id = public.requesting_user_id()
  );

DROP POLICY IF EXISTS "complaints_update_official" ON public.complaints;
CREATE POLICY "complaints_update_official" ON public.complaints
  FOR UPDATE USING (
    public.requesting_user_id() IS NOT NULL
    AND (
      (public.requesting_user_role() = 'official' AND ward_id = public.requesting_user_ward_id())
      OR public.requesting_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "clusters_select" ON public.complaint_clusters;
CREATE POLICY "clusters_select" ON public.complaint_clusters
  FOR SELECT USING (public.requesting_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "clusters_manage" ON public.complaint_clusters;
CREATE POLICY "clusters_manage" ON public.complaint_clusters
  FOR ALL USING (public.requesting_user_role() IN ('official', 'admin'));

DROP POLICY IF EXISTS "cluster_members_select" ON public.cluster_members;
CREATE POLICY "cluster_members_select" ON public.cluster_members
  FOR SELECT USING (public.requesting_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "cluster_members_manage" ON public.cluster_members;
CREATE POLICY "cluster_members_manage" ON public.cluster_members
  FOR ALL USING (public.requesting_user_role() IN ('official', 'admin'));

DROP POLICY IF EXISTS "escalations_select" ON public.escalations;
CREATE POLICY "escalations_select" ON public.escalations
  FOR SELECT USING (
    public.requesting_user_id() IS NOT NULL
    AND (
      public.requesting_user_role() = 'admin'
      OR (
        public.requesting_user_role() = 'official'
        AND EXISTS (
          SELECT 1 FROM public.complaints c 
          WHERE c.id = escalations.complaint_id 
          AND c.ward_id = public.requesting_user_ward_id()
        )
      )
      OR (
        public.requesting_user_role() = 'citizen'
        AND EXISTS (
          SELECT 1 FROM public.complaints c 
          WHERE c.id = escalations.complaint_id 
          AND c.reporter_id = public.requesting_user_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "escalations_manage" ON public.escalations;
CREATE POLICY "escalations_manage" ON public.escalations
  FOR ALL USING (public.requesting_user_role() IN ('official', 'admin'));

DROP POLICY IF EXISTS "agent_traces_select" ON public.agent_traces;
CREATE POLICY "agent_traces_select" ON public.agent_traces
  FOR SELECT USING (public.requesting_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "agent_traces_insert" ON public.agent_traces;
CREATE POLICY "agent_traces_insert" ON public.agent_traces
  FOR INSERT WITH CHECK (public.requesting_user_id() IS NOT NULL);

-- 8. RPC Functions
CREATE OR REPLACE FUNCTION public.get_ward_from_point(lng double precision, lat double precision)
RETURNS SETOF public.wards
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.wards
  WHERE ST_Contains(boundary, ST_SetSRID(ST_Point(lng, lat), 4326))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_ward_from_point(p_lng double precision, p_lat double precision)
RETURNS SETOF public.wards
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.wards
  WHERE ST_Contains(boundary, ST_SetSRID(ST_Point(p_lng, p_lat), 4326))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.increment_cluster_count(target_cluster_id uuid)
RETURNS int
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  new_count int;
BEGIN
  UPDATE public.complaint_clusters
  SET complaint_count = complaint_count + 1
  WHERE id = target_cluster_id
  RETURNING complaint_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_priority_queue(target_ward_id uuid)
RETURNS TABLE (
  id uuid,
  reporter_id text,
  ward_id uuid,
  cluster_id uuid,
  facility_id uuid,
  category text,
  severity int,
  status text,
  description text,
  image_url text,
  location geometry,
  address_text text,
  sla_deadline timestamptz,
  resolved_at timestamptz,
  resolution_image_url text,
  verification_score float,
  verification_status text,
  escalation_letter_url text,
  created_at timestamptz,
  updated_at timestamptz,
  weight int,
  sla_breached boolean
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    c.id,
    c.reporter_id,
    c.ward_id,
    c.cluster_id,
    c.facility_id,
    c.category,
    c.severity,
    c.status,
    c.description,
    c.image_url,
    c.location,
    c.address_text,
    c.sla_deadline,
    c.resolved_at,
    c.resolution_image_url,
    c.verification_score,
    c.verification_status,
    c.escalation_letter_url,
    c.created_at,
    c.updated_at,
    COALESCE(cl.complaint_count, 1) AS weight,
    (c.sla_deadline IS NOT NULL AND c.sla_deadline < NOW()) AS sla_breached
  FROM public.complaints c
  LEFT JOIN public.complaint_clusters cl ON c.cluster_id = cl.id
  WHERE c.ward_id = target_ward_id
    AND c.status IN ('open', 'assigned', 'in_progress')
  ORDER BY c.severity DESC, weight DESC, c.created_at ASC;
$$;
