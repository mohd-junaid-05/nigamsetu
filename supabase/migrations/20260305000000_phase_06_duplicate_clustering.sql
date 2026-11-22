-- Migration: 20260305000000_phase_06_duplicate_clustering.sql
-- Phase 06: AI Agent Duplicate Clustering and Spatial Attestations

-- 1. Add image_perceptual_hash column to complaints table
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS image_perceptual_hash text;

CREATE INDEX IF NOT EXISTS idx_complaints_phash 
  ON public.complaints(image_perceptual_hash) 
  WHERE image_perceptual_hash IS NOT NULL;

-- 2. Secure RPC to update perceptual hash
CREATE OR REPLACE FUNCTION public.update_complaint_phash(
  p_complaint_id uuid,
  p_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.complaints
  SET image_perceptual_hash = p_hash,
      updated_at = now()
  WHERE id = p_complaint_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_complaint_phash(uuid, text) TO anon, authenticated, service_role;

-- 3. Secure RPC to find duplicate candidates within 100m, same category, last 30 days
CREATE OR REPLACE FUNCTION public.find_duplicate_candidates(
  p_lat double precision,
  p_lng double precision,
  p_category text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  category text,
  severity int,
  status text,
  image_url text,
  image_perceptual_hash text,
  cluster_id uuid,
  created_at timestamptz,
  lat double precision,
  lng double precision,
  distance_meters double precision
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
    c.image_perceptual_hash,
    c.cluster_id,
    c.created_at,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng,
    ST_Distance(
      c.location::geography,
      ST_SetSRID(ST_Point(p_lng, p_lat), 4326)::geography
    ) AS distance_meters
  FROM public.complaints c
  WHERE c.category = p_category
    AND c.created_at > (NOW() - INTERVAL '30 days')
    AND (p_exclude_id IS NULL OR c.id != p_exclude_id)
    AND ST_DWithin(
      c.location::geography,
      ST_SetSRID(ST_Point(p_lng, p_lat), 4326)::geography,
      100.0
    )
  ORDER BY distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_duplicate_candidates(double precision, double precision, text, uuid) TO anon, authenticated, service_role;

-- 4. Secure RPC to create a standalone cluster of size 1 for a complaint
CREATE OR REPLACE FUNCTION public.create_standalone_cluster(
  p_complaint_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existing_cluster_id uuid;
  v_cluster_id uuid;
  v_loc geometry;
  v_status text;
BEGIN
  -- Check if complaint already has a cluster
  SELECT cluster_id, location, status INTO v_existing_cluster_id, v_loc, v_status
  FROM public.complaints
  WHERE id = p_complaint_id;

  IF v_existing_cluster_id IS NOT NULL THEN
    RETURN v_existing_cluster_id;
  END IF;

  IF v_loc IS NULL THEN
    RETURN NULL;
  END IF;

  -- Create new cluster of size 1
  INSERT INTO public.complaint_clusters (
    representative_id,
    complaint_count,
    centroid,
    bounding_radius,
    status
  )
  VALUES (
    p_complaint_id,
    1,
    v_loc,
    0.0,
    COALESCE(v_status, 'open')
  )
  RETURNING id INTO v_cluster_id;

  -- Assign cluster_id on complaint
  UPDATE public.complaints
  SET cluster_id = v_cluster_id,
      updated_at = now()
  WHERE id = p_complaint_id;

  -- Register member
  INSERT INTO public.cluster_members (cluster_id, complaint_id, joined_at)
  VALUES (v_cluster_id, p_complaint_id, now())
  ON CONFLICT (cluster_id, complaint_id) DO NOTHING;

  RETURN v_cluster_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_standalone_cluster(uuid) TO anon, authenticated, service_role;

-- 5. Secure RPC to join an existing cluster and update centroid / bounding radius
CREATE OR REPLACE FUNCTION public.add_complaint_to_cluster(
  p_complaint_id uuid,
  p_cluster_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count int;
  v_avg_lat double precision;
  v_avg_lng double precision;
  v_max_radius double precision;
  v_new_centroid geometry;
  v_complaint_severity int;
  v_rep_severity int;
  v_current_rep uuid;
BEGIN
  -- Update complaints.cluster_id
  UPDATE public.complaints
  SET cluster_id = p_cluster_id,
      updated_at = now()
  WHERE id = p_complaint_id;

  -- Insert into cluster_members
  INSERT INTO public.cluster_members (cluster_id, complaint_id, joined_at)
  VALUES (p_cluster_id, p_complaint_id, now())
  ON CONFLICT (cluster_id, complaint_id) DO NOTHING;

  -- Recalculate member count and mean centroid (mean lat, mean lng)
  SELECT 
    COUNT(*),
    AVG(ST_Y(c.location::geometry)),
    AVG(ST_X(c.location::geometry))
  INTO v_count, v_avg_lat, v_avg_lng
  FROM public.cluster_members cm
  JOIN public.complaints c ON c.id = cm.complaint_id
  WHERE cm.cluster_id = p_cluster_id;

  v_new_centroid := ST_SetSRID(ST_Point(v_avg_lng, v_avg_lat), 4326);

  -- Recalculate max bounding radius in meters from new centroid
  SELECT COALESCE(MAX(ST_Distance(c.location::geography, v_new_centroid::geography)), 0.0)
  INTO v_max_radius
  FROM public.cluster_members cm
  JOIN public.complaints c ON c.id = cm.complaint_id
  WHERE cm.cluster_id = p_cluster_id;

  -- Determine representative: highest severity wins, else earlier complaint
  SELECT representative_id INTO v_current_rep
  FROM public.complaint_clusters
  WHERE id = p_cluster_id;

  SELECT severity INTO v_rep_severity
  FROM public.complaints
  WHERE id = v_current_rep;

  SELECT severity INTO v_complaint_severity
  FROM public.complaints
  WHERE id = p_complaint_id;

  IF v_complaint_severity > COALESCE(v_rep_severity, 0) THEN
    v_current_rep := p_complaint_id;
  END IF;

  -- Update cluster record
  UPDATE public.complaint_clusters
  SET complaint_count = v_count,
      centroid = v_new_centroid,
      bounding_radius = v_max_radius,
      representative_id = v_current_rep
  WHERE id = p_cluster_id;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_complaint_to_cluster(uuid, uuid) TO anon, authenticated, service_role;

-- 6. Updated public map RPC: Only shows one pin per cluster (the representative)
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
    COALESCE(ST_Y(cl.centroid::geometry), ST_Y(c.location::geometry)) AS lat,
    COALESCE(ST_X(cl.centroid::geometry), ST_X(c.location::geometry)) AS lng,
    c.created_at,
    c.resolved_at
  FROM public.complaints c
  LEFT JOIN public.complaint_clusters cl ON c.cluster_id = cl.id
  WHERE c.status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'escalated')
    -- Hide duplicate complaints that joined an existing cluster; only show representative
    AND (c.cluster_id IS NULL OR cl.representative_id = c.id)
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_map_complaints() TO anon, authenticated, service_role;

-- 7. Public map pins with complaint_count badge and cluster_id
CREATE OR REPLACE FUNCTION public.get_public_map_pins()
RETURNS TABLE (
  id uuid,
  category text,
  severity int,
  status text,
  lat float,
  lng float,
  created_at timestamptz,
  resolved_at timestamptz,
  complaint_count int,
  cluster_id uuid
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
    COALESCE(ST_Y(cl.centroid::geometry), ST_Y(c.location::geometry)) AS lat,
    COALESCE(ST_X(cl.centroid::geometry), ST_X(c.location::geometry)) AS lng,
    c.created_at,
    c.resolved_at,
    COALESCE(cl.complaint_count, 1) AS complaint_count,
    c.cluster_id
  FROM public.complaints c
  LEFT JOIN public.complaint_clusters cl ON c.cluster_id = cl.id
  WHERE c.status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'escalated')
    AND (c.cluster_id IS NULL OR cl.representative_id = c.id)
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_map_pins() TO anon, authenticated, service_role;

-- 8. Updated complaint popup RPC: Returns attestations list of other reports in this cluster
CREATE OR REPLACE FUNCTION public.get_complaint_details_with_attestations(target_id uuid)
RETURNS TABLE (
  id uuid,
  category text,
  severity int,
  status text,
  image_url text,
  address_text text,
  created_at timestamptz,
  lat float,
  lng float,
  complaint_count int,
  cluster_id uuid,
  attestations jsonb
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
    ST_X(c.location::geometry) AS lng,
    COALESCE(cl.complaint_count, 1) AS complaint_count,
    c.cluster_id,
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'created_at', m.created_at,
            'address_text', m.address_text,
            'image_url', m.image_url,
            'severity', m.severity
          ) ORDER BY m.created_at ASC
        ),
        '[]'::jsonb
      )
      FROM public.cluster_members cm
      JOIN public.complaints m ON m.id = cm.complaint_id
      WHERE cm.cluster_id = c.cluster_id AND m.id != c.id
    ) AS attestations
  FROM public.complaints c
  LEFT JOIN public.complaint_clusters cl ON c.cluster_id = cl.id
  WHERE c.id = target_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_complaint_details_with_attestations(uuid) TO anon, authenticated, service_role;

-- 9. Updated priority queue: Sorted by severity * weight, filtered to representative tickets
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
SET search_path = public, extensions
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
  WHERE (target_ward_id IS NULL OR c.ward_id = target_ward_id)
    AND c.status IN ('open', 'assigned', 'in_progress')
    AND (c.cluster_id IS NULL OR cl.representative_id = c.id)
  ORDER BY (c.severity * COALESCE(cl.complaint_count, 1)) DESC, COALESCE(cl.complaint_count, 1) DESC, c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_priority_queue(uuid) TO anon, authenticated, service_role;
