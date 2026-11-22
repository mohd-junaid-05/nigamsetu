# Phase 6 — AI Agent: Duplicate clustering

**Goal.** When someone reports an issue that 12 other people already reported, it joins the existing cluster instead of creating a 13th identical ticket.

## Build

- **The `checkDuplicate` tool** in the agent class. Two-stage: (1) SQL query finds complaints within 100m, same category, last 30 days. (2) Perceptual hash comparison via the `phash` library. Hamming distance < 15 = likely duplicate.
- **DBSCAN clustering** on the geospatial matches. Clusters complaints within epsilon distance into a single `complaint_clusters` row. The first or most-severe complaint becomes the representative.
- **Cluster update on insert:** if a duplicate is found, set `complaints.cluster_id` and increment `complaint_clusters.complaint_count`. If no match, the complaint becomes a new cluster of size 1.
- **Visual indicator on the map:** clustered complaints show a single pin with a badge "12 reports". Clicking it shows the representative complaint with a list of attestations.
- **Weight in the queue:** `complaint_count` multiplies the effective severity in the official dashboard sorting.

## Constraints

- **Clustering is code, not LLM.** The LLM is never asked "are these the same?" DBSCAN and perceptual hash do the work. The LLM is only a tiebreaker if hash scores are borderline.
- **The 100m radius and 30-day window are constants, not configurable per category.** They can be tuned later, but for now they are hardcoded. A garbage complaint and a road complaint 50m apart do not cluster -- category must match.
- **A complaint can belong to exactly one cluster.** No overlapping clusters, no multi-parent relationships. If DBSCAN produces overlapping clusters, the larger one wins.
- **Cluster centroids update when a member joins.** The centroid is the mean of all member locations, not the representative's location.

## Acceptance check

1. Submit a complaint at GPS point X. Submit a second complaint at point X + 30m, same category, similar photo. The second complaint gets `cluster_id` pointing to the first. `complaint_count` is 2.
2. Submit a third complaint at point X + 500m, same category. It gets a new `cluster_id`. `complaint_count` is 1.
3. The public map shows one pin for the cluster of 2, with a "2 reports" badge. The standalone pin shows no badge.
4. The official dashboard priority queue shows the cluster complaint with weight = 2, ranked higher than a standalone complaint of the same severity.
5. The `agent_traces` table records the duplicate check with `method = 'hash'` or `method = 'geospatial'`.

## Not in this phase

Verification (Phase 9). The cluster count doesn't yet auto-update the map in real time (that's Phase 7 with Supabase Realtime). Merging existing clusters if a new complaint bridges two.

---