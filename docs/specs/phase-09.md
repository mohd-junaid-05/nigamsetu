# Phase 9 — AI Agent: Resolution verification

**Goal.** When a resolution is uploaded, the AI compares before and after photos, checks GPS proximity, and decides whether the fix was real. The map only turns green for verified fixes.

## Build

- **The `verifyResolution` tool** in the agent class. Four checks in sequence:
  1. GPS check: haversine distance between before/after locations. > 100m = immediate reject.
  2. Timestamp check: after must be > before. If not, reject.
  3. Perceptual hash check: Hamming distance < 5 means nearly identical images = likely fake (same photo re-uploaded).
  4. Vision model comparison: Gemini 1.5 Pro compares both images. "Has the issue been genuinely addressed?" JSON response: `{"verified": boolean, "confidence": 0-1, "reason": "string"}`.
- **Composite score:** weighted average of hash distance (inverted), GPS proximity (normalized), and vision confidence. Thresholds: >= 0.75 auto-pass, 0.4-0.75 manual review, < 0.4 auto-fail.
- **Verification UI:** official dashboard shows before image (left) and after image (right) with the AI score bar in the middle. Three buttons: "Verify & Close" (passes), "Reject & Reopen" (fails), "Flag for Review" (manual).
- **Auto-actions:** score >= 0.75 -> status becomes 'verified' automatically. Score < 0.4 -> status returns to 'in_progress' automatically. Middle range -> stays 'resolved' with 'verification_status = pending'.
- **Public map update:** verified complaints show green pins. Resolved-but-unverified stay grey.

## Constraints

- **GPS mismatch is an immediate hard reject.** No vision model call if the photos are 200m apart. The tool returns instantly with reason "location mismatch".
- **The vision model sees both images together, not separately.** One prompt, two image attachments. The model compares them in context.
- **The composite score formula is documented and testable.** It is not a black-box "AI says yes/no." The score is `(gps_score * 0.2) + (hash_score * 0.3) + (vision_score * 0.5)`. The weights are in the code, not hidden.
- **Every verification is traced.** `agent_traces` stores all four check results individually, the composite score, and the final verdict.

## Acceptance check

1. A facility uploads a real after photo of a fixed pothole, same location. The AI scores 0.88. The status auto-updates to 'verified'. The map pin turns green.
2. A facility uploads the same before photo as the after photo (re-uploaded). Hash distance is 0. The AI scores 0.15. The status auto-returns to 'in_progress'. The facility is notified.
3. A facility uploads an after photo from 300m away. GPS check fails immediately. Status returns to 'in_progress'. No vision model call is made.
4. A facility uploads an after photo of a different pothole nearby. The vision model scores 0.35. Status returns to 'in_progress'.
5. The verification panel shows before/after side-by-side with the score bar, the four individual check results, and the reason text. The "Why this score?" button opens the trace.

## Not in this phase

Escalation on verification failure (that triggers in Phase 10). Citizen override of verification (stretch). The chat panel.

---