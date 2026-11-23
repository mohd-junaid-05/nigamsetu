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
- [x] Mobile-first camera capture component with image preview
- [x] Live GPS auto-detection with fallback manual location pin override
- [x] Category selector cards (Roads, Garbage, Sewage, School, Health, Other)
- [x] Optional voice note recording with Whisper STT integration (UI slot reserved for v2)
- [x] Image upload pipeline to Supabase Storage bucket
- [x] Submission API route (`POST /api/complaints`) creating complaint and calculating ward boundary

## Phase 04: Public map
- [x] Public map API endpoint (`GET /api/map/public`) returning lightweight JSON (`id`, `location`, `category`, `severity`, `status`, `created_at`) with no RLS restriction and zero sensitive PII
- [x] Lazy-loaded popup data endpoint (`GET /api/complaints/[id]/popup`) for on-demand fetch of thumbnail, address, and metadata without flooding initial map load
- [x] Full-viewport Leaflet map on `/map` (and embedded panel) using OpenStreetMap tiles with no external API keys required
- [x] Marker clustering with `Leaflet.markercluster`: clusters at zoom < 14 and individual pins with spidering and animation at zoom >= 14
- [x] Status-based pin colors: open (red), assigned (amber), in_progress (blue), verified (green), resolved unverified (grey)
- [x] Severity-based CSS scaling: emergency pins scaled larger than cosmetic pins without separate image assets
- [x] Lazy-loaded marker popup with thumbnail, category label, severity badge, status badge, reported date, address text, and conditional detail link for signed-in users
- [x] Interactive filter bar with multi-select category toggles, status toggles, and date range slider (last 7 / 30 / 90 / all days)
- [x] Real-time dynamic stats banner (total open complaints, resolved this month, average resolution time) calculated purely client-side from visible pin set
- [x] Dark mode tile inversion using CSS `filter: invert(1) hue-rotate(180deg) brightness(0.8)` on OSM tile layer while keeping pins and popups natural
- [x] PWA service worker tile caching for offline map viewing of previously viewed map regions

## Phase 05: AI Agent: Severity scoring
- [x] Core `CivicAgent` TypeScript class in `lib/agent/CivicAgent.ts` with strict decoupled architecture
- [x] `scoreSeverity` tool using Gemini 1.5 Flash Vision API on submitted complaint image
- [x] Visual evidence taxonomy: classify severity tier 1 to 4 with coherent reasoning string
- [x] Safe fallback handling: default to severity 2 on timeout, unparseable response, or blank image with raw response captured
- [x] Structured logging of tool execution, model (`gemini-1.5-flash`), input/output summaries, and latency into `agent_traces` table
- [x] Async background severity scoring pipeline (`POST /api/agent/severity` and lightweight status endpoint `GET /api/agent/severity`)
- [x] Real-time severity preview on `SuccessScreen` displaying semantic severity badge and reasoning without page refresh

## Phase 06: AI Agent: Duplicate clustering
- [x] `checkDuplicate` tool using spatial proximity query (PostGIS `ST_DWithin` 100m)
- [x] Perceptual image hashing / visual embedding comparison for same-scene matching
- [x] DBSCAN clustering algorithm grouping duplicate reports into one weighted ticket
- [x] Cluster attestation counter incrementing ticket priority for repeated complaints
- [x] Structured logging of duplicate clustering runs into `agent_traces`

## Phase 07: Official dashboard
- [x] 3-panel desktop-first controller layout (25% queue, 50% map, 25% details)
- [x] Priority queue table sorted by `severity * attestations * SLA breach risk` (Phase 7 strict: `severity DESC, weight DESC, created_at ASC`)
- [x] Ward-filtered map showing active tickets and municipal facility locations
- [x] Nearest facility routing tool using KNN PostGIS geospatial distance (`get_nearest_facilities` RPC & `/api/facilities/nearest`)
- [x] Facility assignment modal with status update to `assigned` (`/api/complaints/[id]/assign`)
- [x] Supabase Realtime subscription for live dashboard ticket updates without refresh (`useLiveComplaints`)

## Phase 08: Resolution upload and routing
- [x] Municipal contractor resolution upload endpoint (`POST /api/complaints/[id]/resolve`)
- [x] Repair proof photo upload to Supabase Storage at predictable path `resolutions/{id}/{timestamp}.jpg`
- [x] GPS proximity and timestamp validation against original complaint ("Location required for verification.")
- [x] Status transition to `resolved` (grey / unverified state until evidence verification)
- [x] Facility work log and timeline update (`complaint_activity_logs`)
- [x] Facility scoped view (`/facility`) with "In Progress" and "Mark Resolved" actions
- [x] Status transition enforcement (only `in_progress` -> `resolved` permitted; direct from `open` rejected)

## Phase 09: AI Agent: Resolution verification
- [x] `verifyResolution` tool in `CivicAgent` with 4 sequential verification checks (GPS proximity, timestamp ordering, perceptual hash fake detection, and Gemini Vision comparison)
- [x] Hard reject on GPS mismatch (> 100m) without invoking vision model
- [x] Perceptual hash check flagging re-uploaded before photos (Hamming distance < 5) as likely fake
- [x] Composite score calculation with documented, testable formula: `(gps_score * 0.2) + (hash_score * 0.3) + (vision_score * 0.5)`
- [x] Automatic status transitions based on composite score: `>= 0.75` auto-verifies (`verified`), `< 0.4` auto-returns to `in_progress`, `0.4-0.75` flags for manual review (`resolved`)
- [x] Side-by-side Before/After verification UI in official controller dashboard (`ComplaintDetailPanel`) with score bar and 4 check badges
- [x] Official override actions: "Verify & Close" (passes), "Reject & Reopen" (fails), and "Flag for Review" (manual)
- [x] Public map visual update: verified tickets render green pins; resolved unverified remain grey
- [x] Comprehensive audit trail logging all four individual checks, composite score metrics, and reasoning into `agent_traces` with "Why this score?" inspector modal

## Phase 10: AI Agent: Escalation autopilot
- [x] Automated SLA breach detection cron/checker for overdue complaints (`/api/agent/escalate/cron`)
- [x] Ghost closure detector flagging unverified fixes marked resolved without photo evidence or with failed verification
- [x] `generateEscalation` tool auto-generating formal RTI / Municipal Appeal letters with `pdf-lib` and Supabase Storage
- [x] Adapter pattern for state-specific municipal escalation letter formats (`MaharashtraRTITemplate`, `GeneralCommissionerTemplate`, `WardOfficerTemplate`)
- [x] Escalation queue view in official dashboard (`EscalationQueueTable`) and citizen detail page (`MyComplaintsList` "Escalation Letter" button)

## Phase 11: AI Agent: Chat panel
- [x] Official ward chat interface component in right dashboard panel (`ChatPanel` integrated into `DashboardController`)
- [x] `answerChat` tool allowing natural language queries about ward complaints
- [x] NL-to-SQL translation querying structured database rather than hallucinating
- [x] Structured data presentation with source citation links opening complaint detail view
- [x] Transparent collapsible display of structured SQL query executed before rendering response
- [x] Strict ward scoping (`WHERE ward_id = :official_ward_id`) and off-topic rejection guardrails

## Phase 12: Agent traces and transparency
- [x] Public and official transparency view for AI agent decisions
- [x] Audit trail panel showing all inputs, outputs, models, and timestamps from `agent_traces`
- [x] Step-by-step reasoning inspector for severity, duplicate clustering, and fix verification
- [x] Public auditability badge ensuring AI actions are evidence-derived

## Phase 13: Demo data and polish
- [ ] Comprehensive realistic seed script with real Indian ward scenarios (potholes, garbage, sewage)
- [ ] Five pre-verified before/after photo test pairs for live acceptance demo
- [ ] Dark/light mode theme audit across all pages and components
- [ ] Mobile PWA offline shell verification and standalone install test
- [ ] Final acceptance check verification across all 13 phases
