# NigamSetu (निगमसेतु) — AI-Verified Civic Complaint & Fix Platform

NigamSetu is a next-generation municipal governance platform that introduces an evidence-based AI verification layer to municipal complaint redressal. Rather than trusting unverified contractor claims, NigamSetu enforces a zero-trust model where civic closures must be mathematically substantiated through PostGIS GPS proximity, perceptual image hash (pHash) tamper-detection, and multimodal Gemini Vision before a ticket can be marked verified. With automated DBSCAN duplicate clustering, statutory SLA breach escalation autopilot drafting formal RTI appeal letters, and full public audit traces for every AI decision, NigamSetu bridges the trust deficit between citizens and urban local bodies.

---

## Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components by default, Strict TypeScript)
- **Database & Spatial Engine**: Supabase Postgres with PostGIS extension (GIST spatial indexes, KNN nearest facility routing, DBSCAN clustering)
- **Authentication & RBAC**: Clerk Core 3 with custom JWT claims (`role`: `citizen` | `official` | `admin` | `facility`, `ward_id`)
- **Row-Level Security (RLS)**: Strict database-level isolation enforcing tenant and ward boundaries
- **AI Intelligence**: Google Gemini API (`gemini-1.5-flash` for instant severity scoring, `gemini-1.5-pro` for 4-check resolution verification & NL-to-SQL ward chat)
- **Image Processing**: Perceptual 64-bit DCT hashing (`sharp`) for instant fake/duplicate image detection
- **Document Generation**: `pdf-lib` for statutory RTI and Municipal Appeal letter generation
- **Mapping**: Leaflet + OpenStreetMap with custom marker clustering, offline PWA tile caching, and semantic status pins

---

## Core System Features

1. **Mobile-First Citizen PWA (`/report`)**:
   - Camera capture with live client-side compression (<10MB)
   - Auto-GPS geocoding with reverse address lookup and PostGIS ward boundary matching
   - Real-time Gemini Vision severity scoring (Tiers 1 to 4) with instant badge feedback
   - "My Complaints" tracking dashboard with live status indicators

2. **Public Infrastructure Map (`/map`)**:
   - 50+ interactive pins across Bengaluru wards (Bellandur, HSR Layout, Koramangala)
   - Semantic pin colors: Green (Verified Fix), Red (Open), Amber (Assigned), Blue (In Progress), Grey (Unverified Resolution)
   - Cluster badges displaying aggregate complaint counts for repeated issues
   - Multi-facet filter bar (category, status, date slider) and live dynamic metrics banner

3. **Official Controller Command Center (`/dashboard`)**:
   - Desktop-first 3-panel layout: Priority Queue (25%), Interactive Ward Map (50%), Details Panel (25%)
   - Automated priority calculation: `Severity × Attestations × SLA Breach Risk`
   - PostGIS KNN routing assigning tickets to nearest municipal depot (PWD, Sanitation, BWSSB)
   - Real-time Supabase subscriptions updating tickets live on dispatch and status change

4. **AI Resolution Fix Verification & Anti-Fraud Layer**:
   - 4-step sequential verification when contractor uploads resolution proof:
     1. **GPS Threshold**: Hard reject if repair photo is >100m from original defect
     2. **Timestamp Ordering**: Ensures repair was performed after complaint creation
     3. **Perceptual Hash Fake Detection**: Flags re-uploaded "before" photos (Hamming distance < 5)
     4. **Multimodal Gemini Vision**: Compares before/after imagery to confirm genuine repair
   - Composite scoring: `(GPS × 0.2) + (Hash × 0.3) + (Vision × 0.5)`
   - Status auto-routing: `>= 0.75` (Verified), `< 0.40` (Auto-reopened to In Progress), `0.40 - 0.75` (Flagged for Review)

5. **Escalation Autopilot (`/api/agent/escalate`)**:
   - Background SLA monitoring against Citizen Charter statutory limits (Sewage 12h, Garbage 24h, Road 72h)
   - Auto-generates formal RTI Application / Commissioner Appeal PDF letters
   - Stored in Supabase Storage with download link for citizen and official tracking

6. **Natural Language Ward Chat**:
   - Embedded NL-to-SQL copilot in official dashboard
   - Translates natural questions into parameterized SQL with strict `ward_id` isolation
   - Returns cited ticket cards opening directly in the detail inspector with collapsible SQL audit trail

7. **Transparent AI Traces & Audit Inspector (`/admin/traces`)**:
   - Every AI invocation (`scoreSeverity`, `checkDuplicate`, `verifyResolution`, `generateEscalation`, `answerChat`) logged to `agent_traces`
   - "Why this score?" inspector showing prompt, raw JSON, model name, and execution latency

---

## Environment Variables

Create `.env.local` in the project root:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase Database & PostGIS
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>

# Google Gemini AI
GOOGLE_AI_API_KEY=<gemini-api-key>
```

---

## Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Database Migrations
Migrations are standard SQL scripts located in `supabase/migrations/`:
```bash
# Apply migrations sequentially via Supabase CLI or Supabase Dashboard SQL Editor
20260301000000_phase_02_schema_and_rls.sql
20260302000000_phase_03_storage_and_helpers.sql
20260303000000_phase_04_public_map.sql
20260304000000_phase_05_agent_traces_tool_names.sql
20260305000000_phase_06_duplicate_clustering.sql
20260306000000_phase_07_official_dashboard.sql
20260307000000_phase_08_resolution_routing.sql
20260308000000_phase_09_resolution_verification.sql
20260309000000_phase_10_escalation_autopilot.sql
20260310000000_phase_11_agent_chat.sql
20260311000000_phase_12_agent_traces_and_transparency.sql
```

### 3. Seed Demo Data & Personas
Run the automated seed scripts to populate 36 realistic complaints, ghost closures, clusters, SLA breaches, and pre-seeded Clerk accounts:
```bash
# Seed Clerk demo accounts
pnpm exec tsx --env-file=.env.local scripts/seed-clerk-personas.ts

# Seed 36 complaints, ghost closures, clusters, and agent audit traces
pnpm exec tsx --env-file=.env.local scripts/seed-phase-13-data.ts
```

### 4. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Pre-seeded Demo Persona Accounts

For live testing and presentation on stage, use any of these pre-seeded accounts (password for all: `DemoPassword2026!`):

| Persona | Email | Role | Ward / Scope | Key Showcase Screen |
|---|---|---|---|---|
| **Citizen** | `demo.citizen@nigamsetu.gov.in` | `citizen` | City-wide | `/report` (My Complaints, 4 real tickets) |
| **Official (Bellandur)** | `demo.official.bellandur@nigamsetu.gov.in` | `official` | Ward 150 - Bellandur | `/dashboard` (SLA breaches, 4x cluster) |
| **Official (HSR Layout)** | `demo.official.hsr@nigamsetu.gov.in` | `official` | Ward 174 - HSR Layout | `/dashboard` (Ghost closures, NL chat) |
| **Official (Koramangala)** | `demo.official.koramangala@nigamsetu.gov.in` | `official` | Ward 112 - Koramangala | `/dashboard` (Sewage leaks, facility routing) |
| **Admin Controller** | `demo.admin@nigamsetu.gov.in` | `admin` | Global BBMP | `/admin/traces` (Full system audit logs) |

---

## 6-Minute Live Stage Demo Script

| Time | Segment | Screen | Key Actions & Narration |
|---|---|---|---|
| **0:00 - 0:30** | **Opening** | `/demo` or `/map` | The Civic Trust Crisis: Explain why municipal complaints in India suffer from "ghost closures" (contractors marking work done without physical remediation). |
| **0:30 - 2:00** | **Citizen Report** | `/report` | Mobile PWA flow: Snap photo, GPS auto-boundary to Ward 150 Bellandur, Gemini Vision scores severity 3 with real-time reasoning. Show DBSCAN cluster grouping. |
| **2:00 - 3:30** | **Official Dashboard** | `/dashboard` | Command Center: Triage priority queue weighted by attestations and SLA breach risk. Assign ticket using PostGIS KNN nearest facility routing. |
| **3:30 - 5:00** | **Verification Moment** | `/dashboard` | Contractor uploads resolution photo. 4-step AI verification rejects fake closure (GPS mismatch >100m or duplicate before photo hash). Click "Why this score?" to inspect trace. |
| **5:00 - 6:00** | **Escalation & Chat** | `/dashboard` | Overdue sewage ticket triggers auto-generated RTI appeal PDF. Ask Ward Chat "Which potholes are pending over 48 hours?" and show transparent SQL execution. |
| **6:00 - 6:30** | **Closing** | `/map` | Show green verified pins on the public map. Explain how evidence-based governance restores citizen confidence. |

---

## Verification & Acceptance Tests

To verify all system criteria programmatically:
```bash
# Phase 12 Agent Traces & Transparency Test
pnpm exec tsx scripts/verify-phase-12.ts

# Phase 13 Acceptance & Data Integrity Test
pnpm exec tsx --env-file=.env.local scripts/verify-phase-13.ts
```
