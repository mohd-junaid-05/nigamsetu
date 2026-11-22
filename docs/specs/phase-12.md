# Phase 12 — Agent traces and transparency

**Goal.** Every AI decision is auditable. A citizen or official can click "Why this score?" on any AI-generated result and see exactly what the agent saw, what tools it called, and what it returned.

## Build

- **Trace logging:** every agent tool execution (severity, duplicate, verify, escalation, chat) logs to `agent_traces` with: `complaint_id`, `tool_name`, `input_summary` (redacted, no image bytes), `output_summary`, `model_used`, `latency_ms`, `created_at`.
- **"Why this score?" button:** on every AI decision surface (severity badge, verification score bar, escalation letter), a small info icon opens a trace viewer modal.
- **Trace viewer modal:** shows the tool name, timestamp, model used, the prompt sent (for LLM calls), the raw response, the parsed result, and the latency. For verification, shows all four check results individually.
- **Trace filtering:** on the admin view, filter traces by tool, complaint, date range, or model. Useful for debugging and improving prompts.

## Constraints

- **Traces contain no image data.** Only URLs, not image bytes. The trace references the image by its Storage URL, not by embedding it.
- **Traces contain no PII.** Reporter names and phone numbers are redacted from `input_summary`. The trace shows the complaint ID, which can be looked up via RLS if the viewer has permission.
- **Trace retention is not defined in v1.** Traces accumulate. A cleanup policy is future work. For the hackathon, unlimited retention is acceptable.
- **The trace viewer is read-only.** No editing, no deletion. Traces are an audit log.

## Acceptance check

1. A complaint has severity 3. Click "Why this score?" The modal shows the tool name (`scoreSeverity`), the image URL, the prompt, the raw JSON response, the parsed severity, and the latency.
2. A verified complaint has score 0.91. Click "Why this score?" The modal shows all four verification checks: GPS match = true, hash different = true, vision verdict = true, composite = 0.91.
3. An admin opens the traces view, filters by `tool_name = 'verifyResolution'`. Sees all verification traces with timestamps and complaint IDs.
4. A citizen clicks "Why this score?" on their own complaint. They see the trace. They do not see traces for other citizens' complaints (RLS on `agent_traces`).
5. A trace exists for every AI decision in the system. No decision is untraced.

## Not in this phase

Trace analytics (success rates, latency percentiles). Automated trace quality scoring. Trace export. Alerting on anomalous traces.

---
