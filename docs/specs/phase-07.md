# Phase 7 — Official dashboard

**Goal.** An official opens the dashboard, sees their ward's complaints ranked by priority, assigns them to facilities, and watches the live queue update as citizens submit.

## Build

- **Three-panel layout:** priority queue on the left (25%), map in the center (50%), detail/chat on the right (25%). All three scroll independently.
- **Priority queue table:** columns are severity (badge), category, weight (attestations), age (hours since submission), SLA status (breached or not), and an assign button. Sorted by `severity DESC, weight DESC, created_at ASC`.
- **SLA breach highlighting:** rows where `sla_deadline < NOW()` have a red left border and a "BREACHED" label. The SLA deadline is computed at insert: created_at + category-specific hours (road: 72h, garbage: 24h, sewage: 12h, school: 168h, healthcenter: 48h, other: 72h).
- **Map panel:** same Leaflet as the public map, but filtered to the official's ward, with assignment interactions. Click a pin to see details in the right panel.
- **Assignment modal:** click "Assign" on a queue row -> dropdown of facilities in the ward, filtered by matching category -> confirm -> update `complaints.facility_id` and `status = 'assigned'`.
- **Supabase Realtime:** subscribe to `postgres_changes` on the `complaints` table filtered by `ward_id`. New complaints, status changes, and severity updates appear in the queue within seconds. No page refresh.
- **Detail panel:** when a complaint is selected, show full photo, description, location, reporter contact (if allowed by policy), severity with reason, status history (open -> assigned -> in_progress -> resolved), and action buttons.

## Constraints

- **The dashboard is desktop-first.** The layout assumes 1280px+ width. On smaller screens, the queue is a full-width list and the map/detail are tabs.
- **Officials see only their ward.** The RLS policy enforces this. If an official is assigned to no ward, the dashboard shows an empty state, not an error.
- **Assignment updates the status atomically.** The PATCH sets both `facility_id` and `status` in one transaction. A complaint can't be assigned without also being marked 'assigned'.
- **The queue is server-rendered on first load, then real-time after.** The initial paint comes from a server query; updates come via WebSocket. Both use the same SQL (the `get_priority_queue` RPC).

## Acceptance check

1. Sign in as an official for Ward A. The dashboard loads with complaints only from Ward A. No Ward B complaints appear.
2. The priority queue is sorted by severity, then weight, then age. A severity-4 complaint with weight 1 is above a severity-2 complaint with weight 5.
3. Assign a complaint to a facility. The status changes to 'assigned' in the queue, on the map, and in the database. A second official sees the same update in real time.
4. A citizen submits a new complaint in Ward A. It appears in the queue within 3 seconds with status 'open' and the AI severity already applied.
5. An SLA-breached complaint has a red border and a 'BREACHED' label. The SLA deadline is visible on hover.

## Not in this phase

Resolution upload (Phase 8). Verification (Phase 9). The chat panel (Phase 10). Escalation generation (Phase 10). The detail panel shows history but not the full before/after comparison.

---