# Phase 5 — AI Agent: Severity scoring

**Goal.** Every submitted complaint gets a severity score from 1 to 4 before it hits the queue, based on what the AI sees in the photo.

## Build

- **The `scoreSeverity` tool** in the agent class. Takes an image URL, category, and optional description. Calls Gemini 1.5 Flash with vision. Parses JSON response `{"severity": 1-4, "reason": "string"}`. Stores the result in `complaints.severity`.
- **System prompt:** "Rate the severity of the issue in this image on a scale of 1-4: 1 = cosmetic, 2 = significant, 3 = critical, 4 = emergency. Respond ONLY with a JSON object."
- **API route `/api/agent/severity`** that the complaint submission calls after insert. Async -- the citizen gets a "submitted" response immediately, the severity updates in the background.
- **Severity preview on the success screen:** after the async call returns, the success screen updates to show "Severity: Critical -- large sinkhole with active water flow" (or similar).
- **Fallback:** if the model returns unparseable JSON or an invalid severity, default to 2 (significant). Log the raw response and the fallback to `agent_traces`.

## Constraints

- **The agent runs server-side.** The API key never leaves the server. The client sends the complaint ID; the server fetches the image from Storage.
- **The severity update is a PATCH, not a replace.** Only the `severity` column changes. No other field is touched.
- **The model prompt is hardcoded, not dynamic.** The same prompt every time. No user input reaches the model prompt. If someone submits a description saying "this is an emergency," the model decides from the image, not from the text.
- **Trace every call.** Every severity score is logged to `agent_traces` with the image URL, the prompt, the raw response, the parsed result, and the latency.

## Acceptance check

1. Submit a complaint with a photo of a large pothole. Within 5 seconds, the `severity` column in the database updates to 3 (critical).
2. The `agent_traces` table has a row for this call with `tool_name = 'scoreSeverity'`, the input summary, the output summary, and `latency_ms` populated.
3. Submit a complaint with a photo the model can't parse (e.g., a blank image). The severity defaults to 2. The trace logs the fallback and the raw response.
4. Five different complaint photos, checked by hand against the severity labels, match what the agent claims. The "reason" field is coherent.
5. The success screen shows the severity update without a page refresh. The client polls or uses a lightweight status endpoint.

## Not in this phase

Duplicate clustering. Verification. The severity score does not yet affect the queue order (that happens in Phase 7). Voice input. Regional language.

---
