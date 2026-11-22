# Phase 3 — Complaint submission

**Goal.** A citizen takes a photo, the phone captures GPS, picks a category, and submits. The complaint lands in the database with the correct ward and a public URL for the image.

## Build

- **Camera capture component** using `getUserMedia`. Full-width on mobile, preview after capture, retake option.
- **GPS auto-capture** via Geolocation API. Display coordinates, address text (reverse geocode via Nominatim), and a manual-adjust map picker for cases where GPS is wrong.
- **Category selector:** 6 cards -- road, garbage, sewage, school, healthcenter, other. Icons, not just text. One tap selects.
- **Optional description field:** text input or voice recording. Voice is a stretch; if time is short, skip it and leave the UI slot.
- **Image upload to Supabase Storage.** Compress with `sharp` server-side before storage. Store at `complaint-images/{userId}/{timestamp}.jpg`.
- **POST /api/complaints** inserts the row with `image_url`, `location` (PostGIS POINT), `ward_id` (from `get_ward_from_point`), `category`, `description`, and `status = 'open'`.
- **Success screen:** complaint ID, expected timeline text, link to public map.
- **"My complaints" tab:** list of complaints submitted by the signed-in citizen, with status badges.

## Constraints

- **The upload endpoint streams to Supabase Storage, not to disk.** Server memory is limited; the image should flow through a buffer, not accumulate in RAM.
- **GPS fallback:** if the browser denies location permission, show the manual map picker. A complaint without any location is refused. No location means no ward means no routing.
- **Image validation:** reject non-image files, reject images over 10MB. Return a clear error, not a 500.
- The complaint insert and the image upload are not a transaction. If the image upload succeeds and the insert fails, delete the orphaned image. If the insert succeeds and the upload fails, mark the complaint with a broken image flag rather than leaving a silent null.

## Acceptance check

1. Submit a complaint from a phone. Photo captures, GPS locks within 3 seconds, category selected, submit succeeds. The complaint ID is returned.
2. The complaint appears in the database with a valid `ward_id` (from point-in-polygon), a `location` geometry, and a reachable `image_url`.
3. The "My complaints" tab shows the new complaint with status "open" and the submitted photo thumbnail.
4. Submit without location permission. The manual map picker appears. Select a point, submit, ward is correctly assigned.
5. Submit with a 15MB image. Get a clear "Image too large" message. The complaint is not created.

## Not in this phase

AI severity scoring (Phase 5). Duplicate clustering (Phase 6). The public map display (Phase 4). Official dashboard. Voice input. SLA deadlines.

---