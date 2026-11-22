# Progress Tracker

## Phase 01: Auth and shell
- [x] Integrate Clerk Authentication with Email and Google OAuth (phone OTP removed)
- [x] Configure Next.js 16 proxy/middleware to protect routes (`/dashboard`, `/report`, `/complaint/*`)
- [x] Read `role` and `ward_id` claims during server rendering without hydration delay
- [x] Implement system/light/dark theme switcher with zero-flash inline script
- [x] Build application shell for all 3 entry points (public map, mobile-first report, desktop-first dashboard)
- [x] Setup PWA manifest, service worker, and icons for standalone mobile `/report`
- [x] Create Supabase client wrapper with Clerk token injection (single-session model)
- [x] Validate environment variables on startup with strict Zod schema
- [x] Implement admin promotion API endpoint to assign role and ward in user metadata
- [x] Configure `@clerk/nextjs` Core 3 `<Show>` control components wrapped in `<Suspense>`

## Phase 02: Database and RLS
- [x] PostGIS extension initialization and schema migration
- [x] Migration: 7 core tables (`profiles`, `wards`, `facilities`, `complaints`, `complaint_clusters`, `cluster_members`, `escalations`, `agent_traces`)
- [x] Row-Level Security on all tables with policies reading Clerk JWT claims (`auth.uid()`, `role`, `ward_id`)
- [x] PostGIS spatial GIST indexes on locations, ward boundaries, and cluster centroids
- [x] RPC functions for geospatial lookups (`get_ward_from_point`, `increment_cluster_count`, `get_priority_queue`)
- [x] Seed script for demo wards, facilities, and initial profiles

## Phase 03: Complaint submission
- [ ] Mobile-first camera capture component with image preview
- [ ] Live GPS auto-detection with fallback manual location pin override
- [ ] Category selector cards (Roads, Garbage, Sewage, School, Health, Other)
- [ ] Optional voice note recording with Whisper STT integration
- [ ] Image upload pipeline to Supabase Storage bucket
- [ ] Submission API route (`POST /api/complaints`) creating complaint and calculating ward boundary

## Phase 04: Public map
- [ ] Leaflet map view with OpenStreetMap tile layer and dark mode inversion
- [ ] PostGIS pin rendering with cluster marker group at zoom < 14 and individual pins at zoom >= 14
- [ ] Marker popups showing category, thumbnail, status color badge, and timestamp
- [ ] Color-coded status filter bar (Open, Assigned, In Progress, Resolved, Verified, Escalated)
- [ ] Severity indicator pills (Cosmetic, Significant, Critical, Emergency)
- [ ] Ward-level statistics banner (open issues, verified this month, average fix time)

## Phase 05: AI Agent: Severity scoring
- [ ] Core `CivicAgent` TypeScript class in `lib/agent/CivicAgent.ts`
- [ ] `scoreSeverity` tool using Gemini Vision API on submitted complaint image
- [ ] Visual evidence taxonomy: classify severity tier 1 to 4 with reasoning string
- [ ] Safe fallback handling: default to severity 2 on timeout or API error
- [ ] Structured logging of tool execution, model, and latency into `agent_traces` table

## Phase 06: AI Agent: Duplicate clustering
- [ ] `checkDuplicate` tool using spatial proximity query (PostGIS `ST_DWithin` 100m)
- [ ] Perceptual image hashing / visual embedding comparison for same-scene matching
- [ ] DBSCAN clustering algorithm grouping duplicate reports into one weighted ticket
- [ ] Cluster attestation counter incrementing ticket priority for repeated complaints
- [ ] Structured logging of duplicate clustering runs into `agent_traces`

## Phase 07: Official dashboard
- [ ] 3-panel desktop-first controller layout (25% queue, 50% map, 25% details)
- [ ] Priority queue table sorted by `severity * attestations * SLA breach risk`
- [ ] Ward-filtered map showing active tickets and municipal facility locations
- [ ] Nearest facility routing tool using KNN PostGIS geospatial distance
- [ ] Facility assignment modal with status update to `assigned`
- [ ] Supabase Realtime subscription for live dashboard ticket updates without refresh

## Phase 08: Resolution upload and routing
- [ ] Municipal contractor resolution upload endpoint (`POST /api/complaints/[id]/resolve`)
- [ ] Repair proof photo upload to Supabase Storage
- [ ] GPS proximity and timestamp validation against original complaint
- [ ] Status transition to `resolved` (grey / unverified state until evidence verification)
- [ ] Facility work log and timeline update

## Phase 09: AI Agent: Resolution verification
- [ ] `verifyResolution` tool using Gemini Vision to compare before/after images
- [ ] Pure mathematical alignment check: GPS distance threshold and timestamp ordering
- [ ] AI similarity score calculation (0.0 to 1.0)
- [ ] Auto-confirmation to `verified` (green) if score exceeds threshold
- [ ] Auto-rejection to `in_progress` if score is below 0.4 with reason logged
- [ ] Manual override action for official and citizen appeal

## Phase 10: AI Agent: Escalation autopilot
- [ ] Automated SLA breach detection cron/checker for overdue complaints
- [ ] Ghost closure detector flagging unverified fixes marked resolved without photo evidence
- [ ] `generateEscalation` tool auto-generating formal RTI / Municipal Appeal letters
- [ ] Adapter pattern for state-specific municipal escalation letter formats
- [ ] Escalation queue view in official dashboard and citizen detail page

## Phase 11: AI Agent: Chat panel
- [ ] Official ward chat interface component in right dashboard panel
- [ ] `answerChat` tool allowing natural language queries about ward complaints
- [ ] NL-to-SQL translation querying structured database rather than hallucinating
- [ ] Structured data table and chart presentation of query answers
- [ ] Transparent display of structured SQL query executed before rendering response

## Phase 12: Agent traces and transparency
- [ ] Public and official transparency view for AI agent decisions
- [ ] Audit trail panel showing all inputs, outputs, models, and timestamps from `agent_traces`
- [ ] Step-by-step reasoning inspector for severity, duplicate clustering, and fix verification
- [ ] Public auditability badge ensuring AI actions are evidence-derived

## Phase 13: Demo data and polish
- [ ] Comprehensive realistic seed script with real Indian ward scenarios (potholes, garbage, sewage)
- [ ] Five pre-verified before/after photo test pairs for live acceptance demo
- [ ] Dark/light mode theme audit across all pages and components
- [ ] Mobile PWA offline shell verification and standalone install test
- [ ] Final acceptance check verification across all 13 phases
