# Phase 13 — Demo data and polish

**Goal.** The product has enough realistic data to tell a story on stage, the demo is rehearsed, and there's a backup video in case live infrastructure fails.

## Build

- **Seed 30-40 realistic complaints** across 3 wards. Mix of categories, severities, statuses. Include:
  - 5-6 "ghost closure" examples: resolved but verification failed (before/after pairs that the AI correctly rejects)
  - 3-4 duplicate clusters (2-5 members each)
  - 2-3 SLA-breached complaints (backdated to trigger escalation)
  - 1-2 verified complaints (green pins on the map)
  - 1 escalation letter generated and linked
- **Demo persona accounts:** 1 citizen, 1 official per ward, 1 admin. Pre-seeded with Clerk accounts or mock JWTs.
- **PWA icon and splash screen:** generate 192x192 and 512x512 icons. The app installs cleanly on a phone.
- **Loading states and error boundaries:** every async operation has a skeleton or spinner. Every error has a human-readable message, not a raw stack trace.
- **Backup demo video:** screen record the full 6-minute demo walkthrough. If live infra fails on stage, play the video.
- **README:** setup instructions, environment variables, seed commands, and a one-paragraph project description.

## Constraints

- **Demo data is realistic but anonymized.** No real names, real addresses, or real phone numbers. Locations are within the demo city boundaries.
- **The demo script is timed at 6 minutes.** Opening (30s) -> Citizen report (90s) -> Dashboard (90s) -> Verification moment (90s) -> Escalation (60s) -> Close (30s). No feature is demoed that isn't fully working.
- **The backup video is the full demo, not a trailer.** It shows every interaction. If played, the audio narrates what's happening.
- **No last-minute feature additions after H30.** Hours 30-36 are polish, rehearsal, and backup only. A new feature added at H34 will be broken on stage.

## Acceptance check

1. Open the public map. See 30+ pins across the city. Green, red, amber, blue, grey. Clusters show badges. Filters work.
2. Sign in as the demo citizen. "My complaints" shows 3-4 complaints with real photos and status badges.
3. Sign in as the demo official. The dashboard shows a populated priority queue with SLA breaches highlighted. Assign a complaint. The map updates.
4. Open a ghost-closure complaint. Before/after side-by-side. AI score 0.2. Click "Why this score?" The trace shows GPS mismatch or vision rejection.
5. Open an SLA-breached complaint. The escalation letter PDF is generated and viewable.
6. The backup video is recorded, under 6 minutes, and plays smoothly.

## Not in this phase

New features. New tools. New UI patterns. Anything not already in a previous phase. This phase is about making what exists presentable, not adding scope.
