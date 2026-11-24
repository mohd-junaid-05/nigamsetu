import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const CATEGORY_IMAGES: Record<string, { images: string[]; repairs: string[] }> = {
  road: {
    images: [
      '/images/reports/road_pothole_1.webp',
      '/images/reports/road_pothole_2.webp',
      '/images/reports/road_pothole_3.webp',
      '/images/reports/road_pothole_4.webp',
    ],
    repairs: ['/images/reports/road_repaired_1.webp', '/images/reports/road_repaired_2.webp'],
  },
  garbage: {
    images: [
      '/images/reports/garbage_overflow_1.webp',
      '/images/reports/garbage_overflow_2.webp',
      '/images/reports/garbage_overflow_3.webp',
      '/images/reports/garbage_overflow_4.webp',
    ],
    repairs: ['/images/reports/garbage_cleared_1.webp', '/images/reports/garbage_cleared_2.webp'],
  },
  sewage: {
    images: [
      '/images/reports/sewage_overflow_1.webp',
      '/images/reports/sewage_overflow_2.webp',
      '/images/reports/sewage_overflow_3.webp',
      '/images/reports/sewage_overflow_4.webp',
    ],
    repairs: ['/images/reports/sewage_overflow_1.webp', '/images/reports/unrelated_clean_road.webp'],
  },
  school: {
    images: ['/images/reports/school_damaged_1.webp'],
    repairs: ['/images/reports/school_repaired_1.webp'],
  },
  healthcenter: {
    images: ['/images/reports/health_damaged_1.webp'],
    repairs: ['/images/reports/health_repaired_1.webp'],
  },
  other: {
    images: ['/images/reports/sidewalk_broken_1.webp', '/images/reports/360_F_1923589033_yWKTqqBrECrN7y2nlOw7pqzJRgPsdECp.webp'],
    repairs: ['/images/reports/road_repaired_1.webp'],
  },
};

async function main() {
  console.log('Fetching all complaints from Supabase...');
  const { data: complaints, error } = await supabase
    .from('complaints')
    .select('id, category, image_url, resolution_image_url');

  if (error) {
    console.error('Error fetching complaints:', error.message);
    process.exit(1);
  }

  console.log(`Found ${complaints?.length || 0} complaints.`);

  let updatedCount = 0;
  for (let i = 0; i < (complaints || []).length; i++) {
    const c = complaints![i];
    const cat = c.category && CATEGORY_IMAGES[c.category] ? c.category : 'road';
    const config = CATEGORY_IMAGES[cat];

    const currentImg = c.image_url || '';
    const currentResImg = c.resolution_image_url || '';

    let newImg = currentImg;
    let newResImg = currentResImg;

    // If image_url is an external unsplash URL or missing, replace with our authentic local report photo
    if (!currentImg || currentImg.includes('unsplash') || currentImg.startsWith('http://') || currentImg.startsWith('https://images.unsplash')) {
      const idx = i % config.images.length;
      newImg = config.images[idx];
    }

    // If resolution_image_url is an external unsplash URL, replace with our authentic local repair photo
    if (currentResImg && (currentResImg.includes('unsplash') || currentResImg.startsWith('http://') || currentResImg.startsWith('https://images.unsplash'))) {
      const idx = i % config.repairs.length;
      newResImg = config.repairs[idx];
    }

    if (newImg !== currentImg || newResImg !== currentResImg) {
      const updatePayload: Record<string, any> = { image_url: newImg };
      if (c.resolution_image_url) {
        updatePayload.resolution_image_url = newResImg;
      }
      const { error: updErr } = await supabase
        .from('complaints')
        .update(updatePayload)
        .eq('id', c.id);

      if (updErr) {
        console.warn(`Failed to update complaint ${c.id}:`, updErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} complaints in Supabase!`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
