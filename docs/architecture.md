# Spec 01: System Architecture

## Data Flow (end-to-end)

Citizen (PWA or WhatsApp voice) -> photo + GPS + category -> POST /api/complaints -> Supabase insert -> AI agent trigger (severity + duplicate check) -> severity score stored -> duplicate cluster merged or new ticket created -> public map updates -> official dashboard receives priority-ranked queue -> controller assigns to facility -> facility fixes -> marks resolved -> AI verification trigger (before/after comparison) -> score above threshold: map turns green -> score below threshold: back to facility OR citizen override -> SLA breach or ghost closure: escalation autopilot generates letter -> deadline tracker starts

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack in one codebase, API routes colocated, PWA support via next-pwa |
| Auth | Clerk | Phone OTP + email out of the box, JWT with custom claims for ward/role, RLS-friendly |
| Database | Supabase Postgres + PostGIS | Free tier, geospatial queries built-in, realtime subscriptions for live map updates |
| ORM / Client | Supabase JS client + raw SQL for geo | RLS policies handle authorization; no ORM abstraction needed for PostGIS |
| Styling | Tailwind CSS + shadcn/ui | Rapid component assembly, consistent design system |
| Maps | Leaflet + React-Leaflet + OpenStreetMap | Free, no API key, offline tile caching possible |
| AI Agent | TypeScript class with tool definitions, Gemini 1.5 Flash via Google AI SDK | Free tier generous, multimodal (image + text), fast enough for real-time severity scoring |
| Image Processing | sharp (server-side resize), perceptual-hash (duplicate detection), CLIP embeddings via transformers.js (verification) | All run server-side or at the edge; no external ML service dependency for core flows |
| Notifications | Supabase Realtime (in-app) + Twilio (SMS/WhatsApp sandbox) | Realtime for dashboard live updates; Twilio for facility alerts |
| Voice | Whisper API (STT) + Google Cloud Text-to-Speech or Coqui TTS | Voice input for low-literacy users; v1 can skip TTS and use pre-recorded status messages |
| Deployment | Vercel (frontend + API routes) | Zero-config deploy, edge functions for agent calls, fits hackathon timeline |

## Architecture Diagram (text)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Citizen PWA   │  │ Public Map    │  │ Official     │                  │
│  │ (Submit photo │  │ (View status) │  │ Dashboard    │                  │
│  │  + GPS)       │  │               │  │ (Queue +     │                  │
│  │               │  │               │  │  assignment) │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼─────────────────┼─────────────────┼──────────────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼─────────────────────────────────────────────┐
│                        NEXT.JS APP ROUTER                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ /api/      │ │ /api/      │ │ /api/      │ │ /api/              │   │
│  │ complaints │ │ agent/     │ │ dashboard  │ │ escalation         │   │
│  │ (CRUD)     │ │ severity   │ │ (authz)    │ │ (generate)         │   │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────────┬──────────┘   │
│        │              │              │                  │               │
│        └──────────────┼──────────────┼──────────────────┘               │
│                       │              │                                  │
│              ┌────────▼──────────────▼──────────┐                      │
│              │      AI AGENT (TypeScript)        │                      │
│              │  ┌──────────┐ ┌──────────┐       │                      │
│              │  │ Severity │ │ Duplicate│       │                      │
│              │  │ Tool     │ │ Tool     │       │                      │
│              │  └──────────┘ └──────────┘       │                      │
│              │  ┌──────────┐ ┌──────────┐       │                      │
│              │  │ Verify   │ │ Escalate │       │                      │
│              │  │ Tool     │ │ Tool     │       │                      │
│              │  └──────────┘ └──────────┘       │                      │
│              │  ┌──────────┐                     │                      │
│              │  │ Chat     │                     │                      │
│              │  │ Tool     │                     │                      │
│              │  └──────────┘                     │                      │
│              └────────┬──────────────────────────┘                      │
└───────────────────────┼─────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────────────┐
│                        DATA LAYER                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Supabase Postgres │  │ Supabase Storage  │  │ Supabase         │      │
│  │ + PostGIS         │  │ (images)          │  │ Realtime         │      │
│  │ (complaints,      │  │                   │  │ (live updates)   │      │
│  │  users, wards)    │  │                   │  │                  │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                         │
│  RLS Policies:                                                          │
│  - Citizens: see own complaints + public map                            │
│  - Officials: see complaints in assigned ward(s)                        │
│  - Admins: see all + manage assignments                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **Agent runs server-side, not client-side.** The LLM call and tool execution happen in Next.js API routes. The client sends data, receives results. No API keys in the browser.

2. **Image processing is two-stage.** Stage 1: sharp resizes and compresses for storage. Stage 2: the agent receives a URL and fetches the image for its vision call. No image bytes pass through the LLM prompt directly.

3. **Duplicate detection is DBSCAN + perceptual hash, not LLM.** The LLM is the brain for reasoning tasks. Clustering is arithmetic and belongs in code. The agent calls the clustering tool; it does not implement it.

4. **Escalation letters are generated, not sent.** The agent drafts the letter; the citizen or an NGO worker submits it. This avoids the unsolved problem of direct government portal integration while still delivering value.

5. **PostGIS handles all geospatial logic.** Nearest facility, complaints within radius, ward boundaries -- all SQL. No geospatial library in the application layer.

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_AI_API_KEY=
TWILIO_ACCOUNT_SID=       # optional, v1
TWILIO_AUTH_TOKEN=        # optional, v1
```
