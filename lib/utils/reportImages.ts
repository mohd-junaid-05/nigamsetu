export const CATEGORY_REPORT_IMAGES: Record<string, string> = {
  road: '/images/reports/road_pothole_1.webp',
  garbage: '/images/reports/garbage_overflow_1.webp',
  sewage: '/images/reports/sewage_overflow_1.webp',
  school: '/images/reports/school_damaged_1.webp',
  healthcenter: '/images/reports/health_damaged_1.webp',
  other: '/images/reports/sidewalk_broken_1.webp',
};

export const CATEGORY_REPAIR_IMAGES: Record<string, string> = {
  road: '/images/reports/road_repaired_1.webp',
  garbage: '/images/reports/garbage_cleared_1.webp',
  sewage: '/images/reports/unrelated_clean_road.webp',
  school: '/images/reports/school_repaired_1.webp',
  healthcenter: '/images/reports/health_repaired_1.webp',
  other: '/images/reports/road_repaired_1.webp',
};

export function getValidReportImageUrl(url?: string | null, category?: string | null): string {
  const cat = (category || 'road').toLowerCase();
  const fallback = CATEGORY_REPORT_IMAGES[cat] || CATEGORY_REPORT_IMAGES.road;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }

  const trimmed = url.trim();
  // If it's an old stock Unsplash URL or placeholder, replace with authentic Indian photo
  if (trimmed.includes('unsplash.com') || trimmed.includes('placeholder')) {
    return fallback;
  }

  return trimmed;
}

export function getValidResolutionImageUrl(url?: string | null, category?: string | null): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  const cat = (category || 'road').toLowerCase();
  const fallback = CATEGORY_REPAIR_IMAGES[cat] || CATEGORY_REPAIR_IMAGES.road;

  const trimmed = url.trim();
  if (trimmed.includes('unsplash.com') || trimmed.includes('placeholder')) {
    return fallback;
  }

  return trimmed;
}
