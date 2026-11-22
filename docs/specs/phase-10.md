# Phase 10 — AI Agent: Escalation autopilot

**Goal.** When a complaint breaches SLA or fails verification, the agent generates a formal escalation letter with the correct format, evidence, and deadline. The citizen doesn't write bureaucracy.

## Build

- **The `generateEscalation` tool** in the agent class. Loads a state-specific template, populates it with complaint data, and uses the LLM to polish language while preserving legal format.
- **Trigger conditions:** (1) `sla_deadline < NOW()` and status is not 'verified', (2) verification failed with score < 0.4, (3) manual trigger by official or citizen.
- **Escalation types:** RTI application, Municipal Commissioner appeal, Ward Officer letter. The type is determined by the trigger and severity.
- **PDF generation:** `pdf-lib` generates a formatted PDF from the letter content. Stored in Supabase Storage at `escalations/{complaintId}/{timestamp}.pdf`. URL stored in `complaints.escalation_letter_url`.
- **Escalation queue on dashboard:** a dedicated panel showing all escalated complaints with letter status (draft / submitted / acknowledged / resolved), deadline countdown, and one-click "Generate Letter" for manual triggers.
- **Deadline tracker:** `escalations.deadline` is computed (draft date + statutory response time). A cron or periodic check flags overdue escalations.

## Constraints

- **The letter never invents facts.** Every date, location, complaint ID, and description comes from the database. The LLM polishes grammar and tone, not content.
- **The template is hardcoded for one state (Maharashtra / general) in v1.** The adapter pattern is ready for other states, but only one template is implemented now.
- **The letter is generated, not sent.** The citizen or NGO worker submits it via the existing channel. The product provides the perfectly formatted letter, not the submission pipe.
- **Escalation does not change the complaint status.** The complaint stays 'escalated' (a new status) alongside its previous status. The escalation is a separate record.

## Acceptance check

1. A complaint breaches SLA (deadline passed, not verified). The escalation autopilot triggers. A letter is generated, stored as PDF, and linked to the complaint.
2. The letter contains the correct complaint ID, dates, location, category, and description. No invented facts. The format matches the RTI template structure.
3. The escalation appears in the dashboard escalation queue with status 'draft' and a deadline countdown.
4. A manual trigger on a verified-failed complaint generates a Commissioner appeal instead of an RTI. The format is different and correct.
5. The citizen's "My complaints" view shows an "Escalation Letter" button for escalated complaints. Clicking it downloads or views the PDF.

## Not in this phase

Auto-submission of letters (requires government portal integration, out of scope). Multi-state templates. Tracking of submission acknowledgment (manual update only). The chat panel.

---