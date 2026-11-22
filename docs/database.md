# Spec 02: Database Schema & RLS

## Tables

### `profiles`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, ref auth.users | Clerk user ID |
| role | text | NOT NULL, check in ('citizen','official','admin') | Default 'citizen' |
| ward_id | uuid | FK -> wards.id, nullable | Officials only |
| phone | text | nullable | For citizen contact |
| created_at | timestamptz | DEFAULT now() | |

### `wards`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | text | NOT NULL | e.g., "Ward 42 - Shivajinagar" |
| boundary | geometry(Polygon, 4326) | NOT NULL | PostGIS polygon |
| city | text | NOT NULL | |
| state | text | NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |

### `facilities`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| ward_id | uuid | FK -> wards.id | |
| name | text | NOT NULL | e.g., "PWD Depot 3" |
| type | text | NOT NULL | 'road','sanitation','education','health','sewage' |
| location | geometry(Point, 4326) | NOT NULL | For KNN routing |
| contact_phone | text | nullable | |
| created_at | timestamptz | DEFAULT now() | |

### `complaints`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| reporter_id | uuid | FK -> profiles.id | |
| ward_id | uuid | FK -> wards.id | Computed from GPS |
| cluster_id | uuid | FK -> complaint_clusters.id, nullable | Set by duplicate agent |
| facility_id | uuid | FK -> facilities.id, nullable | Assigned by controller |
| category | text | NOT NULL | 'road','garbage','sewage','school','healthcenter','other' |
| severity | int | CHECK (1-4) | 1=cosmetic, 2=significant, 3=critical, 4=emergency |
| status | text | DEFAULT 'open' | 'open','assigned','in_progress','resolved','verified','escalated','rejected' |
| description | text | nullable | Voice transcript or text |
| image_url | text | NOT NULL | Supabase Storage path |
| location | geometry(Point, 4326) | NOT NULL | Citizen GPS |
| address_text | text | nullable | Reverse geocoded |
| sla_deadline | timestamptz | nullable | Computed: created_at + category SLA |
| resolved_at | timestamptz | nullable | |
| resolution_image_url | text | nullable | Facility uploads after fix |
| verification_score | float | nullable | 0-1 from AI agent |
| verification_status | text | nullable | 'pending','passed','failed' |
| escalation_letter_url | text | nullable | Generated PDF |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

### `complaint_clusters`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| representative_id | uuid | FK -> complaints.id | First / most severe |
| complaint_count | int | DEFAULT 1 | |
| centroid | geometry(Point, 4326) | NOT NULL | |
| bounding_radius | float | NOT NULL | meters |
| status | text | DEFAULT 'open' | Mirrors representative |
| created_at | timestamptz | DEFAULT now() | |

### `cluster_members`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| cluster_id | uuid | FK -> complaint_clusters.id | |
| complaint_id | uuid | FK -> complaints.id | |
| joined_at | timestamptz | DEFAULT now() | |
| PRIMARY KEY (cluster_id, complaint_id) | | | |

### `escalations`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| complaint_id | uuid | FK -> complaints.id | |
| trigger_reason | text | NOT NULL | 'sla_breach','verification_failed','ghost_closure' |
| letter_content | text | NOT NULL | Full generated letter |
| authority | text | NOT NULL | 'municipal_commissioner','ward_officer','rti' |
| deadline | date | NOT NULL | Submission deadline |
| status | text | DEFAULT 'draft' | 'draft','submitted','acknowledged','resolved' |
| created_at | timestamptz | DEFAULT now() | |

### `agent_traces`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| complaint_id | uuid | FK -> complaints.id, nullable | |
| tool_name | text | NOT NULL | 'severity_score','duplicate_check','verify_resolution','generate_escalation','chat_answer' |
| input_summary | jsonb | NOT NULL | Redacted input snapshot |
| output_summary | jsonb | NOT NULL | Result snapshot |
| model_used | text | NOT NULL | 'gemini-1.5-flash' etc |
| latency_ms | int | nullable | |
| created_at | timestamptz | DEFAULT now() | |

## Row-Level Security Policies

```sql
-- Enable RLS on ALL tables (default on, not per-table)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, officials see citizens in their ward
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_ward" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('official','admin')
    )
  );

-- Complaints: citizens see own + all on public map; officials see ward
CREATE POLICY "complaints_select_citizen" ON complaints
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR status IN ('open','assigned','in_progress') -- public map
  );

CREATE POLICY "complaints_select_official" ON complaints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('official','admin')
      AND (p.ward_id = complaints.ward_id OR p.role = 'admin')
    )
  );

CREATE POLICY "complaints_insert" ON complaints
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "complaints_update_reporter" ON complaints
  FOR UPDATE USING (reporter_id = auth.uid());

CREATE POLICY "complaints_update_official" ON complaints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('official','admin')
      AND (p.ward_id = complaints.ward_id OR p.role = 'admin')
    )
  );

-- Facilities: read-only for all authenticated, write admin only
CREATE POLICY "facilities_select" ON facilities FOR SELECT USING (auth.role() = 'authenticated');

-- Wards: read-only for all authenticated
CREATE POLICY "wards_select" ON wards FOR SELECT USING (auth.role() = 'authenticated');
```

## PostGIS Indexes

```sql
-- Essential for performance
CREATE INDEX idx_complaints_location ON complaints USING GIST(location);
CREATE INDEX idx_complaints_ward ON complaints(ward_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_cluster ON complaints(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_facilities_location ON facilities USING GIST(location);
CREATE INDEX idx_wards_boundary ON wards USING GIST(boundary);
CREATE INDEX idx_clusters_centroid ON complaint_clusters USING GIST(centroid);
```

## Key Queries

```sql
-- Nearest facility (KNN) for a complaint
SELECT f.id, f.name, f.type, f.contact_phone,
       ST_Distance(f.location::geography, c.location::geography) AS distance_m
FROM facilities f
WHERE f.type = c.category AND f.ward_id = c.ward_id
ORDER BY f.location <-> c.location
LIMIT 1;

-- Complaints within 100m (duplicate detection pre-filter)
SELECT id, location, image_perceptual_hash
FROM complaints
WHERE ST_DWithin(location::geography, target_point::geography, 100)
  AND category = target_category
  AND created_at > NOW() - INTERVAL '30 days';

-- Ward dashboard: open complaints ranked by severity x attestations
SELECT c.*, COALESCE(cl.complaint_count, 1) AS weight,
       CASE WHEN c.sla_deadline < NOW() THEN true ELSE false END AS sla_breached
FROM complaints c
LEFT JOIN complaint_clusters cl ON c.cluster_id = cl.id
WHERE c.ward_id = target_ward_id
  AND c.status IN ('open','assigned','in_progress')
ORDER BY c.severity DESC, weight DESC, c.created_at ASC;

-- Public map data (lightweight)
SELECT id, location, category, severity, status, created_at
FROM complaints
WHERE status IN ('open','assigned','in_progress','verified');
```
