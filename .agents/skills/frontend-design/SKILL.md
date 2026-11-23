---
name: frontend-design
description: Anthropic's frontend design principles customized for production-grade civic platforms. Creates distinctive, context-specific UI, enforces strong visual hierarchy and semantic restraint, and systematically eliminates generic AI-generated templates.
---

# Frontend Design — Anti-Slop & Civic System Standards

## Core Philosophy: Civic Credibility & Anti-Slop

Civic software is not a flashy marketing tool, a generic SaaS dashboard, or an AI tech demo. It is a critical public service utility used by citizens reporting real neighborhood hazards (potholes, open manholes, sewage spills) and municipal officials coordinating daily public works.

Every pixel must communicate **clarity, trustworthiness, accountability, and operational efficiency**.

### 1. The Anti-Slop Discipline
- **No decorative gradients or glowing blobs:** Avoid arbitrary `bg-gradient-to-r` or blurred decorative spheres (`blur-3xl bg-blue-500/20`) that add visual noise without conveying state.
- **No generic card spam:** Do not nest cards inside cards inside cards with arbitrary `rounded-2xl` borders. Use clean table structures, structured sections, subtle dividers, and intentional whitespace.
- **No AI hype text:** Eliminate exaggerated promotional phrasing ("Powered by Next-Gen Autonomous AI Intelligence!"). Replace with clear, factual, accountable microcopy ("AI Vision Verification: 4 checks completed").
- **No arbitrary colors:** Color must be strictly functional. Red is open hazard/breach; Amber is assigned/pending; Blue is in progress; Green is verified repair; Grey is neutral/unverified closure; Purple is formal statutory escalation. Never use decorative neon or rainbow accents.

### 2. Information Architecture & Gestalt Principles
- **Proximity:** Group related metadata together (e.g., ticket ID + ward name + timestamp in one compact header lockup).
- **Alignment:** Strict 4px/8px grid alignment. Elements within rows must align to a common baseline or center line. Column headers must align with their table data.
- **Visual Hierarchy:**
  1. Primary title / Primary status (boldest, high contrast).
  2. Core actionable data (severity badge, category icon, evidence thumbnail).
  3. Supporting operational metadata (timestamps, reporter/contractor, GPS coordinates).
  4. Diagnostic and audit details (collapsible or on-demand via "Why this score?").

### 3. Typography Scale
- Hierarchy should rely on font weight and contrast, not bloated font sizes.
- Monospace font (`var(--font-geist-mono)`) for identifiers: Ticket IDs (`#13000000-0001`), GPS coordinates (`12.9350° N, 77.6750° E`), latency (`420ms`), model names (`gemini-1.5-flash`), and hashes.
- Standard body text: 13px - 14px (`text-xs` to `text-sm`) with 1.4-1.5 line height for maximum scanning efficiency in operational dashboards.

### 4. Interactive Affordance & Polish (Emil Kowalski Standards)
- Every interactive element must have:
  - Visible default state with clear affordance.
  - Subdued hover feedback (`hover:bg-surface-hover` or subtle border shift).
  - Active press feedback (`active:scale-[0.98]` or `:active` tint).
  - Explicit keyboard focus ring (`focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`).
  - Disabled state with `opacity-50 cursor-not-allowed` and `aria-disabled="true"`.
- Fast, purposeful transitions under 200ms (`transition-colors duration-150` or `transition-transform duration-150`).
