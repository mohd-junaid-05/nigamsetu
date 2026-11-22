# Phase 4 — Public map

**Goal.** Anyone, signed in or not, opens the map and sees every open, in-progress, and verified complaint as a pin they can inspect.

## Build

- **Leaflet map with OpenStreetMap tiles.** Full viewport on `/map`, embedded panel elsewhere. No API key required.
- **Marker clustering:** at zoom < 14, nearby complaints cluster into a single numbered marker. At zoom >= 14, individual pins appear.
- **Pin colours by status:** open = red, assigned = amber, in_progress = blue, verified = green. A resolved-but-unverified pin is grey, not green.
- **Pin size by severity:** emergency pins are larger than cosmetic ones. This is CSS scale, not separate marker images.
- **Popup on click:** thumbnail image, category label, severity badge, status badge, reported date, address text. Link to detail view if signed in.
- **Filter bar:** category toggles (multi-select), status toggles, date range slider (last 7 / 30 / 90 / all days).
- **Stats banner:** total open complaints, resolved this month, average resolution time (days). These are arithmetic over data already loaded.
- **PWA optimisation:** tile caching for offline map viewing of previously loaded areas.

## Constraints

- **Map data is public.** The `/api/map/public` endpoint returns lightweight JSON (id, location, category, severity, status, created_at) with no RLS restriction. No description, no image URL, no reporter ID. The public map shows location and category only.
- **Clustering is Leaflet.markercluster, not custom.** Don't reinvent viewport clustering. The library handles zoom, animation, and spidering.
- **Popups are lazy-loaded.** The thumbnail in the popup fetches on open, not on map load. A map with 500 pins shouldn't make 500 image requests.
- **Dark mode:** OSM tiles don't have a dark variant. Use CSS `filter: invert(1) hue-rotate(180deg) brightness(0.8)` on the tile layer in dark mode. It's not perfect but it's consistent.

## Acceptance check

1. Open `/map` without signing in. See clustered markers. Zoom in, clusters break into individual pins.
2. Click a pin. Popup opens with thumbnail, category, severity, status, date. All data is real from the database.
3. Toggle "road" off in the filter bar. Road pins disappear. Toggle back on, they reappear. Toggle "open" off. Only in-progress and verified pins remain.
4. The stats banner updates when filters change. Not via API call -- the numbers are derived from the visible pin set in the browser.
5. Dark mode: the map background inverts. Pins remain readable (their colours don't invert with the tiles).

## Not in this phase

Official dashboard map (that's Phase 7). Real-time updates (Supabase Realtime comes in Phase 7). The detail view beyond the popup. Heatmap layer.

---