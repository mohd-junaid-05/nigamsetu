-- =====================================================================
-- NigamSetu: Complete Database Setup (Schema + RLS + Seed Data)
-- File: supabase/full_setup.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- PART 1: POSTGIS EXTENSION
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------
-- PART 2: BASIC AUTH HELPER (NO TABLE DEPENDENCY)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- PART 3: TABLE DEFINITIONS (STRICT DEPENDENCY ORDER)
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- PART 4: AUTH FUNCTIONS THAT QUERY PROFILES TABLE
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- PART 5: POSTGIS & PERFORMANCE INDEXES
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_complaints_location ON public.complaints USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON public.complaints(ward_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_cluster ON public.complaints(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_location ON public.facilities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON public.wards USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_clusters_centroid ON public.complaint_clusters USING GIST(centroid);

-- ---------------------------------------------------------------------
-- PART 6: ROW-LEVEL SECURITY (DEFAULT DENY ALL)
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- PART 7: ROLE PERMISSIONS (GRANT SCHEMA & TABLE PRIVILEGES)
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- PART 8: ROW-LEVEL SECURITY POLICIES
-- ---------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_own' AND tablename = 'profiles') THEN
    CREATE POLICY "profiles_select_own" ON public.profiles
      FOR SELECT USING (
        id = public.requesting_user_id()
        OR public.requesting_user_role() IN ('official', 'admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_insert_own' AND tablename = 'profiles') THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles
      FOR INSERT WITH CHECK (
        id = public.requesting_user_id()
        OR public.requesting_user_role() = 'admin'
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own' AND tablename = 'profiles') THEN
    CREATE POLICY "profiles_update_own" ON public.profiles
      FOR UPDATE USING (
        id = public.requesting_user_id()
        OR public.requesting_user_role() = 'admin'
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wards_select' AND tablename = 'wards') THEN
    CREATE POLICY "wards_select" ON public.wards
      FOR SELECT USING (public.requesting_user_id() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wards_admin_all' AND tablename = 'wards') THEN
    CREATE POLICY "wards_admin_all" ON public.wards
      FOR ALL USING (public.requesting_user_role() = 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'facilities_select' AND tablename = 'facilities') THEN
    CREATE POLICY "facilities_select" ON public.facilities
      FOR SELECT USING (public.requesting_user_id() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'facilities_admin_all' AND tablename = 'facilities') THEN
    CREATE POLICY "facilities_admin_all" ON public.facilities
      FOR ALL USING (public.requesting_user_role() = 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'complaints_select_citizen' AND tablename = 'complaints') THEN
    CREATE POLICY "complaints_select_citizen" ON public.complaints
      FOR SELECT USING (
        public.requesting_user_id() IS NOT NULL
        AND public.requesting_user_role() = 'citizen'
        AND (
          reporter_id = public.requesting_user_id()
          OR status IN ('open', 'assigned', 'in_progress', 'verified')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'complaints_select_official' AND tablename = 'complaints') THEN
    CREATE POLICY "complaints_select_official" ON public.complaints
      FOR SELECT USING (
        public.requesting_user_id() IS NOT NULL
        AND public.requesting_user_role() = 'official'
        AND ward_id = public.requesting_user_ward_id()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'complaints_select_admin' AND tablename = 'complaints') THEN
    CREATE POLICY "complaints_select_admin" ON public.complaints
      FOR SELECT USING (
        public.requesting_user_id() IS NOT NULL
        AND public.requesting_user_role() = 'admin'
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'complaints_insert' AND tablename = 'complaints') THEN
    CREATE POLICY "complaints_insert" ON public.complaints
      FOR INSERT WITH CHECK (
        public.requesting_user_id() IS NOT NULL
        AND (
          reporter_id = public.requesting_user_id()
          OR public.requesting_user_role() = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'complaints_update_reporter' AND tablename = 'complaints') THEN
    CREATE POLICY "complaints_update_reporter" ON public.complaints
      FOR UPDATE USING (
        public.requesting_user_id() IS NOT NULL
        AND reporter_id = public.requesting_user_id()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'complaints_update_official' AND tablename = 'complaints') THEN
    CREATE POLICY "complaints_update_official" ON public.complaints
      FOR UPDATE USING (
        public.requesting_user_id() IS NOT NULL
        AND (
          (public.requesting_user_role() = 'official' AND ward_id = public.requesting_user_ward_id())
          OR public.requesting_user_role() = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clusters_select' AND tablename = 'complaint_clusters') THEN
    CREATE POLICY "clusters_select" ON public.complaint_clusters
      FOR SELECT USING (public.requesting_user_id() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clusters_manage' AND tablename = 'complaint_clusters') THEN
    CREATE POLICY "clusters_manage" ON public.complaint_clusters
      FOR ALL USING (public.requesting_user_role() IN ('official', 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cluster_members_select' AND tablename = 'cluster_members') THEN
    CREATE POLICY "cluster_members_select" ON public.cluster_members
      FOR SELECT USING (public.requesting_user_id() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cluster_members_manage' AND tablename = 'cluster_members') THEN
    CREATE POLICY "cluster_members_manage" ON public.cluster_members
      FOR ALL USING (public.requesting_user_role() IN ('official', 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'escalations_select' AND tablename = 'escalations') THEN
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
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'escalations_manage' AND tablename = 'escalations') THEN
    CREATE POLICY "escalations_manage" ON public.escalations
      FOR ALL USING (public.requesting_user_role() IN ('official', 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_traces_select' AND tablename = 'agent_traces') THEN
    CREATE POLICY "agent_traces_select" ON public.agent_traces
      FOR SELECT USING (public.requesting_user_id() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_traces_insert' AND tablename = 'agent_traces') THEN
    CREATE POLICY "agent_traces_insert" ON public.agent_traces
      FOR INSERT WITH CHECK (public.requesting_user_id() IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- PART 9: RPC FUNCTIONS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ward_from_point(lng double precision, lat double precision)
RETURNS SETOF public.wards
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.wards
  WHERE ST_Contains(boundary, ST_SetSRID(ST_Point(lng, lat), 4326))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.increment_cluster_count(target_cluster_id uuid)
RETURNS int
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
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
SECURITY DEFINER
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

-- ---------------------------------------------------------------------
-- PART 10: SEED DATA
-- ---------------------------------------------------------------------

-- 10.1 Seed Wards (Bengaluru BBMP)
INSERT INTO public.wards (id, name, boundary, city, state)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Ward 150 - Bellandur',
    ST_GeomFromText('POLYGON((77.660 12.920, 77.690 12.920, 77.690 12.950, 77.660 12.950, 77.660 12.920))', 4326),
    'Bengaluru',
    'Karnataka'
  ),
  (
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'Ward 174 - HSR Layout',
    ST_GeomFromText('POLYGON((77.630 12.900, 77.660 12.900, 77.660 12.925, 77.630 12.925, 77.630 12.900))', 4326),
    'Bengaluru',
    'Karnataka'
  ),
  (
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'Ward 112 - Koramangala',
    ST_GeomFromText('POLYGON((77.610 12.925, 77.640 12.925, 77.640 12.945, 77.610 12.945, 77.610 12.925))', 4326),
    'Bengaluru',
    'Karnataka'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  boundary = EXCLUDED.boundary,
  city = EXCLUDED.city,
  state = EXCLUDED.state;

-- 10.2 Seed Facilities
INSERT INTO public.facilities (id, ward_id, name, type, location, contact_phone)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Bellandur PWD Road Works Depot',
    'road',
    ST_GeomFromText('POINT(77.675 12.935)', 4326),
    '+918025700001'
  ),
  (
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Bellandur Urban Primary Health Center',
    'healthcenter',
    ST_GeomFromText('POINT(77.670 12.940)', 4326),
    '+918025700002'
  ),
  (
    'b0000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'HSR Layout Sanitation & Solid Waste Depot',
    'sanitation',
    ST_GeomFromText('POINT(77.645 12.912)', 4326),
    '+918025700003'
  ),
  (
    'b0000000-0000-0000-0000-000000000004'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'HSR BWSSB Sewage Pumping Station',
    'sewage',
    ST_GeomFromText('POINT(77.650 12.918)', 4326),
    '+918025700004'
  ),
  (
    'b0000000-0000-0000-0000-000000000005'::uuid,
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'Koramangala PWD Depot 4',
    'road',
    ST_GeomFromText('POINT(77.625 12.932)', 4326),
    '+918025700005'
  ),
  (
    'b0000000-0000-0000-0000-000000000006'::uuid,
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'Koramangala Solid Waste Management Center',
    'sanitation',
    ST_GeomFromText('POINT(77.630 12.938)', 4326),
    '+918025700006'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  location = EXCLUDED.location,
  contact_phone = EXCLUDED.contact_phone;

-- 10.3 Seed Profiles
INSERT INTO public.profiles (id, role, ward_id, phone)
VALUES
  ('admin_bbmp_controller', 'admin', NULL, '+919876543210'),
  ('official_ward_bellandur', 'official', 'a0000000-0000-0000-0000-000000000001'::uuid, '+919876543211'),
  ('citizen_test_user', 'citizen', NULL, '+919876543212'),
  ('other_citizen_user', 'citizen', NULL, '+919876543213')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  ward_id = EXCLUDED.ward_id,
  phone = EXCLUDED.phone;

-- 10.4 Seed Complaints
INSERT INTO public.complaints (
  id, reporter_id, ward_id, category, severity, status, description, image_url, location, address_text, sla_deadline
)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'citizen_test_user',
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'road',
    3,
    'open',
    'Severe pothole on Outer Ring Road Bellandur causing traffic bottleneck',
    '/images/reports/road_pothole_1.webp',
    ST_GeomFromText('POINT(77.672 12.930)', 4326),
    'Outer Ring Road near Bellandur EcoSpace, Bengaluru',
    now() + interval '48 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000002'::uuid,
    'citizen_test_user',
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'garbage',
    2,
    'in_progress',
    'Overflowing municipal garbage bin near Bellandur lake gate',
    '/images/reports/garbage_overflow_1.webp',
    ST_GeomFromText('POINT(77.674 12.934)', 4326),
    'Lake View Road, Ward 150 Bellandur, Bengaluru',
    now() + interval '24 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000003'::uuid,
    'other_citizen_user',
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'sewage',
    4,
    'open',
    'Urgent raw sewage overflow in residential street',
    '/images/reports/sewage_overflow_1.webp',
    ST_GeomFromText('POINT(77.648 12.915)', 4326),
    '14th Main, Sector 2, HSR Layout, Bengaluru',
    now() + interval '12 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000004'::uuid,
    'other_citizen_user',
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'road',
    1,
    'rejected',
    'Cosmetic crack on sidewalk pavement',
    '/images/reports/road_pothole_2.webp',
    ST_GeomFromText('POINT(77.652 12.920)', 4326),
    '27th Main, Sector 1, HSR Layout, Bengaluru',
    now() - interval '2 days'
  )
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  severity = EXCLUDED.severity,
  status = EXCLUDED.status,
  description = EXCLUDED.description;
