# NigamSetu (निगमसेतु) — Comprehensive Project Summary

> **Bridging the Civic Trust Deficit via AI Verification, Geospatial PostGIS Intelligence, and Automated Statutory Accountability.**

---

## 1. Executive Overview

### 1.1 The Vision
**NigamSetu** (*Municipal Bridge*) is a production-grade civic complaints and infrastructure accountability platform engineered for Indian urban municipalities. Unlike conventional grievance portals that terminate at ticket logging, NigamSetu closes the loop from citizen submission to physical repair and verifiable resolution.

### 1.2 The Problem
Across India, civic grievance reporting suffers from an acute trust deficit:
- **Superficial "Ghost Closures":** Complaints are routinely marked "Resolved" by municipal contractors or officials without physical repairs ever taking place (e.g., closing tickets with recycled photos or arbitrary checkbox clicks).
- **Administrative Fragmentation:** High-volume platforms like Swachhata address sanitation, while broader infrastructure failures—perilous potholes, overflowing sewage, hazardous school ceilings, and non-functional primary health centers—remain scattered across unmonitored portals, physical registers, and WhatsApp channels.
- **Procedural Asymmetry:** When an issue is falsely closed or breaches statutory citizen charter timelines (SLAs), citizens rarely appeal because filing statutory Right to Information (RTI) petitions or formal municipal appeals requires legal knowledge, paperwork formatting, and tracking statutory deadlines.

### 1.3 The Golden Rule
Everything in NigamSetu rests on a single inviolable architectural rule:

$$\mathbf{Every\ verification\ comes\ from\ comparing\ the\ evidence,\ not\ from\ trusting\ the\ label.}$$

The system **never** marks a complaint resolved simply because an official or contractor checks a box. A resolution only passes when visual, temporal, and spatial evidence proves that the problem was physically rectified.

---

## 2. High-Level System Architecture

NigamSetu is engineered as a unified, full-stack Next.js 16 application with decoupled AI and database tiers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT LAYER                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────┐  │
│  │  Citizen PWA   │  │   Public Map   │  │    Official    │  │ Facility  │  │
│  │ (Camera + GPS) │  │ (/map Explorer)│  │   Dashboard    │  │  Depot    │  │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  └─────┬─────┘  │
└──────────┼───────────────────┼───────────────────┼─────────────────┼────────┘
           │                   │                   │                 │
           └───────────────────┼───────────────────┴─────────────────┘
                               │ HTTPS / JSON / WebSockets
┌──────────────────────────────▼──────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER & SERVER RUNTIME                      │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │ API Routes & Proxies  │  │ Clerk Role / Ward JWT │  │ Dynamic Layouts │  │
│  │ (/api/complaints,     │  │ Authentication        │  │ & SSR Views     │  │
│  │  /api/agent/*, etc.)  │  │ Middleware            │  │                 │  │
│  └──────────┬────────────┘  └───────────────────────┘  └─────────────────┘  │
│             │                                                               │
│             ├──────────────────────────────────────┐                        │
│             ▼                                      ▼                        │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │       CIVIC AGENT ENGINE            │  │  EMAIL & NOTIFICATION ENGINE │  │
│  │  (TypeScript, Google Gemini Vision) │  │  (Nodemailer / Direct SMTP)  │  │
│  │  • scoreSeverity                    │  │  • Real mail dispatch        │  │
│  │  • checkDuplicate (DBSCAN + pHash)  │  │  • Automated PII redaction   │  │
│  │  • verifyResolution (4-Check Model) │  └──────────────────────────────┘  │
│  │  • generateEscalation (PDF Appeal)  │                                    │
│  │  • answerChat (NL-to-SQL Assistant) │                                    │
│  └──────────────────┬──────────────────┘                                    │
└─────────────────────┼───────────────────────────────────────────────────────┘
                      │ Supabase Service / Authenticated RLS
┌─────────────────────▼───────────────────────────────────────────────────────┐
│                           SUPABASE DATA LAYER                               │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │   Postgres + PostGIS  │  │   Supabase Storage    │  │    Realtime     │  │
│  │  • GIST Spatial Index │  │  • Image assets       │  │  • Live Ticket  │  │
│  │  • RLS Security Core  │  │  • Repair proofs      │  │    Broadcast    │  │
│  │  • Automated Triggers │  │  • Generated PDFs     │  │    Updates      │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Technology Stack Summary

| Domain | Technology | Implementation Detail |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server Components by default, SSR metadata hydration, Edge/Node route handlers |
| **Authentication** | Clerk | Email & Google OAuth, JWT with custom session claims (`role`, `ward_id`), multi-persona support |
| **Database** | Supabase Postgres + PostGIS | Spatial geometry primitives, PostGIS KNN routing, GIST indexing, strict Row-Level Security (RLS) |
| **AI Vision & LLM** | Google Gemini 1.5 Flash / 2.5 Pro | Google AI SDK multimodal vision analysis, deterministic temperature settings, safe fallbacks |
| **Computer Vision** | `sharp` + 32x32 DCT-II | Server-side image resizing, luminance normalization, 64-bit perceptual hashing (pHash) |
| **Mapping & GIS** | Leaflet + OpenStreetMap | Interactive client-side map, cluster spidering, CSS dark-mode tile inversion, service worker tile caching |
| **Document Engine** | `pdf-lib` | Dynamic PDF generation of formal RTI appeals and statutory municipal grievance notices |
| **Styling & UI** | Tailwind CSS + shadcn/ui | Municipal authority color tokens, dark/light theme persistence, WCAG 2.2 AA accessibility |

---

## 3. Core Modules & Innovations

### 3.1 Citizen Reporting (Mobile-First PWA)
- **Zero Friction Capture:** Citizens submit complaints with immediate live device camera access, automated geolocation detection, and fallback map pin selection.
- **Categorical Taxonomy:** Classifies infrastructure into six functional sectors: Roads, Garbage, Sewage, School Infrastructure, Public Health Centers, and Other.
- **Immediate Confirmation:** Generates a unique tracking ID, provides live background AI severity status, and exposes a real-time progress timeline without app store downloads.

### 3.2 Public Transparency Map (`/map`)
- **Complete Civic Visibility:** Interactive, full-viewport Leaflet map plotting open (red), assigned (amber), in-progress (blue), and verified-resolved (green) civic issues.
- **Marker Clustering & Dynamic Scaling:** Uses Leaflet.markercluster to declutter dense urban zones while scaling pin dimensions based on complaint severity (emergency tickets stand out visually).
- **Client-Side Computed Metrics:** Zero-network-delay computation of active complaints, monthly resolved tickets, and average resolution times directly from the filtered viewport dataset.
- **PWA Offline Resilience:** Custom Service Worker (`nigamsetu-map-tiles-v1`) caches OpenStreetMap tiles for offline browsing.

### 3.3 The Civic AI Agent Engine (`lib/agent/CivicAgent.ts`)
The AI agent is a decoupled TypeScript class that interacts strictly through registered tools and logs every call into `agent_traces`.

```
                  ┌─────────────────────────────────────┐
                  │       CivicAgent Tool Registry      │
                  └──────────────────┬──────────────────┘
         ┌──────────────────┬────────┴─────────┬──────────────────┐
         ▼                  ▼                  ▼                  ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│  scoreSeverity  ││ checkDuplicate   ││ verifyResolution││generateEscalation│
│ (Multimodal AI) ││(DBSCAN + pHash) ││(4-Check Engine) ││ (Statutory PDF) │
└─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │   answerChat    │
                            │(NL-to-SQL Query)│
                            └─────────────────┘
```

#### 1. Severity Scoring (`scoreSeverity`)
- Analyzes submitted complaint photos using Gemini Vision.
- Assigns severity tiers from **Tier 1 (Cosmetic)** to **Tier 4 (Emergency / Hazard to Life)** with human-readable reasoning.
- Fallback resilience: Default to severity 2 on network timeouts or unparseable responses so submissions are never blocked.

#### 2. Duplicate Clustering (`checkDuplicate`)
- Detects recurring complaints for the same infrastructure failure.
- Computes spatial proximity using PostGIS `ST_DWithin` ($\le 100\text{ meters}$) combined with a 64-bit DCT-II perceptual hash (Hamming distance $< 15$).
- Merges duplicates into a primary cluster ticket while incrementing its attestation counter. This elevates the issue's priority in the official queue.

#### 3. Four-Check Resolution Verification (`verifyResolution`)
When a facility contractor submits repair evidence, the agent subjects the submission to a four-stage sequential verification:
1. **GPS Spatial Check:** Proximity must be $\le 100\text{ meters}$ from original complaint location. Failing this triggers immediate rejection without calling external vision models.
2. **Timestamp Sequence Check:** Resolution photo timestamp must strictly post-date the original report timestamp.
3. **Perceptual Hash Fraud Check:** Catches re-uploaded copies of the original complaint photo (Hamming distance $< 5$). If identical, it is flagged as a fake resolution attempt.
4. **Multimodal Vision Comparison:** Gemini evaluates structural repair quality between Before and After images.

**Composite Verification Formula:**
$$\text{Score} = (\text{GPS}_{\text{score}} \times 0.20) + (\text{pHash}_{\text{score}} \times 0.30) + (\text{Vision}_{\text{score}} \times 0.50)$$

- **Score $\ge 0.75$:** Auto-verified; ticket transitions to `verified` (green pin on map).
- **Score $< 0.40$:** Auto-rejected; returned to `in_progress`.
- **Score $0.40 - 0.74$:** Flagged for manual controller review.

#### 4. Escalation Autopilot (`generateEscalation`)
- Continuously monitors tickets for SLA breaches (e.g., Sewage: 12h, Garbage: 24h, Health: 48h, Roads: 72h, Schools: 168h) and ghost closures.
- Dynamically compiles a formal legal appeal PDF using `pdf-lib` based on statutory state templates (e.g., RTI Section 6(1) and Municipal Grievance Appeals).
- Auto-dispatches the complete dossier to municipal authorities via email while redacting citizen PII for privacy.

#### 5. Ward Natural Language Assistant (`answerChat`)
- Allows municipal officers to query their ward database in natural language (e.g., *"Show me open sewage complaints over 7 days old"*).
- Converts requests into structured JSON filters, executes programmatically with a hardcoded `ward_id`, and displays transparent SQL queries alongside clickable citation pills.

### 3.4 Official Controller Dashboard (`/dashboard`)
- **Three-Panel Layout:**
  1. *Priority Queue (Left):* Tickets ranked by $\text{Severity} \times \text{Cluster Weight} \times \text{SLA Urgency}$.
  2. *Geospatial Map (Center):* Shows ward boundary, open ticket markers, and municipal facility depots.
  3. *Detail & Verification Inspector (Right):* Side-by-side Before/After comparison, score breakdown, audit logs, and one-click facility routing.
- **PostGIS KNN Routing:** One-click assignment to nearest municipal facility using `ST_Distance(f.location::geography, c.location::geography)`.
- **Live Updates:** Real-time Supabase subscriptions sync ticket status changes instantly across controllers.

### 3.5 Facility Depot Crew Interface (`/facility`)
- Mobile-friendly portal scoped specifically to field depot workers.
- Allows crews to view assigned tasks, update status to `in_progress`, and upload resolution photo proofs with mandatory live GPS tagging.

### 3.6 AI Auditability & Transparency Portal (`/admin/traces`)
- Every execution of every AI tool is recorded in `agent_traces`.
- Auditors, officials, and citizens can inspect exact tool names, model versions, prompt parameters, raw outputs, response latencies, and execution timestamps.

### 3.7 Interactive Showcase & Presentation Engine (`/demo`)
- Built-in presentation engine at `/demo` with a timed 6-minute stage script.
- Features synchronized chapters, Web Speech API voice narration, audio toggles, and live interactive feature navigation.

---

## 4. Database Schema & Data Model

The PostgreSQL schema is fortified with PostGIS spatial extensions, automated trigger functions, and strict Row-Level Security (RLS).

```
                     ┌────────────────┐
                     │     wards      │
                     └───────┬────────┘
                             │ 1:N
           ┌─────────────────┼─────────────────┐
           ▼                                   ▼
    ┌──────────────┐                    ┌──────────────┐
    │  facilities  │                    │  complaints  │◄────┐
    └──────┬───────┘                    └──────┬───────┘     │ 1:N
           │ 1:N                               │ 1:N         │
           ▼                                   ▼             │
    ┌──────────────┐                    ┌──────────────┐     │
    │   profiles   │                    │ escalations  │     │
    └──────────────┘                    └──────────────┘     │
                                               │             │
                                               ▼             │
                                        ┌──────────────┐     │
                                        │ agent_traces │     │
                                        └──────────────┘     │
                                               │             │
                                               ▼             │
                                        ┌──────────────┐     │
                                        │cluster_membrs├─────┘
                                        └──────────────┘
```

### 4.1 Core Tables

1. **`wards`**: Municipal administrative divisions with PostGIS boundary polygons (`boundary geometry(Polygon, 4326)`).
2. **`facilities`**: Municipal contractor depots and physical yards with spatial point coordinates (`location geometry(Point, 4326)`).
3. **`profiles`**: User identities synchronized from Clerk (`id text PRIMARY KEY`), carrying roles (`citizen`, `official`, `facility`, `admin`) and ward/facility affiliations.
4. **`complaints`**: Core civic tickets containing PostGIS point location, image URLs, category, severity rating (1–4), status enum, SLA deadlines, and resolution metadata.
5. **`complaint_clusters` & `cluster_members`**: Spatial grouping of duplicate tickets with centroid geometry and aggregate attestation counters.
6. **`escalations`**: Formal statutory notices triggered by SLA breaches or failed verifications, linking generated PDF documents and target authority details.
7. **`agent_traces`**: Immutable audit logs of all AI tool executions, models, latencies, and inputs/outputs.
8. **`complaint_activity_logs`**: Complete chronological audit trail of all status transitions, facility assignments, and verification attempts.

### 4.2 Key Database Functions & Triggers
- `calculate_complaint_sla_deadline()`: Automated database trigger setting statutory deadlines based on category upon ticket creation.
- `trg_complaint_status_transition`: Enforces strict lifecycle transitions (`open` $\rightarrow$ `assigned` $\rightarrow$ `in_progress` $\rightarrow$ `resolved` $\rightarrow$ `verified`).
- `get_nearest_facilities()`: Executes PostGIS KNN queries to identify and rank closest category-matched municipal depots.
- `get_priority_queue()`: Computes multi-factor priority scores directly inside PostgreSQL for zero-latency dashboard sorting.

---

## 5. Municipal Deployment Context: Hyderabad (GHMC)

NigamSetu is configured for the **Greater Hyderabad Municipal Corporation (GHMC)**:

- **Key Wards Configured:**
  - **Ward 98:** Banjara Hills / Jubilee Hills (Focus: Major arterial road damage, drainage infrastructure).
  - **Ward 104:** Gachibowli / Financial District (Focus: High-density tech corridor, street illumination, sewage networks).
  - **Ward 22:** Charminar / Old City (Focus: Heritage conservation zones, sanitation, community health centers).
- **Depots & Contractors:** Pre-configured with dedicated municipal engineering depots, sanitary inspectors, and primary healthcare maintenance yards.
- **Showcase Routing & Redaction:** All automated escalations and notification emails route directly to official showcase evaluator mailboxes with full citizen PII redaction (`+91 ••••••••••`).

---

## 6. Phased Implementation Milestones

The project was executed across 14 discrete, verified phases:

```
Phase 01: Auth & Shell
    │ Clerk JWT authentication, theme switcher, responsive shell
Phase 02: Database & PostGIS
    │ 7 core tables, PostGIS extensions, RLS policies, spatial indexes
Phase 03: Complaint Submission
    │ PWA camera capture, live GPS auto-tagging, category picker
Phase 04: Public Map
    │ Leaflet engine, marker clustering, CSS dark mode tiles, offline cache
Phase 05: AI Severity Scoring
    │ CivicAgent class, Gemini vision taxonomy, trace audit logging
Phase 06: Duplicate Clustering
    │ PostGIS ST_DWithin + 32x32 DCT-II perceptual hash, cluster weighting
Phase 07: Official Dashboard
    │ 3-panel command center, KNN facility routing, live subscriptions
Phase 08: Resolution & Facility View
    │ Repair photo upload, GPS proximity validation, contractor view
Phase 09: Fix Verification Engine
    │ 4-check sequential model, composite scoring, Before/After UI
Phase 10: Escalation Autopilot
    │ SLA breach detection, statutory RTI PDF generation, mail dispatch
Phase 11: Ward Chat Assistant
    │ Natural language to SQL translator, execution transparency
Phase 12: Transparency & Traces
    │ Multi-facet trace filtering, step-by-step reasoning inspector
Phase 13: Demo Data & Polish
    │ Real Hyderabad ward scenarios, pre-verified photo test fixtures
Phase 14: UI Refinement & Design System
    │ Anthropic & Vercel design standards, anti-slop elimination, WCAG AA
```

---

## 7. Key Architectural Decisions Log

| Decision | Rationale |
|---|---|
| **Text IDs for Clerk Integration** | Clerk uses string user IDs (`user_...`); storing `profiles.id` as `text` avoids invalid UUID casting exceptions. |
| **Direct PostGIS SQL vs. ORM** | Spatial PostGIS queries (`ST_DWithin`, `KNN <->`, `ST_Contains`) are significantly faster and cleaner in raw SQL than Prisma/Drizzle. |
| **32x32 DCT-II pHash via `sharp`** | Avoided native C++ compilation dependencies while computing true 64-bit Hamming distances across platforms. |
| **Server-Side AI Execution** | All Gemini Vision and LLM calls run strictly in server API routes; zero API keys or model tokens exist in browser bundles. |
| **Safe Fallback Defaults** | AI timeouts gracefully default to severity 2; complaint registration and civic processes are never blocked by model errors. |
| **Two-Step NL-to-SQL Architecture** | Converts queries to JSON filters, programmatically generates SQL with hardcoded `ward_id`, preventing SQL injection and data leakage. |
| **Strict RLS on Every Table** | RLS is enabled by default across all tables; requests without valid credentials return zero rows rather than leaking data. |

---

## 8. Summary Conclusion

NigamSetu transforms civic governance from an opaque, administrative black box into an **open, evidence-verified, and automated civic accountability bridge**. By systematically replacing unverified status checkboxes with verifiable multimodal AI audits, PostGIS geospatial intelligence, and automated statutory escalations, it restores the foundational element missing from modern civic technology: **trust**.
