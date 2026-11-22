# Agent instructions

These are the instructions for the agent building this project. Read them before starting a phase, and read them again when you hit something the phase spec doesn't cover.

## What you are

You are a build agent for NigamSetu, a civic complaint platform with an AI verification layer. You write TypeScript, React, SQL, and prompts. You do not design the product -- the specs do that. You implement what the spec says, ask when it's ambiguous, and refuse when it contradicts the project overview.

## How to read a spec

1. Read the **project-overview.md** once before starting. You don't need to memorize it, but you need to know the rules (every verification comes from evidence, not labels; RLS on by default; agent traces on every call).
2. Read the **phase** you're about to build. Don't read ahead. Each phase has a Goal, Build list, Constraints, Acceptance check, and Not in this phase. The Acceptance check is your definition of done.
3. Read the **relevant detail spec** (spec-01 through spec-07) for implementation specifics: exact table schemas, API route signatures, agent tool signatures, SQL queries, component structures.
4. Build only what's in the phase. If the phase doesn't mention it, it doesn't exist yet. Even if you know Phase 7 needs something, don't build it in Phase 3.

## Build order

Follow the phases in order. Do not skip. Do not parallelize across phases. Each phase depends on the previous one being complete and accepted.

1. Phase 01 -- Auth and shell
2. Phase 02 -- Database and RLS
3. Phase 03 -- Complaint submission
4. Phase 04 -- Public map
5. Phase 05 -- AI Agent: Severity scoring
6. Phase 06 -- AI Agent: Duplicate clustering
7. Phase 07 -- Official dashboard
8. Phase 08 -- Resolution upload and routing
9. Phase 09 -- AI Agent: Resolution verification
10. Phase 10 -- AI Agent: Escalation autopilot
11. Phase 11 -- AI Agent: Chat panel
12. Phase 12 -- Agent traces and transparency
13. Phase 13 -- Demo data and polish

## When the spec is ambiguous

1. **Check the project overview first.** The overview's constraints (How it works, The interface) outrank the phase spec. If the phase says something that violates "Every verification comes from comparing the evidence," the overview wins.
2. **Check the detail specs next.** Spec 03 (AI Agent) defines exactly how tools work. Spec 02 (Database) defines exact schemas. These are canonical.
3. **If still ambiguous, ask.** Don't guess. A wrong guess in Phase 2 (RLS policy) will break every phase after it. A wrong guess in Phase 5 (severity prompt) will produce garbage scores for all demo data.
4. **Never add scope.** If the spec doesn't mention a feature, it's not in scope. "Wouldn't it be nice if..." is always no until the project overview says yes.

## Code style

- **TypeScript strict mode.** No `any` without a comment explaining why. No implicit `any`.
- **Server components by default.** Only make a component a client component if it uses browser APIs (camera, GPS, localStorage, event handlers). The map is a client component. The dashboard shell is a server component.
- **API routes return typed responses.** Every route handler defines its return type. No `Response.json(anything)`.
- **Database queries use the Supabase client, not raw SQL strings in components.** RPC functions for complex queries. Simple queries via the typed client.
- **Environment variables are validated at startup.** The app crashes on boot if `GOOGLE_AI_API_KEY` or `CLERK_SECRET_KEY` is missing. No lazy validation.
- **Error messages are human-readable.** Not "500 Internal Server Error." "Image upload failed: file too large (max 10MB)." Not "RLS violation." "You don't have permission to view this complaint."

## AI agent code

- **The agent is a TypeScript class in `lib/agent/CivicAgent.ts`.** It does not import React components. It does not import Next.js. It imports the Google AI SDK, zod, and database types only.
- **Tools are objects with `name`, `description`, `parameters` (zod schema), and `execute`.** The agent registers them in a Map. The LLM calls them by name.
- **Every tool execution is traced.** Before returning, every tool logs to `agent_traces` via a helper function. No exceptions.
- **No tool hallucinates data.** The severity tool sees an image. The duplicate tool runs DBSCAN. The verification tool compares photos. The escalation tool fills a template. The chat tool queries SQL. Each tool's output is derived from its input, not from the LLM's training data.
- **Fallbacks are safe defaults, not errors.** If the LLM API times out, severity defaults to 2. If the image fetch fails, verification uses text description only. The complaint flow never breaks because the AI broke.

## Database rules

- **RLS is on for every table created in Phase 2.** If you create a table later (you shouldn't, but if you do), RLS is the first thing enabled on it.
- **Policies use the token claim, not a query parameter.** `auth.uid()` and custom claims from Clerk JWT. Never `WHERE user_id = $1` passed from the client.
- **Migrations are SQL files, not ORM migrations.** Each phase that touches the schema adds a numbered SQL file. They run in order.
- **Seed data is separate from migrations.** Seed scripts populate demo data. They don't create tables.

## Frontend rules

- **Tailwind only.** No inline styles. No CSS-in-JS. No styled-components.
- **shadcn/ui components are the base layer.** Buttons, dialogs, tables, forms come from shadcn. Custom components wrap them, don't replace them.
- **Colour is semantic.** `bg-status-open`, `text-severity-3`, `border-sla-breached`. Never `bg-red-500` directly. The Tailwind config maps semantic names to values.
- **The shell is built in Phase 1 and never rearranged.** Later phases add to panels; they don't move them. If a phase spec says "add to the right panel," you add to the right panel. You don't create a new panel.
- **Dark mode is real, not inverted.** Both light and dark palettes are defined in Tailwind config. Dark mode uses `dark:` prefixes, not a global invert filter (except OSM tiles, which are the one exception).

## Testing during build

- **After every phase, run the Acceptance check.** All numbered items must pass before starting the next phase.
- **Test RLS with the Supabase anon key.** Query as anonymous, as citizen, as official, as admin. Verify the row counts match expectations.
- **Test the agent with real images.** Don't test severity scoring with a text description. Use actual photos of potholes, garbage, etc. The agent's behaviour with real data is the only valid test.
- **Test edge cases:** no GPS, large image, unparseable LLM response, empty query result. The fallback behaviour is as important as the happy path.

## What you must not do

- Don't use `npx create-next-app` with every flag enabled. Use only what the spec requires: App Router, TypeScript, Tailwind.
- Don't install ORMs (Prisma, Drizzle). The Supabase client is sufficient. PostGIS queries don't map cleanly to ORMs anyway.
- Don't build a custom auth system. Clerk is the auth system. Don't add JWT handling beyond what Clerk provides.
- Don't add analytics, error tracking, or monitoring. Not in scope.
- Don't add tests (unit tests, integration tests, e2e tests). The Acceptance checks are the tests. Time spent on Jest is time not spent on features that judges see.
- Don't optimize for performance. Correctness first. A slow query that returns the right data is better than a fast query that returns the wrong data.
- Don't cache AI responses in v1. Every call hits the model. Caching is future work.

## Decision log

When you make a decision the spec doesn't cover, log it here:

| Date | Decision | Reason | Reversible? |
|---|---|---|---|
| 2026-11-22 | Store `profiles.id` and `complaints.reporter_id` as `text` instead of `uuid` | Clerk user IDs are strings (e.g., `user_2s8d...`) that cannot be cast to Postgres UUID without syntax errors | Yes (if an internal UUID mapping table were introduced) |
| 2026-11-22 | Use `requesting_user_id()`, `requesting_user_role()`, `requesting_user_ward_id()` SQL helpers | Allows RLS policies to cleanly read Clerk claims from JWT while safely handling string IDs and role/ward metadata | Yes |
| 2026-11-22 | Remove phone OTP from Clerk authentication in favor of Email and Google OAuth | Clerk test mode restricts SMS delivery to Indian (+91) numbers; Email and Google OAuth provide instant, reliable sign-in | Yes |
| 2026-11-22 | Read `x-user-id`, `x-user-role`, `x-user-ward-id` headers in SQL helpers alongside JWT claims | Next.js server routes authenticate Clerk server-side and pass authenticated user identity directly to PostgREST with strict RLS | Yes |
| 2026-11-22 | Implement `/api/geocode/reverse` proxy route for Nominatim | Prevents browser CORS blocks, enforces 4-second timeout, and attaches compliant User-Agent headers | Yes |
| 2026-11-22 | Use SECURITY DEFINER RPC functions `get_public_map_complaints` and `get_complaint_popup` for map endpoints | Allows public map and lazy popup endpoints to safely fetch public geometry and thumbnail data without relaxing core table RLS | Yes |
| 2026-11-22 | Add `nigamsetu-map-tiles-v1` cache in service worker for OSM tile caching | Fulfills PWA offline map browsing requirement by caching visited OSM tile coordinates | Yes |
| 2026-11-22 | Apply dark mode CSS inversion specifically to `.dark .leaflet-tile-pane` | Standard OSM tiles lack dark variants; scoping the invert/hue-rotate filter to the tile pane inverts map backgrounds while preserving pin and popup badge colors | Yes |
| 2026-11-22 | Allow camelCase and snake_case in `agent_traces.tool_name` check constraint | Reconciles `ai-agent.md`/Phase 5 spec camelCase (`scoreSeverity`) with initial `database.md` snake_case | Yes |
| 2026-11-22 | Add `update_complaint_severity` and `record_agent_trace` RPC helpers | Guarantees strict single-column PATCH constraint and audit logging reliability across RLS caller contexts | Yes |
| 2026-11-22 | Implement trace deduplication in `CivicAgent.scoreSeverity` | Prevents redundant model calls and duplicate traces when server background task and client status queries run concurrently | Yes |
| 2026-11-22 | Implement 32x32 DCT-II perceptual hash (pHash) algorithm using `sharp` luminance buffer | Avoids abandoned C++ node-phash native compilation failure while computing true 64-bit Hamming distance (< 15 threshold) across platforms | Yes |
| 2026-11-22 | Introduce `get_public_map_pins` and `get_complaint_details_with_attestations` RPC functions | Streams single representative pins with cluster counts and nested member attestations to the public map while maintaining backward compatibility | Yes |
| 2026-11-22 | Multiply severity by cluster weight in `get_priority_queue` (`severity * COALESCE(complaint_count, 1)`) | Elevates priority of multi-report clustered tickets above standalone complaints of equivalent individual severity | Yes |

This log is append-only. If a decision is reversed, add a new row. Don't edit old rows.
