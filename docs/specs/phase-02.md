# Phase 2 — Database and RLS

**Goal.** Every table exists, every row belongs to a ward, and the database silently refuses to return what the caller isn't allowed to see.

## Build

- **Migrations for all tables:** `profiles`, `wards`, `facilities`, `complaints`, `complaint_clusters`, `cluster_members`, `escalations`, `agent_traces`. PostGIS extension enabled.
- **Row-level security on every table.** Not most of them. Every single one. Default: deny all. Policies open up only what each role needs.
- **Policies for three roles:** citizen (see own complaints + public map data), official (see complaints in assigned ward), admin (see all + manage assignments).
- **PostGIS indexes** on every geometry column: `complaints.location`, `facilities.location`, `wards.boundary`, `complaint_clusters.centroid`.
- **RPC functions:** `get_ward_from_point` (point-in-polygon lookup), `increment_cluster_count`, `get_priority_queue` (severity x weight x age sorting).
- **Seed data for one demo city:** 3 wards with boundary polygons, 6 facilities with GPS points, 1 admin profile.

## Constraints

- **RLS is on by default, not per table.** A table with security enabled and no policy yet returns nothing, which is visible. A table where someone forgot to enable it returns everything, silently. The second one must be impossible rather than unlikely.
- **The database client carries the token.** Every query from the application layer includes the Clerk JWT in the Authorization header. If a query returns empty unexpectedly, the first thing to check is whether the token arrived.
- **No application-level authorization checks.** The application never asks "is this user allowed to see this?" It asks the database, and the database decides via the policy reading the token claim.
- Geometry columns use SRID 4326 (WGS84). All distance calculations use `::geography` casts. No raw coordinate math in application code.

## Acceptance check

1. Query the `complaints` table as an anonymous client. Get zero rows. Not an error -- zero rows.
2. Query as a citizen. Get only your own complaints plus the public map subset (status in 'open', 'assigned', 'in_progress').
3. Query as an official from Ward A. Get only complaints where `ward_id = Ward A`. Complaints from Ward B are absent, not hidden.
4. Query as admin. Get all complaints.
5. Run `get_ward_from_point` with GPS inside a seeded ward boundary. Returns the correct ward. Run it outside. Returns empty.
6. Every table responds to `\d+ tablename` in psql with `rowsecurity = on`.

## Not in this phase

Image storage buckets (Supabase Storage setup happens in Phase 3). Any AI integration. Any frontend beyond a query test page. The `profiles` table is created but population happens via a Clerk webhook or insert-on-first-signin, not a bulk import.

---
