/**
 * Geospatial distance and DBSCAN Clustering implementation for NigamSetu.
 * 
 * Rules:
 * - Radius epsilon = 100 meters.
 * - Distance metric = Haversine distance.
 * - Category must match.
 * - Cluster centroids are the mathematical mean (average lat, average lng) of all members.
 * - Bounding radius is the maximum distance from centroid to any member point.
 * - The first or most-severe complaint becomes the representative.
 * - No overlapping clusters: If DBSCAN produces overlapping clusters, the larger one wins.
 */

export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  category: string;
  severity: number;
  createdAt: string;
  imagePerceptualHash?: string;
  clusterId?: string | null;
}

export interface ClusteredGroup {
  clusterId?: string;
  representativeId: string;
  memberIds: string[];
  complaintCount: number;
  centroid: {
    lat: number;
    lng: number;
  };
  boundingRadius: number; // in meters
}

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Haversine distance between two coordinates in meters.
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates centroid (mean lat, mean lng) for an array of points.
 */
export function calculateCentroid(points: { lat: number; lng: number }[]): {
  lat: number;
  lng: number;
} {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }
  let sumLat = 0;
  let sumLng = 0;
  for (const pt of points) {
    sumLat += pt.lat;
    sumLng += pt.lng;
  }
  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length,
  };
}

/**
 * Calculates bounding radius in meters from centroid to the farthest member point.
 */
export function calculateBoundingRadius(
  centroid: { lat: number; lng: number },
  points: { lat: number; lng: number }[]
): number {
  let maxDist = 0;
  for (const pt of points) {
    const dist = haversineDistanceMeters(centroid.lat, centroid.lng, pt.lat, pt.lng);
    if (dist > maxDist) {
      maxDist = dist;
    }
  }
  return Math.round(maxDist * 100) / 100;
}

/**
 * Selects the representative complaint:
 * "The first or most-severe complaint becomes the representative."
 * Sorts by severity DESC, then by createdAt ASC.
 */
export function pickRepresentative(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) {
    throw new Error('Cannot pick representative from empty list');
  }

  const sorted = [...points].sort((a, b) => {
    if (b.severity !== a.severity) {
      return b.severity - a.severity; // Highest severity first
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Earlier first
  });

  return sorted[0];
}

/**
 * Runs DBSCAN clustering on an array of complaints.
 * Epsilon = 100 meters, category must match.
 * If overlapping clusters are detected, the larger one wins.
 */
export function runDBSCAN(
  points: GeoPoint[],
  epsilonMeters = 100
): ClusteredGroup[] {
  const visited = new Set<string>();
  const clustered = new Set<string>();
  const clusters: ClusteredGroup[] = [];

  // Group by category first (category must match)
  const byCategory = new Map<string, GeoPoint[]>();
  for (const pt of points) {
    const list = byCategory.get(pt.category) || [];
    list.push(pt);
    byCategory.set(pt.category, list);
  }

  for (const [_, categoryPoints] of byCategory.entries()) {
    for (const point of categoryPoints) {
      if (visited.has(point.id)) continue;
      visited.add(point.id);

      // Find spatial neighbors within epsilon
      const neighbors = categoryPoints.filter(
        (other) =>
          other.id !== point.id &&
          haversineDistanceMeters(point.lat, point.lng, other.lat, other.lng) <= epsilonMeters
      );

      if (neighbors.length === 0) {
        // Standalone cluster of size 1
        if (!clustered.has(point.id)) {
          clustered.add(point.id);
          clusters.push({
            clusterId: point.clusterId || undefined,
            representativeId: point.id,
            memberIds: [point.id],
            complaintCount: 1,
            centroid: { lat: point.lat, lng: point.lng },
            boundingRadius: 0,
          });
        }
        continue;
      }

      // Expand cluster
      const clusterMembers: GeoPoint[] = [point];
      clustered.add(point.id);

      const queue = [...neighbors];
      while (queue.length > 0) {
        const neighbor = queue.shift()!;
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          const nextNeighbors = categoryPoints.filter(
            (other) =>
              other.id !== neighbor.id &&
              haversineDistanceMeters(neighbor.lat, neighbor.lng, other.lat, other.lng) <=
                epsilonMeters
          );
          queue.push(...nextNeighbors);
        }

        if (!clustered.has(neighbor.id)) {
          clustered.add(neighbor.id);
          clusterMembers.push(neighbor);
        }
      }

      const centroid = calculateCentroid(clusterMembers);
      const boundingRadius = calculateBoundingRadius(centroid, clusterMembers);
      const rep = pickRepresentative(clusterMembers);

      clusters.push({
        representativeId: rep.id,
        memberIds: clusterMembers.map((m) => m.id),
        complaintCount: clusterMembers.length,
        centroid,
        boundingRadius,
      });
    }
  }

  // Enforce constraint: "If DBSCAN produces overlapping clusters, the larger one wins."
  const assigned = new Map<string, number>(); // pointId -> clusterIndex
  const finalClusters: ClusteredGroup[] = [];

  // Sort candidate clusters descending by size
  clusters.sort((a, b) => b.complaintCount - a.complaintCount);

  for (const cluster of clusters) {
    const validMembers: string[] = [];
    for (const memberId of cluster.memberIds) {
      if (!assigned.has(memberId)) {
        validMembers.push(memberId);
      }
    }

    if (validMembers.length > 0) {
      for (const mId of validMembers) {
        assigned.set(mId, finalClusters.length);
      }
      const memberPoints = points.filter((p) => validMembers.includes(p.id));
      const centroid = calculateCentroid(memberPoints);
      const rep = pickRepresentative(memberPoints);
      finalClusters.push({
        clusterId: cluster.clusterId,
        representativeId: rep.id,
        memberIds: validMembers,
        complaintCount: validMembers.length,
        centroid,
        boundingRadius: calculateBoundingRadius(centroid, memberPoints),
      });
    }
  }

  return finalClusters;
}
