# Phase 11 — AI Agent: Chat panel

**Goal.** An official asks a natural language question about their ward data -- "show me all open sewage complaints over 14 days old" -- and the agent answers by looking up structured records, not by recalling.

## Build

- **The `answerChat` tool** in the agent class. Two-step: (1) LLM converts NL query to structured filter JSON, (2) SQL query executes with filters, (3) LLM formats results into natural language.
- **Chat UI:** input field at the bottom of the dashboard's right panel, message history above. Each answer shows the SQL query that produced it (collapsible, default hidden).
- **Available filters:** category, status, severity, created_after, created_before, has_cluster (boolean), sla_breached (boolean).
- **Answer formatting:** the LLM receives the query results and formats them: "There are 3 open sewage complaints in your ward older than 14 days. The oldest is at [address], reported 23 days ago."
- **Source citations:** each fact in the answer references the complaint ID(s) it came from. Clicking an ID opens that complaint's detail panel.

## Constraints

- **The agent never answers without a query.** If the NL query can't be converted to a structured filter, the agent responds "I don't understand. Try asking about complaints by category, status, or date."
- **The SQL query is always shown.** An answer without a visible query is a hallucination and the exact failure this feature exists to prevent. The query is collapsed by default but one click expands it.
- **The agent only queries the official's ward.** The SQL always includes `WHERE ward_id = :official_ward_id`. Cross-ward queries are refused.
- **No model call uses the raw database schema.** The agent sees a constrained list of filterable fields, not the full table structure. This prevents malformed queries.

## Acceptance check

1. Official asks: "How many critical road complaints are open?" The agent responds with a number and a list. The SQL `SELECT COUNT(*) FROM complaints WHERE ward_id = X AND category = 'road' AND severity = 4 AND status IN ('open', 'assigned', 'in_progress')` is visible on expand.
2. Official asks: "Show me complaints older than 14 days." The response lists complaints with `created_at < NOW() - INTERVAL '14 days'`.
3. Official asks: "What's the weather like?" The agent responds: "I can only answer questions about complaints in your ward. Try asking about category, status, or date."
4. Click a complaint ID in the answer. The detail panel opens for that complaint.
5. The chat history persists for the session. Reloading the dashboard clears it. No chat storage in the database.

## Not in this phase

Persistent chat history. Multi-turn context beyond the current session. Answers that require aggregation beyond COUNT and LIST (e.g., trend analysis). Voice input for chat.

---
