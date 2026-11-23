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
- [x] Comprehensive realistic seed script with real Indian ward scenarios (potholes, garbage, sewage)
- [x] Five pre-verified before/after photo test pairs for live acceptance demo
- [x] Dark/light mode theme audit across all pages and components
- [x] Mobile PWA offline shell verification and standalone install test
- [x] Final acceptance check verification across all 13 phases

## Phase 14: UI/UX Refinement, Design System & AI-Slop Elimination
- [x] Design intelligence and skill preparation: Installed lightweight Anthropic (`frontend-design`) and Vercel (`web-design-guidelines`, `building-components`) skills; conducted research foundation audit in `docs/design-system-audit.md`
- [x] Complete UI audit across all 5 roles (citizen, official, facility, admin, public) and all routes (`/`, `/report`, `/map`, `/dashboard`, `/facility`, `/admin/traces`, `/demo`)
- [x] AI-slop elimination: Stripped excessive gradients, glowing blobs, neon drop shadows, bloated nested cards, and robotic copy; established restrained, authoritative municipal civic palette
- [x] Design system standardization: Refined `app/globals.css` with semantic color tokens, WCAG 2.2 AA contrast compliance (>= 4.5:1 text, >= 3:1 controls), 4px grid spacing, and `@media (prefers-reduced-motion: reduce)` rules
- [x] App shell and navigation: Aligned `AppHeader` with clean role pills, high-contrast links, and mobile-friendly secondary navigation bar without decorative badge spam
- [x] Citizen experience refinement: Streamlined `/report` flow (`CategorySelector`, `CameraCapture`, `LocationPicker`, `SuccessScreen`, `MyComplaintsList`) with >= 48px touch targets, monospaced coordinate badges, and preserved all `data-testid` attributes
- [x] Public map & metrics: Modernized `/map` (`MapStatsBanner`, `MapFilterBar`, `MapLegend`, `PublicMapContainer`) with high-contrast metric typography, clean filter chips, and accessible OSM dark-mode tile rendering
- [x] Official operations & dashboard: Standardized `/dashboard` 3-panel layout (`PriorityQueueTable`, `ComplaintDetailPanel`, `EscalationQueueTable`, `ChatPanel`, `AssignmentModal`) with dense tabular rows, clickable citation pills `[#id]`, and before/after verification evidence cards
- [x] Depot & facility workflow: Polished `/facility` (`FacilityView`, `ResolutionModal`) with tactile workflow actions (Start Work, Upload Proof), 10MB file validation, and GPS capture
- [x] Administrator transparency view: Refined `/admin/traces` (`AdminTracesView`, `VerificationTraceModal`) with multi-facet filters, tool-specific payload previews, and one-click JSON clipboard export
- [x] Live presentation deck: Polished `/demo` presentation runner with synchronized speech synthesis, clean chapter tabs, and cheat sheet cards
- [x] Functional preservation & zero-regression build: Verified Next.js 16 Turbopack production build compiles with zero TypeScript errors and all API route contracts, database policies, PostGIS queries, and AI algorithms 100% intact


## Phase 15: Government-Grade Visual Redesign (Blog-Inspired)
- [x] Deep research on Utah.gov, GOV.UK, NASA.gov, Georgia.gov, Colorado.gov, Oregon.gov design systems — extracted exact color palettes, typography scales, navigation patterns, hero formulas, card styles, and trust signal patterns
- [x] Upgraded `app/globals.css` design tokens: Utah.gov civic navy (`#071D49`), GOV.UK primary blue (`#1d70b8`), Utah gold accent (`#FFB81D`), GOV.UK success green (`#00703c`), GOV.UK error red (`#d4351c`); added `.civic-hero`, `.metric-pill`, `.task-card`, `.gold-accent-bar`, `.section-band-alt`, `.civic-stat`, and `.gov-phase-banner` utility classes
- [x] AppHeader redesigned with 2-tier GOV.UK pattern: slim `#0b0c0c` utility identity bar (official municipal portal declaration) + main `#071D49` Utah.gov navy nav bar with `#FFB81D` bottom accent border and gold CTA "Demo" pill
- [x] Home page fully replaced with Utah.gov-style immersive civic hero: deep navy overlay with SVG texture, gold accent bar + H1 "Report. Track. Verify Fixed." at display scale, NASA-style glassmorphism metric pills, two primary CTAs (gold Report Issue + frosted View Map)
- [x] Colorado.gov-style "How It Works" section: 6-step modular banding (alternating `section-band-alt`), numbered step cards with navy badge icons
- [x] GOV.UK task grid: 6 service access cards with icon, description, and chevron CTA; "Report an Issue" card highlighted with gold ring; task-card hover = navy border + 3px ring
- [x] Live map preview section with gov-style sub-header and navy "Full Map" action button
- [x] Utah.gov-style trust band with 4 civic pillars (Evidence-Based, Fully Auditable, SLA Tracked, Multi-Role) on dark navy background with gold icons
- [x] MapStatsBanner redesigned: single dark navy bar (`#071D49`) with divided metric columns, white typography, and colored metric icons — matches Georgia.gov-style dashboard header stats
- [x] MapFilterBar updated: navy selected chip state (`#071D49` bg for selected categories), GOV.UK-style "Select All" links in civic blue, navy date range selected button
- [x] DashboardController header replaced: full-width gov command bar with ward name, Realtime badge, Refresh, AI Traces shortcut; mobile tab switcher uses navy active state; panel headers use navy panel sub-tabs
- [x] Admin Traces page: Utah.gov-style dark nav header added with "AI Transparency & Accountability" eyebrow + H1 "Agent Audit Trace Centre"
- [x] Facility Depot page: navy header added with "Municipal Facility Operations" eyebrow + H1 "Depot Work Order Dashboard"
- [x] Map page: breadcrumb nav (Home > Public Map) added inside navy header with MapPin icon — matches Georgia.gov interior page pattern
- [x] Citizen Report flow (`app/report/page.tsx`): Utah/GOV.UK-style navy header with breadcrumbs (`Home > Report Issue`), civic evidence notice box, high-contrast segmented navigation, and GOV.UK-green submit button (`#00703c`)
- [x] Category selection (`components/complaints/CategorySelector.tsx`): high-contrast authoritative navy focus/selection border ring
- [x] Priority queue & escalations (`PriorityQueueTable.tsx`, `EscalationQueueTable.tsx`): data-table status filter tabs, active row border accents, and action triggers aligned with gov palette
- [x] Facility view (`components/facility/FacilityView.tsx`): high-contrast status tabs, tactical "Start Work" and "Upload Proof & Resolve" buttons aligned with gov standards
- [x] Chat panel (`components/dashboard/ChatPanel.tsx`): civic navy focus rings and high-contrast query dispatch button
- [x] Hero Background & Resource Imagery: Integrated authentic Indian municipal cityscape (`/images/hero-cityscape.webp`) as hero background with dual-mode dark wash; added 6-sector infrastructure photo showcase (`category-road`, `category-garbage`, `category-sewage`, `category-school`, `category-health`, `civic-action`)
- [x] Lucide Icons Standardization: Systematically eliminated all remaining emoji strings (`🛣️`, `🗑️`, `🚰`, `🏫`, `🏥`, `📦`) across `MapFilterBar`, `PriorityQueueTable`, and `PublicMapClient`, replacing them with pure Lucide SVG components (`Construction`, `Trash2`, `Droplets`, `GraduationCap`, `HeartPulse`, `HelpCircle`)
- [x] Frosted Aura Palette & Dark Mode: Integrated `--frosted-teal` (`#5C7E8F`), `--frosted-gray` (`#A2A2A2`), and `--frosted-ice` (`#D4DDE2`) tokens; replaced white with true black (`#000000` / `#080c12`) in dark mode across all headers, cards, and page shells
- [x] Build verified: Next.js 16 Turbopack production build passes with zero TypeScript errors (32/32 routes compiled)
