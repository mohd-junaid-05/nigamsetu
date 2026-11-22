# Phase 8 — Resolution upload and routing

**Goal.** A facility worker marks a complaint resolved and uploads an after photo. The complaint enters the verification pipeline.

## Build

- **Resolution upload flow:** on the facility's scoped view (or the official dashboard), a "Mark Resolved" button opens a camera/file picker. The worker captures the after photo, optionally adds notes, and submits.
- **POST /api/complaints/[id]/resolve:** uploads the resolution image to Storage, updates `complaints.resolution_image_url`, `resolved_at`, and sets `status = 'resolved'`. Triggers the verification agent.
- **Facility notification:** when a complaint is assigned to a facility, the facility contact (phone from `facilities.contact_phone`) receives an SMS via Twilio sandbox. This is a stretch -- if time is short, use a toast notification in the dashboard instead.
- **Facility scoped view:** a simplified dashboard for facility workers showing only complaints assigned to their facility, with "In Progress" and "Mark Resolved" actions.

## Constraints

- **The resolution photo must include GPS.** The upload form requires location (auto-captured or manual). A resolution without location is rejected with a clear message: "Location required for verification."
- **Only the assigned facility or an official can mark resolved.** RLS policy: update allowed if `facility_id` matches the user's facility, or if user role is 'official'/'admin' for the ward.
- **The after photo is stored at a predictable path:** `resolutions/{complaintId}/{timestamp}.jpg`. This makes cleanup and audit easier.
- **Status transitions are enforced:** a complaint can only move to 'resolved' from 'in_progress'. No jumping from 'open' to 'resolved'.

## Acceptance check

1. A facility worker opens their view, sees 3 assigned complaints. Clicks "Mark Resolved" on one, uploads a photo with GPS, adds notes. The complaint status becomes 'resolved'.
2. The `resolution_image_url` in the database points to a valid Storage URL. The `resolved_at` timestamp is set.
3. The public map updates: the pin turns grey (resolved, not yet verified).
4. Attempt to mark resolved without GPS. Get a clear rejection. The status does not change.
5. Attempt to mark resolved from 'open' status. Get a clear rejection. The status does not change.

## Not in this phase

AI verification (Phase 9). The verification UI (before/after side-by-side). Auto-status changes based on verification score. Escalation.

---