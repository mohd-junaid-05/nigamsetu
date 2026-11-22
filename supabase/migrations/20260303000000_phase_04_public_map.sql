-- Migration: 20260303000000_phase_04_public_map.sql
-- Phase 04: Public Map RPC functions and security permissions

-- 1. Function to retrieve lightweight public complaint pins for the map
CREATE OR REPLACE FUNCTION public.get_public_map_complaints()
RETURNS TABLE (
  id uuid,
  category text,
  severity int,
  status text,
  lat float,
  lng float,
  created_at timestamptz,
  resolved_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    c.id,
    c.category,
    c.severity,
    c.status,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng,
    c.created_at,
    c.resolved_at
  FROM public.complaints c
  WHERE c.status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'escalated')
  ORDER BY c.created_at DESC;
$$;

-- Grant execution to all users (public map has no RLS restriction)
GRANT EXECUTE ON FUNCTION public.get_public_map_complaints() TO anon, authenticated, service_role;

-- 2. Function to retrieve lazy-loaded popup details for a single complaint
CREATE OR REPLACE FUNCTION public.get_complaint_popup(target_id uuid)
RETURNS TABLE (
  id uuid,
  category text,
  severity int,
  status text,
  image_url text,
  address_text text,
  created_at timestamptz,
  lat float,
  lng float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    c.id,
    c.category,
    c.severity,
    c.status,
    c.image_url,
    c.address_text,
    c.created_at,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng
  FROM public.complaints c
  WHERE c.id = target_id
  LIMIT 1;
$$;

-- Grant execution to all users for popup lazy loading
GRANT EXECUTE ON FUNCTION public.get_complaint_popup(uuid) TO anon, authenticated, service_role;
