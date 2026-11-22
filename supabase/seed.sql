-- =====================================================================
-- NigamSetu: Phase 02 Seed Data
-- 3 Wards, 6 Facilities, 1 Admin Profile, Demo Profiles & Complaints
-- File: supabase/seed.sql
-- =====================================================================

-- 1. Seed Wards (Bengaluru BBMP: Bellandur, HSR Layout, Koramangala)
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

-- 2. Seed Facilities (2 per ward across road, sanitation, sewage, health)
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

-- 3. Seed Admin Profile (required by Phase 02 spec), plus Official and Citizen profiles
INSERT INTO public.profiles (id, role, ward_id, phone)
VALUES
  ('admin_bbmp_controller', 'admin', NULL, '+919876543210'),
  ('official_ward_bellandur', 'official', 'a0000000-0000-0000-0000-000000000001'::uuid, '+919876543211'),
  ('citizen_test_user', 'citizen', NULL, '+919876543212')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  ward_id = EXCLUDED.ward_id,
  phone = EXCLUDED.phone;

-- 4. Seed Representative Complaints for Testing RLS Acceptance Checks
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
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
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
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800',
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
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800',
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
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    ST_GeomFromText('POINT(77.652 12.920)', 4326),
    '27th Main, Sector 1, HSR Layout, Bengaluru',
    now() - interval '2 days'
  )
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  severity = EXCLUDED.severity,
  status = EXCLUDED.status,
  description = EXCLUDED.description;
