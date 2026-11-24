import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';
const sb = createClient(url, key, {
  global: {
    headers: {
      'x-user-role': 'admin',
    },
  },
  auth: { persistSession: false },
});

async function run() {
  const { data, error } = await sb.from('complaints').select('id, category, description, image_url, resolution_image_url');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total complaints:', data?.length);
    for (const c of data || []) {
      if (c.id.toLowerCase().includes('d2f8531d') || (c.description && c.description.includes('Bellandur lake road'))) {
        console.log('MATCH:', c);
      }
    }
    // Also print first 10
    console.log('First 5 complaints:');
    (data || []).slice(0, 5).forEach(c => console.log(c.id.slice(0, 8), c.category, c.image_url));
  }
  process.exit(0);
}

run();
