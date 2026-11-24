const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const dotenv = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = dotenv.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const supabaseKey = dotenv.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-id': 'user_3MY3oAr3C4BWTbfTwHSky9Aw5XW',
      'x-user-role': 'admin'
    }
  },
  auth: { persistSession: false }
});

async function main() {
  console.log('=== Cleaning all old complaints and resetting to 3 Hyderabad complaints ===');

  // 1. Fetch all complaint IDs
  const { data: allComplaints, error: fetchErr } = await supabase.from('complaints').select('id');
  if (fetchErr) {
    console.error('Error fetching complaints:', fetchErr);
    return;
  }
  const ids = allComplaints.map(c => c.id);
  console.log(`Found ${ids.length} existing complaints to delete.`);

  // 2. Delete child records
  await supabase.from('cluster_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('complaint_clusters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('escalations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('complaint_activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3. Delete complaints in chunks of 15
  for (let i = 0; i < ids.length; i += 15) {
    const chunk = ids.slice(i, i + 15);
    const { data: delData, error: delErr } = await supabase.from('complaints').delete().in('id', chunk).select();
    if (delErr) {
      console.error('Delete chunk error:', delErr);
    } else {
      console.log(`Deleted chunk ${i / 15 + 1}: ${delData?.length || 0} rows.`);
    }
  }

  // 4. Verify 0 complaints remaining
  const { data: afterDel } = await supabase.from('complaints').select('id');
  console.log(`Remaining complaints after cleanup: ${afterDel?.length || 0}`);

  // 5. Insert exactly 3 clean, verified Hyderabad complaints
  const WARD_HYD = 'a0000000-0000-0000-0000-000000000001'; // Ward 104 - Banjara Hills
  const FACILITY_HYD = 'b0000000-0000-0000-0000-000000000001'; // GHMC Road Works Depot - Banjara Hills
  const ADMIN_ID = 'user_3MY3oAr3C4BWTbfTwHSky9Aw5XW';

  const threeComplaints = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      reporter_id: ADMIN_ID,
      ward_id: WARD_HYD,
      category: 'road',
      severity: 3,
      status: 'open',
      description: 'Major crater and asphalt breakdown near Road No. 12 junction causing vehicular congestion and hazard to two-wheelers.',
      image_url: '/images/category-road.webp',
      location: 'POINT(78.4350 17.4156)',
      address_text: 'Road No. 12, Banjara Hills, Hyderabad, Telangana',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      reporter_id: ADMIN_ID,
      ward_id: WARD_HYD,
      category: 'garbage',
      severity: 2,
      status: 'assigned',
      facility_id: FACILITY_HYD,
      description: 'Overflowing secondary municipal dumpsters with unsorted waste spilling into stormwater gutter near commercial market.',
      image_url: '/images/category-garbage.webp',
      location: 'POINT(78.4385 17.4172)',
      address_text: 'Banjara Hills Rd No. 1, Hyderabad, Telangana',
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      reporter_id: ADMIN_ID,
      ward_id: WARD_HYD,
      category: 'sewage',
      severity: 4,
      status: 'in_progress',
      facility_id: FACILITY_HYD,
      description: 'Severe sewage overflow from fractured underground pipe spilling foul black water onto pedestrian pathway.',
      image_url: '/images/category-sewage.webp',
      location: 'POINT(78.4320 17.4140)',
      address_text: 'Near Cancer Hospital Junction, Banjara Hills, Hyderabad, Telangana',
      created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    }
  ];

  const { data: inserted, error: insErr } = await supabase.from('complaints').insert(threeComplaints).select();
  if (insErr) {
    console.error('Error inserting complaints:', insErr);
    return;
  }
  console.log(`Successfully inserted ${inserted.length} clean complaints in Hyderabad.`);

  // 6. Insert initial activity logs
  await supabase.from('complaint_activity_logs').insert([
    {
      complaint_id: 'c0000000-0000-0000-0000-000000000001',
      actor_id: ADMIN_ID,
      actor_role: 'citizen',
      action: 'created',
      notes: 'Complaint filed with photographic evidence and GPS verification.'
    },
    {
      complaint_id: 'c0000000-0000-0000-0000-000000000002',
      actor_id: ADMIN_ID,
      actor_role: 'admin',
      action: 'assigned',
      notes: 'Assigned to GHMC Road Works & Sanitation Depot.'
    },
    {
      complaint_id: 'c0000000-0000-0000-0000-000000000003',
      actor_id: ADMIN_ID,
      actor_role: 'admin',
      action: 'in_progress',
      notes: 'Field repair team dispatched to site.'
    }
  ]);
  console.log('Activity logs created.');

  // 7. Verify final count
  const { data: finalRows } = await supabase.from('complaints').select('id, category, status, severity, address_text');
  console.log('Final database count:', finalRows?.length);
  console.table(finalRows);
}

main();
