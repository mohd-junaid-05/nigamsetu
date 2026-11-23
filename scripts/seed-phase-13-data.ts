// =====================================================================
// NigamSetu: Phase 13 Comprehensive Demo Dataset Seeder
// Seeds 36 realistic complaints across 3 wards, 6 ghost closures,
// 4 duplicate clusters, 3 SLA breaches, 2 verified tickets,
// 1 escalation letter, demo persona profiles, and agent traces.
// =====================================================================

import { createAuthenticatedSupabaseClient } from '../lib/supabase/server';
import { generateEscalationPdf } from '../lib/pdf/generateEscalationPdf';

const WARD_BELLANDUR = 'a0000000-0000-0000-0000-000000000001';
const WARD_HSR = 'a0000000-0000-0000-0000-000000000002';
const WARD_KORAMANGALA = 'a0000000-0000-0000-0000-000000000003';

// Known Clerk Persona User IDs & Fallbacks
const CLERK_CITIZEN_ID = 'user_3MVBRl3pwIT37WM4xo5RmCz6lnG';
const CLERK_OFFICIAL_BELLANDUR_ID = 'user_3MVBop915jIZ8QKkgACaHxXUJWi';
const CLERK_OFFICIAL_HSR_ID = 'user_3MVBoxQTcCEFRWpGwdTzWJMHmDN';
const CLERK_OFFICIAL_KORAMANGALA_ID = 'user_3MVBp5fbRQ1h6EQkxLeOSRSBeRY';
const CLERK_ADMIN_ID = 'user_3MVBp9OTOUIhpUkHmz9uvWDjExd';

// High quality, reliable photo evidence URLs
const PHOTOS = {
  pothole_crater_1: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
  pothole_crater_2: 'https://images.unsplash.com/photo-1578991624414-276ef23a534f?w=800',
  pothole_crater_3: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
  pothole_repaired_1: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800',
  pothole_repaired_2: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
  garbage_overflow_1: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800',
  garbage_overflow_2: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800',
  garbage_cleared_1: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800',
  sewage_overflow_1: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800',
  sewage_overflow_2: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800',
  school_hazard: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
  healthcenter_hazard: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
  streetlight_wire: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?w=800',
  sidewalk_broken: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800',
  unrelated_clean_road: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800',
};

export async function seedPhase13DemoData() {
  console.log('========================================================================');
  console.log('NigamSetu: Phase 13 Comprehensive Demo Data Seeder');
  console.log('========================================================================\n');

  const adminClient = createAuthenticatedSupabaseClient(CLERK_ADMIN_ID, 'admin', undefined);

  // 1. Seed All Profiles Required for Foreign Keys
  console.log('1. Seeding all user profiles into public.profiles...');
  const demoProfiles: Array<{ id: string; role: string; ward_id: string | null; phone: string }> = [
    { id: CLERK_CITIZEN_ID, role: 'citizen', ward_id: null, phone: '+919876543201' },
    { id: 'citizen_test_user', role: 'citizen', ward_id: null, phone: '+919876543202' },
    { id: 'citizen_user_bellandur_2', role: 'citizen', ward_id: null, phone: '+919876543212' },
    { id: 'citizen_user_bellandur_3', role: 'citizen', ward_id: null, phone: '+919876543213' },
    { id: 'citizen_user_bellandur_4', role: 'citizen', ward_id: null, phone: '+919876543214' },
    { id: 'citizen_user_bellandur_5', role: 'citizen', ward_id: null, phone: '+919876543215' },
    { id: 'citizen_user_bellandur_6', role: 'citizen', ward_id: null, phone: '+919876543216' },
    { id: 'citizen_user_hsr_1', role: 'citizen', ward_id: null, phone: '+919876543217' },
    { id: 'citizen_user_hsr_2', role: 'citizen', ward_id: null, phone: '+919876543218' },
    { id: 'citizen_user_hsr_3', role: 'citizen', ward_id: null, phone: '+919876543219' },
    { id: 'citizen_user_kora_1', role: 'citizen', ward_id: null, phone: '+919876543220' },
    { id: 'citizen_user_kora_2', role: 'citizen', ward_id: null, phone: '+919876543221' },
    { id: 'citizen_user_kora_3', role: 'citizen', ward_id: null, phone: '+919876543222' },
    { id: CLERK_OFFICIAL_BELLANDUR_ID, role: 'official', ward_id: WARD_BELLANDUR, phone: '+919876543203' },
    { id: 'official_ward_bellandur', role: 'official', ward_id: WARD_BELLANDUR, phone: '+919876543204' },
    { id: CLERK_OFFICIAL_HSR_ID, role: 'official', ward_id: WARD_HSR, phone: '+919876543205' },
    { id: 'official_ward_hsr', role: 'official', ward_id: WARD_HSR, phone: '+919876543206' },
    { id: CLERK_OFFICIAL_KORAMANGALA_ID, role: 'official', ward_id: WARD_KORAMANGALA, phone: '+919876543207' },
    { id: 'official_ward_koramangala', role: 'official', ward_id: WARD_KORAMANGALA, phone: '+919876543208' },
    { id: CLERK_ADMIN_ID, role: 'admin', ward_id: null, phone: '+919876543209' },
    { id: 'admin_bbmp_controller', role: 'admin', ward_id: null, phone: '+919876543210' },
  ];

  for (const prof of demoProfiles) {
    const { error } = await adminClient.from('profiles').upsert(prof, { onConflict: 'id' });
    if (error) console.warn(`Profile upsert warning for ${prof.id}:`, error.message);
  }
  console.log(`  [OK] ${demoProfiles.length} profiles upserted.`);

  // 2. Prepare Escalation PDF and Storage URL
  console.log('2. Preparing escalation letter PDF...');
  const escalatedComplaintId = '13000000-0000-0000-0000-000000000001';
  let escalationLetterUrl = 'https://xlagdiqtedflkigftwov.supabase.co/storage/v1/object/public/escalation-letters/escalation_13000000_0000_0000_0000_000000000001.pdf';

  const letterBody = `FORM A - SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005

To:
The Public Information Officer / Ward Executive Engineer
Bruhat Bengaluru Mahanagara Palike (BBMP)
HSR Layout Ward Office, Sector 2, Bengaluru, Karnataka

Subject: Statutorily overdue raw sewage backflow on 14th Main, HSR Layout (Ref: #${escalatedComplaintId.slice(0, 8)})

1. Particulars of Applicant:
   Name: Aarav Sharma (Citizen Representative)
   Address: Sector 2, HSR Layout, Bengaluru - 560102

2. Particulars of Information Sought:
   (a) Complaint ID #${escalatedComplaintId} was registered regarding continuous raw sewage overflow posing grave public health and communicable disease hazard.
   (b) The Citizen Charter stipulates a mandatory 12-hour resolution SLA for category SEWAGE.
   (c) As of date, the statutory SLA has lapsed by over 48 hours without depot dispatch or field remediation.
   (d) Provide copies of contractor job cards, daily attendance logs, BWSSB inter-departmental notices, and reasons for failure to comply with Section 4 citizen charter norms.

Dated: ${new Date().toLocaleDateString('en-IN')}`;

  try {
    const pdfBytes = await generateEscalationPdf(
      letterBody,
      escalatedComplaintId,
      'Ward Executive Engineer - BBMP'
    );

    const { error: upErr } = await adminClient.storage
      .from('escalation-letters')
      .upload(`escalation_${escalatedComplaintId}.pdf`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (!upErr) {
      const { data: pubData } = adminClient.storage
        .from('escalation-letters')
        .getPublicUrl(`escalation_${escalatedComplaintId}.pdf`);
      if (pubData?.publicUrl) {
        escalationLetterUrl = pubData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('PDF generation note:', err);
  }

  // 3. Define 36 Complaints across 3 wards
  console.log('3. Seeding 36 realistic complaints across 3 wards...');

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();
  const hoursFromNow = (h: number) => new Date(now + h * 3600000).toISOString();

  interface ComplaintSeedDef {
    id: string;
    reporter_id: string;
    ward_id: string;
    category: 'road' | 'garbage' | 'sewage' | 'school' | 'healthcenter' | 'other';
    severity: number;
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'verified' | 'escalated' | 'rejected';
    description: string;
    image_url: string;
    lat: number;
    lng: number;
    address_text: string;
    sla_deadline: string;
    created_at: string;
    resolution_image_url?: string;
    resolution_location?: string;
    resolution_notes?: string;
    resolved_at?: string;
    verification_score?: number;
    verification_status?: 'pending' | 'verified' | 'passed' | 'failed' | 'manual_review';
    escalation_letter_url?: string;
    previous_status?: string;
    facility_id?: string;
    is_ghost_closure?: boolean;
    ghost_reason?: 'gps_mismatch' | 'hash_fake' | 'vision_rejection';
  }

  const complaints: ComplaintSeedDef[] = [
    // -----------------------------------------------------------------------
    // DEMO CITIZEN COMPLAINTS (4 tickets reported by demo.citizen and test citizen)
    // -----------------------------------------------------------------------
    {
      id: '13000000-0000-0000-0000-000000000001',
      reporter_id: CLERK_CITIZEN_ID,
      ward_id: WARD_HSR,
      category: 'sewage',
      severity: 4,
      status: 'escalated',
      description: 'Severe raw sewage overflow across pedestrian crossing and school approach',
      image_url: PHOTOS.sewage_overflow_1,
      lat: 12.9145,
      lng: 77.6482,
      address_text: '14th Main Road, Sector 2, HSR Layout, Bengaluru',
      sla_deadline: hoursAgo(48), // SLA breached by 48h!
      created_at: hoursAgo(60),
      escalation_letter_url: escalationLetterUrl,
      previous_status: 'open',
    },
    {
      id: '13000000-0000-0000-0000-000000000002',
      reporter_id: CLERK_CITIZEN_ID,
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 3,
      status: 'in_progress',
      description: 'Dangerous longitudinal asphalt crack expanding along Outer Ring Road curb',
      image_url: PHOTOS.pothole_crater_1,
      lat: 12.9342,
      lng: 77.6755,
      address_text: 'Outer Ring Road near Bellandur EcoSpace Flyover, Bengaluru',
      sla_deadline: hoursFromNow(24),
      created_at: hoursAgo(18),
      facility_id: 'b0000000-0000-0000-0000-000000000001',
    },
    {
      id: '13000000-0000-0000-0000-000000000003',
      reporter_id: CLERK_CITIZEN_ID,
      ward_id: WARD_HSR,
      category: 'garbage',
      severity: 3,
      status: 'resolved',
      description: 'Large commercial garbage dump accumulating next to public park gate',
      image_url: PHOTOS.garbage_overflow_1,
      lat: 12.9125,
      lng: 77.6438,
      address_text: '27th Main Road, Sector 1 Park, HSR Layout, Bengaluru',
      sla_deadline: hoursAgo(10),
      created_at: hoursAgo(34),
      // Ghost Closure #1: Re-uploaded before photo (hash match)
      resolution_image_url: PHOTOS.garbage_overflow_1,
      resolution_location: 'SRID=4326;POINT(77.6438 12.9125)',
      resolution_notes: 'Crew cleaned area and sanitized surrounding sidewalk.',
      resolved_at: hoursAgo(4),
      verification_score: 0.20,
      verification_status: 'failed',
      is_ghost_closure: true,
      ghost_reason: 'hash_fake',
    },
    {
      id: '13000000-0000-0000-0000-000000000004',
      reporter_id: CLERK_CITIZEN_ID,
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 3,
      status: 'verified',
      description: 'Deep impact pothole damaging two-wheelers outside Bellandur Post Office',
      image_url: PHOTOS.pothole_crater_2,
      lat: 12.9365,
      lng: 77.6712,
      address_text: '12th Cross, Bellandur Main Road, Bengaluru',
      sla_deadline: hoursAgo(12),
      created_at: hoursAgo(40),
      resolution_image_url: PHOTOS.pothole_repaired_1,
      resolution_location: 'SRID=4326;POINT(77.6713 12.9366)',
      resolution_notes: 'Hot-mix asphalt patch laid, compacted and cured.',
      resolved_at: hoursAgo(6),
      verification_score: 0.92,
      verification_status: 'passed',
    },

    // -----------------------------------------------------------------------
    // GHOST CLOSURE EXAMPLES (5 more to make 6 total)
    // -----------------------------------------------------------------------
    {
      // Ghost Closure #2: GPS Mismatch (>350m away)
      id: '13000000-0000-0000-0000-000000000005',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 3,
      status: 'resolved',
      description: 'Cavity on Green Glen Layout access road',
      image_url: PHOTOS.pothole_crater_3,
      lat: 12.9288,
      lng: 77.6695,
      address_text: 'Green Glen Layout 3rd Cross, Bellandur, Bengaluru',
      sla_deadline: hoursAgo(15),
      created_at: hoursAgo(38),
      resolution_image_url: PHOTOS.pothole_repaired_2,
      resolution_location: 'SRID=4326;POINT(77.6740 12.9325)', // ~450m away!
      resolution_notes: 'Repaired with asphalt emulsion patch.',
      resolved_at: hoursAgo(5),
      verification_score: 0.20,
      verification_status: 'failed',
      is_ghost_closure: true,
      ghost_reason: 'gps_mismatch',
    },
    {
      // Ghost Closure #3: Vision Rejection (Photo of unrelated clean road, sewage leak not fixed)
      id: '13000000-0000-0000-0000-000000000006',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_KORAMANGALA,
      category: 'sewage',
      severity: 4,
      status: 'resolved',
      description: 'Choked storm drain overflowing into apartment driveway',
      image_url: PHOTOS.sewage_overflow_2,
      lat: 12.9335,
      lng: 77.6255,
      address_text: '5th Block, 80 Feet Road, Koramangala, Bengaluru',
      sla_deadline: hoursAgo(8),
      created_at: hoursAgo(20),
      resolution_image_url: PHOTOS.unrelated_clean_road,
      resolution_location: 'SRID=4326;POINT(77.6256 12.9334)',
      resolution_notes: 'Jetting machine dispatched and line cleared.',
      resolved_at: hoursAgo(3),
      verification_score: 0.25,
      verification_status: 'failed',
      is_ghost_closure: true,
      ghost_reason: 'vision_rejection',
    },
    {
      // Ghost Closure #4: GPS Mismatch (>400m away)
      id: '13000000-0000-0000-0000-000000000007',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_BELLANDUR,
      category: 'other',
      severity: 2,
      status: 'resolved',
      description: 'Broken pedestrian sidewalk slab with exposed steel rebar',
      image_url: PHOTOS.sidewalk_broken,
      lat: 12.9385,
      lng: 77.6780,
      address_text: 'Devarabisanahalli Service Road, Bellandur, Bengaluru',
      sla_deadline: hoursAgo(6),
      created_at: hoursAgo(30),
      resolution_image_url: PHOTOS.unrelated_clean_road,
      resolution_location: 'SRID=4326;POINT(77.6825 12.9410)', // ~500m away!
      resolution_notes: 'Slab replaced with precast concrete unit.',
      resolved_at: hoursAgo(2),
      verification_score: 0.20,
      verification_status: 'failed',
      is_ghost_closure: true,
      ghost_reason: 'gps_mismatch',
    },
    {
      // Ghost Closure #5: Perceptual Hash Fake (Cropped before photo)
      id: '13000000-0000-0000-0000-000000000008',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_HSR,
      category: 'road',
      severity: 3,
      status: 'resolved',
      description: 'Large trench left unpaved after water pipeline repair',
      image_url: PHOTOS.pothole_crater_2,
      lat: 12.9180,
      lng: 77.6510,
      address_text: '19th Main Road, Sector 1, HSR Layout, Bengaluru',
      sla_deadline: hoursAgo(14),
      created_at: hoursAgo(42),
      resolution_image_url: PHOTOS.pothole_crater_2, // Re-upload!
      resolution_location: 'SRID=4326;POINT(77.6511 12.9181)',
      resolution_notes: 'Trench backfilled with wet mix macadam.',
      resolved_at: hoursAgo(4),
      verification_score: 0.20,
      verification_status: 'failed',
      is_ghost_closure: true,
      ghost_reason: 'hash_fake',
    },
    {
      // Ghost Closure #6: Vision Rejection (School boundary debris not cleaned)
      id: '13000000-0000-0000-0000-000000000009',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_KORAMANGALA,
      category: 'school',
      severity: 3,
      status: 'resolved',
      description: 'Broken school compound wall spilling masonry onto children footpath',
      image_url: PHOTOS.school_hazard,
      lat: 12.9390,
      lng: 77.6320,
      address_text: 'Koramangala 3rd Block Govt High School, Bengaluru',
      sla_deadline: hoursAgo(22),
      created_at: hoursAgo(52),
      resolution_image_url: PHOTOS.school_hazard,
      resolution_location: 'SRID=4326;POINT(77.6321 12.9391)',
      resolution_notes: 'Contractor cleared fallen bricks and secured perimeter.',
      resolved_at: hoursAgo(6),
      verification_score: 0.25,
      verification_status: 'failed',
      is_ghost_closure: true,
      ghost_reason: 'vision_rejection',
    },

    // -----------------------------------------------------------------------
    // SECOND VERIFIED COMPLAINT (Green Pin)
    // -----------------------------------------------------------------------
    {
      id: '13000000-0000-0000-0000-000000000010',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_HSR,
      category: 'garbage',
      severity: 2,
      status: 'verified',
      description: 'Litter bin overturned outside BMTC bus stop',
      image_url: PHOTOS.garbage_overflow_2,
      lat: 12.9095,
      lng: 77.6415,
      address_text: 'BMTC Bus Stop, 24th Main, Sector 2, HSR Layout, Bengaluru',
      sla_deadline: hoursAgo(18),
      created_at: hoursAgo(28),
      resolution_image_url: PHOTOS.garbage_cleared_1,
      resolution_location: 'SRID=4326;POINT(77.6416 12.9096)',
      resolution_notes: 'Sanitation vehicle emptied and disinfected bin surroundings.',
      resolved_at: hoursAgo(7),
      verification_score: 0.89,
      verification_status: 'passed',
    },

    // -----------------------------------------------------------------------
    // SLA BREACHED ACTIVE COMPLAINTS (Triggering Escalation Queue)
    // -----------------------------------------------------------------------
    {
      id: '13000000-0000-0000-0000-000000000011',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_BELLANDUR,
      category: 'garbage',
      severity: 3,
      status: 'open',
      description: 'Major black spot dump near Bellandur lake inlet accumulating plastic',
      image_url: PHOTOS.garbage_overflow_1,
      lat: 12.9370,
      lng: 77.6730,
      address_text: 'Lake View Road, Ward 150 Bellandur, Bengaluru',
      sla_deadline: hoursAgo(72), // 3 days overdue!
      created_at: hoursAgo(96),
    },
    {
      id: '13000000-0000-0000-0000-000000000012',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_KORAMANGALA,
      category: 'road',
      severity: 3,
      status: 'in_progress',
      description: 'Long asphalt trench left open across 4th Block intersection',
      image_url: PHOTOS.pothole_crater_3,
      lat: 12.9310,
      lng: 77.6280,
      address_text: '100 Feet Road, 4th Block, Koramangala, Bengaluru',
      sla_deadline: hoursAgo(48), // 2 days overdue!
      created_at: hoursAgo(120),
      facility_id: 'b0000000-0000-0000-0000-000000000005',
    },

    // -----------------------------------------------------------------------
    // DUPLICATE CLUSTER 1: Bellandur Outer Ring Road Crater (4 members)
    // -----------------------------------------------------------------------
    {
      id: '13000000-0000-0000-0000-000000000013',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 4,
      status: 'open',
      description: 'Massive crater pothole on Outer Ring Road under Bellandur flyover causing severe gridlock',
      image_url: PHOTOS.pothole_crater_1,
      lat: 12.9350,
      lng: 77.6740,
      address_text: 'Outer Ring Road, Bellandur, Bengaluru',
      sla_deadline: hoursFromNow(12),
      created_at: hoursAgo(10),
    },
    {
      id: '13000000-0000-0000-0000-000000000014',
      reporter_id: 'citizen_user_bellandur_2',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 4,
      status: 'open',
      description: 'Very deep pothole near EcoSpace bus stop under flyover',
      image_url: PHOTOS.pothole_crater_1,
      lat: 12.9351,
      lng: 77.6742,
      address_text: 'ORR near EcoSpace, Bellandur, Bengaluru',
      sla_deadline: hoursFromNow(12),
      created_at: hoursAgo(8),
    },
    {
      id: '13000000-0000-0000-0000-000000000015',
      reporter_id: 'citizen_user_bellandur_3',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 4,
      status: 'open',
      description: 'Huge hole in road near Bellandur flyover pillar 42',
      image_url: PHOTOS.pothole_crater_1,
      lat: 12.9349,
      lng: 77.6739,
      address_text: 'ORR Flyover Pillar 42, Bellandur, Bengaluru',
      sla_deadline: hoursFromNow(14),
      created_at: hoursAgo(6),
    },
    {
      id: '13000000-0000-0000-0000-000000000016',
      reporter_id: 'citizen_user_bellandur_4',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 4,
      status: 'open',
      description: 'Vehicle axle broke on this giant pothole near Bellandur EcoSpace',
      image_url: PHOTOS.pothole_crater_1,
      lat: 12.9352,
      lng: 77.6741,
      address_text: 'ORR Bellandur junction, Bengaluru',
      sla_deadline: hoursFromNow(16),
      created_at: hoursAgo(4),
    },

    // -----------------------------------------------------------------------
    // DUPLICATE CLUSTER 2: HSR Sector 2 Garbage Spot (3 members)
    // -----------------------------------------------------------------------
    {
      id: '13000000-0000-0000-0000-000000000017',
      reporter_id: 'citizen_user_hsr_1',
      ward_id: WARD_HSR,
      category: 'garbage',
      severity: 3,
      status: 'assigned',
      description: 'Continuous dumping of vegetable and plastic waste near 14th Main junction',
      image_url: PHOTOS.garbage_overflow_1,
      lat: 12.9160,
      lng: 77.6460,
      address_text: '14th Main Road, Sector 2, HSR Layout, Bengaluru',
      sla_deadline: hoursFromNow(18),
      created_at: hoursAgo(14),
      facility_id: 'b0000000-0000-0000-0000-000000000003',
    },
    {
      id: '13000000-0000-0000-0000-000000000018',
      reporter_id: 'citizen_user_hsr_2',
      ward_id: WARD_HSR,
      category: 'garbage',
      severity: 3,
      status: 'assigned',
      description: 'Stray dogs tearing garbage bags on 14th Main cross',
      image_url: PHOTOS.garbage_overflow_1,
      lat: 12.9161,
      lng: 77.6462,
      address_text: '14th Main Cross, Sector 2, HSR Layout, Bengaluru',
      sla_deadline: hoursFromNow(20),
      created_at: hoursAgo(11),
      facility_id: 'b0000000-0000-0000-0000-000000000003',
    },
    {
      id: '13000000-0000-0000-0000-000000000019',
      reporter_id: 'citizen_user_hsr_3',
      ward_id: WARD_HSR,
      category: 'garbage',
      severity: 3,
      status: 'assigned',
      description: 'Overflowing community dumper on 14th Main HSR',
      image_url: PHOTOS.garbage_overflow_1,
      lat: 12.9159,
      lng: 77.6459,
      address_text: 'Sector 2 Corner, HSR Layout, Bengaluru',
      sla_deadline: hoursFromNow(22),
      created_at: hoursAgo(9),
      facility_id: 'b0000000-0000-0000-0000-000000000003',
    },

    // -----------------------------------------------------------------------
    // DUPLICATE CLUSTER 3: Koramangala 5th Block Sewage Leak (3 members)
    // -----------------------------------------------------------------------
    {
      id: '13000000-0000-0000-0000-000000000020',
      reporter_id: 'citizen_user_kora_1',
      ward_id: WARD_KORAMANGALA,
      category: 'sewage',
      severity: 4,
      status: 'open',
      description: 'Manhole gushing black sewage water onto road near 5th Block Post Office',
      image_url: PHOTOS.sewage_overflow_1,
      lat: 12.9348,
      lng: 77.6262,
      address_text: '5th Block, 1st Cross, Koramangala, Bengaluru',
      sla_deadline: hoursFromNow(8),
      created_at: hoursAgo(5),
    },
    {
      id: '13000000-0000-0000-0000-000000000021',
      reporter_id: 'citizen_user_kora_2',
      ward_id: WARD_KORAMANGALA,
      category: 'sewage',
      severity: 4,
      status: 'open',
      description: 'Sewage overflow near post office 5th block Koramangala',
      image_url: PHOTOS.sewage_overflow_1,
      lat: 12.9349,
      lng: 77.6264,
      address_text: 'Near Post Office, Koramangala 5th Block, Bengaluru',
      sla_deadline: hoursFromNow(9),
      created_at: hoursAgo(4),
    },
    {
      id: '13000000-0000-0000-0000-000000000022',
      reporter_id: 'citizen_user_kora_3',
      ward_id: WARD_KORAMANGALA,
      category: 'sewage',
      severity: 4,
      status: 'open',
      description: 'Foul-smelling drain water flooding pedestrian walk',
      image_url: PHOTOS.sewage_overflow_1,
      lat: 12.9347,
      lng: 77.6261,
      address_text: '1st Cross, Koramangala 5th Block, Bengaluru',
      sla_deadline: hoursFromNow(10),
      created_at: hoursAgo(3),
    },

    // -----------------------------------------------------------------------
    // DUPLICATE CLUSTER 4: Bellandur Central Mall Road Cave-in (2 members)
    // -----------------------------------------------------------------------
    {
      id: '13000000-0000-0000-0000-000000000023',
      reporter_id: 'citizen_user_bellandur_5',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 3,
      status: 'assigned',
      description: 'Asphalt subsidence near Bellandur Central Mall exit',
      image_url: PHOTOS.pothole_crater_2,
      lat: 12.9280,
      lng: 77.6680,
      address_text: 'Opposite Central Mall, Bellandur, Bengaluru',
      sla_deadline: hoursFromNow(30),
      created_at: hoursAgo(15),
      facility_id: 'b0000000-0000-0000-0000-000000000001',
    },
    {
      id: '13000000-0000-0000-0000-000000000024',
      reporter_id: 'citizen_user_bellandur_6',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      severity: 3,
      status: 'assigned',
      description: 'Depression forming in road surface near mall',
      image_url: PHOTOS.pothole_crater_2,
      lat: 12.9282,
      lng: 77.6682,
      address_text: 'Central Mall Service Road, Bellandur, Bengaluru',
      sla_deadline: hoursFromNow(32),
      created_at: hoursAgo(13),
      facility_id: 'b0000000-0000-0000-0000-000000000001',
    },

    // -----------------------------------------------------------------------
    // ADDITIONAL REALISTIC CIVIC ISSUES (12 more to reach 36)
    // -----------------------------------------------------------------------
    {
      id: '13000000-0000-0000-0000-000000000025',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_BELLANDUR,
      category: 'healthcenter',
      severity: 2,
      status: 'open',
      description: 'Bio-waste bin broken outside Bellandur Urban Health Center',
      image_url: PHOTOS.healthcenter_hazard,
      lat: 12.9410,
      lng: 77.6710,
      address_text: 'Bellandur Primary Health Center Road, Bengaluru',
      sla_deadline: hoursFromNow(40),
      created_at: hoursAgo(8),
    },
    {
      id: '13000000-0000-0000-0000-000000000026',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_BELLANDUR,
      category: 'school',
      severity: 2,
      status: 'open',
      description: 'Stagnant rainwater pool breeding mosquitoes near govt primary school gate',
      image_url: PHOTOS.sewage_overflow_2,
      lat: 12.9320,
      lng: 77.6650,
      address_text: 'Near Govt School, Bellandur Village, Bengaluru',
      sla_deadline: hoursFromNow(96),
      created_at: hoursAgo(24),
    },
    {
      id: '13000000-0000-0000-0000-000000000027',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_BELLANDUR,
      category: 'other',
      severity: 1,
      status: 'rejected',
      description: 'Minor hairline cracks on recently concreted alleyway',
      image_url: PHOTOS.sidewalk_broken,
      lat: 12.9230,
      lng: 77.6640,
      address_text: '4th Cross, Green Glen Layout, Bellandur, Bengaluru',
      sla_deadline: hoursAgo(100),
      created_at: hoursAgo(150),
    },
    {
      id: '13000000-0000-0000-0000-000000000028',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_HSR,
      category: 'other',
      severity: 4,
      status: 'open',
      description: 'High voltage junction wire dangling near bus shelter following storm',
      image_url: PHOTOS.streetlight_wire,
      lat: 12.9110,
      lng: 77.6530,
      address_text: '19th Main, Sector 2, HSR Layout, Bengaluru',
      sla_deadline: hoursFromNow(4),
      created_at: hoursAgo(2),
    },
    {
      id: '13000000-0000-0000-0000-000000000029',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_HSR,
      category: 'road',
      severity: 2,
      status: 'assigned',
      description: 'Sunken water valve chamber cover causing speed bump jolt',
      image_url: PHOTOS.pothole_crater_3,
      lat: 12.9060,
      lng: 77.6470,
      address_text: '22nd Cross, Sector 3, HSR Layout, Bengaluru',
      sla_deadline: hoursFromNow(50),
      created_at: hoursAgo(16),
      facility_id: 'b0000000-0000-0000-0000-000000000003',
    },
    {
      id: '13000000-0000-0000-0000-000000000030',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_HSR,
      category: 'healthcenter',
      severity: 2,
      status: 'in_progress',
      description: 'Rubble obstructing ambulance ramp at community health post',
      image_url: PHOTOS.healthcenter_hazard,
      lat: 12.9175,
      lng: 77.6390,
      address_text: 'Sector 7 Dispensary, HSR Layout, Bengaluru',
      sla_deadline: hoursFromNow(36),
      created_at: hoursAgo(12),
      facility_id: 'b0000000-0000-0000-0000-000000000003',
    },
    {
      id: '13000000-0000-0000-0000-000000000031',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_HSR,
      category: 'school',
      severity: 2,
      status: 'open',
      description: 'Damaged speed breaker outside primary nursery entrance',
      image_url: PHOTOS.pothole_crater_1,
      lat: 12.9210,
      lng: 77.6440,
      address_text: 'Sector 4 School Zone, HSR Layout, Bengaluru',
      sla_deadline: hoursFromNow(120),
      created_at: hoursAgo(18),
    },
    {
      id: '13000000-0000-0000-0000-000000000032',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_KORAMANGALA,
      category: 'garbage',
      severity: 2,
      status: 'open',
      description: 'Market vegetable waste dumped outside Koramangala BDA Complex',
      image_url: PHOTOS.garbage_overflow_2,
      lat: 12.9355,
      lng: 77.6180,
      address_text: 'BDA Complex, 3rd Block, Koramangala, Bengaluru',
      sla_deadline: hoursFromNow(16),
      created_at: hoursAgo(7),
    },
    {
      id: '13000000-0000-0000-0000-000000000033',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_KORAMANGALA,
      category: 'road',
      severity: 2,
      status: 'assigned',
      description: 'Pothole patch peeled off by heavy truck movement on Sarjapur road link',
      image_url: PHOTOS.pothole_crater_2,
      lat: 12.9275,
      lng: 77.6220,
      address_text: 'Koramangala 1st Block Main Road, Bengaluru',
      sla_deadline: hoursFromNow(48),
      created_at: hoursAgo(14),
      facility_id: 'b0000000-0000-0000-0000-000000000005',
    },
    {
      id: '13000000-0000-0000-0000-000000000034',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_KORAMANGALA,
      category: 'healthcenter',
      severity: 3,
      status: 'in_progress',
      description: 'Waterlogged approach road preventing patient drop-offs at clinic',
      image_url: PHOTOS.sewage_overflow_2,
      lat: 12.9420,
      lng: 77.6290,
      address_text: '6th Block Hospital Road, Koramangala, Bengaluru',
      sla_deadline: hoursFromNow(20),
      created_at: hoursAgo(28),
      facility_id: 'b0000000-0000-0000-0000-000000000006',
    },
    {
      id: '13000000-0000-0000-0000-000000000035',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_KORAMANGALA,
      category: 'other',
      severity: 1,
      status: 'open',
      description: 'Loose paving blocks dislodged on tree planter ring',
      image_url: PHOTOS.sidewalk_broken,
      lat: 12.9375,
      lng: 77.6360,
      address_text: '4th Block Park Perimeter, Koramangala, Bengaluru',
      sla_deadline: hoursFromNow(140),
      created_at: hoursAgo(10),
    },
    {
      id: '13000000-0000-0000-0000-000000000036',
      reporter_id: 'citizen_test_user',
      ward_id: WARD_KORAMANGALA,
      category: 'road',
      severity: 2,
      status: 'open',
      description: 'Cobblestone depression on interior residential cross',
      image_url: PHOTOS.pothole_crater_3,
      lat: 12.9295,
      lng: 77.6335,
      address_text: '7th Block, 8th Main, Koramangala, Bengaluru',
      sla_deadline: hoursFromNow(60),
      created_at: hoursAgo(11),
    },
  ];

  // Insert Complaints
  for (const c of complaints) {
    const complaintRow: Record<string, any> = {
      id: c.id,
      reporter_id: c.reporter_id,
      ward_id: c.ward_id,
      category: c.category,
      severity: c.severity,
      status: c.status,
      description: c.description,
      image_url: c.image_url,
      location: `SRID=4326;POINT(${c.lng} ${c.lat})`,
      address_text: c.address_text,
      sla_deadline: c.sla_deadline,
      created_at: c.created_at,
    };

    if (c.resolution_image_url) {
      complaintRow.resolution_image_url = c.resolution_image_url;
      complaintRow.resolution_location = c.resolution_location;
      complaintRow.resolution_notes = c.resolution_notes;
      complaintRow.resolved_at = c.resolved_at;
      complaintRow.verification_score = c.verification_score;
      complaintRow.verification_status = c.verification_status;
    }

    if (c.escalation_letter_url) {
      complaintRow.escalation_letter_url = c.escalation_letter_url;
      complaintRow.previous_status = c.previous_status;
    }

    if (c.facility_id) {
      complaintRow.facility_id = c.facility_id;
    }

    const { error: insErr } = await adminClient.from('complaints').upsert(complaintRow, { onConflict: 'id' });
    if (insErr) {
      console.warn(`Complaint upsert warning for ${c.id}:`, insErr.message);
    }
  }
  console.log(`  [OK] ${complaints.length} complaints seeded.`);

  // 4. Seed Clusters and Cluster Members
  console.log('4. Seeding duplicate clusters and member links...');
  const clusters = [
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      centroid: 'SRID=4326;POINT(77.6740 12.9350)',
      complaint_count: 4,
      representative_id: '13000000-0000-0000-0000-000000000013',
      members: [
        '13000000-0000-0000-0000-000000000013',
        '13000000-0000-0000-0000-000000000014',
        '13000000-0000-0000-0000-000000000015',
        '13000000-0000-0000-0000-000000000016',
      ],
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      ward_id: WARD_HSR,
      category: 'garbage',
      centroid: 'SRID=4326;POINT(77.6460 12.9160)',
      complaint_count: 3,
      representative_id: '13000000-0000-0000-0000-000000000017',
      members: [
        '13000000-0000-0000-0000-000000000017',
        '13000000-0000-0000-0000-000000000018',
        '13000000-0000-0000-0000-000000000019',
      ],
    },
    {
      id: 'c1000000-0000-0000-0000-000000000003',
      ward_id: WARD_KORAMANGALA,
      category: 'sewage',
      centroid: 'SRID=4326;POINT(77.6262 12.9348)',
      complaint_count: 3,
      representative_id: '13000000-0000-0000-0000-000000000020',
      members: [
        '13000000-0000-0000-0000-000000000020',
        '13000000-0000-0000-0000-000000000021',
        '13000000-0000-0000-0000-000000000022',
      ],
    },
    {
      id: 'c1000000-0000-0000-0000-000000000004',
      ward_id: WARD_BELLANDUR,
      category: 'road',
      centroid: 'SRID=4326;POINT(77.6681 12.9281)',
      complaint_count: 2,
      representative_id: '13000000-0000-0000-0000-000000000023',
      members: [
        '13000000-0000-0000-0000-000000000023',
        '13000000-0000-0000-0000-000000000024',
      ],
    },
  ];

  for (const cl of clusters) {
    const { error: clErr } = await adminClient.from('complaint_clusters').upsert({
      id: cl.id,
      representative_id: cl.representative_id,
      complaint_count: cl.complaint_count,
      centroid: cl.centroid,
      bounding_radius: 25.0,
      status: 'open',
    }, { onConflict: 'id' });

    if (clErr) {
      console.warn(`Cluster upsert warning for ${cl.id}:`, clErr.message);
    }

    for (const mId of cl.members) {
      await adminClient.from('cluster_members').upsert({
        cluster_id: cl.id,
        complaint_id: mId,
      }, { onConflict: 'cluster_id,complaint_id' });

      // Update cluster_id on all member complaints
      await adminClient.from('complaints').update({
        cluster_id: cl.id,
      }).eq('id', mId);
    }
  }
  console.log('  [OK] 4 duplicate clusters seeded with members.');

  // 5. Seed Escalation Table Record
  console.log('5. Seeding escalation record...');
  const { error: escErr } = await adminClient.from('escalations').upsert({
    id: 'e1000000-0000-0000-0000-000000000001',
    complaint_id: escalatedComplaintId,
    trigger_reason: 'sla_breach',
    letter_content: letterBody,
    letter_url: escalationLetterUrl,
    status: 'draft',
    authority: 'ward_officer',
    deadline: new Date(now + 7 * 86400000).toISOString().split('T')[0],
  }, { onConflict: 'id' });

  if (escErr) {
    console.warn('Escalation record upsert warning:', escErr.message);
  } else {
    console.log('  [OK] Escalation record seeded.');
  }

  // 6. Seed Complete Agent Traces (Transparent Audit Trail for All 5 Tools)
  console.log('6. Seeding comprehensive agent audit traces...');

  const traces: any[] = [];

  // 6.1 Severity Scoring Traces for Complaints
  for (const c of complaints) {
    const prompt = `Rate the severity of the ${c.category} issue in this image on a scale of 1-4 with civic rationale: ${c.description}`;
    const rawRes = {
      severity: c.severity,
      reason: `${c.category.toUpperCase()} defect categorized as severity ${c.severity}: ${c.description}.`,
    };

    traces.push({
      complaint_id: c.id,
      tool_name: 'scoreSeverity',
      model_used: 'gemini-1.5-flash',
      latency_ms: 650 + Math.floor(Math.random() * 400),
      input_summary: {
        complaintId: c.id,
        imageUrl: c.image_url,
        category: c.category,
        description: c.description,
        prompt: prompt,
      },
      output_summary: {
        severity: c.severity,
        reason: `${c.category.toUpperCase()} defect categorized as severity ${c.severity}.`,
        raw_response: JSON.stringify(rawRes),
        rawResponse: JSON.stringify(rawRes),
      },
      created_at: c.created_at,
    });
  }

  // 6.2 Duplicate Clustering Traces
  for (const cl of clusters) {
    const rawRes = {
      clusterId: cl.id,
      isDuplicate: true,
      complaintCount: cl.complaint_count,
      members: cl.members,
    };

    traces.push({
      complaint_id: cl.representative_id,
      tool_name: 'checkDuplicate',
      model_used: 'postgis-dbscan-phash',
      latency_ms: 120,
      input_summary: {
        complaintId: cl.representative_id,
        wardId: cl.ward_id,
        category: cl.category,
        prompt: 'ST_DWithin proximity (100m) and 64-bit DCT pHash comparison',
      },
      output_summary: {
        isDuplicate: true,
        clusterId: cl.id,
        complaintCount: cl.complaint_count,
        raw_response: JSON.stringify(rawRes),
      },
      created_at: hoursAgo(8),
    });
  }

  // 6.3 Resolution Verification Traces (Ghost Closures + Verified Tickets)
  const verificationComplaints = complaints.filter(
    (c) => c.status === 'verified' || c.is_ghost_closure
  );

  for (const vc of verificationComplaints) {
    const isVerified = vc.status === 'verified';
    let gpsMatch = true;
    let hashDiff = true;
    let visionVerdict = true;
    let checkReason = 'All 4 verification checks passed: GPS within 10m, distinct resolution photo, and AI vision confirms complete fix.';

    if (vc.is_ghost_closure) {
      if (vc.ghost_reason === 'gps_mismatch') {
        gpsMatch = false;
        checkReason = 'GPS Check Failed: Repair photo location is >100m away from reported coordinates. Closure rejected.';
      } else if (vc.ghost_reason === 'hash_fake') {
        hashDiff = false;
        checkReason = 'Perceptual Hash Failed: Repair photo is identical or re-uploaded original complaint photo (Hamming distance < 5). Fraudulent closure flagged.';
      } else if (vc.ghost_reason === 'vision_rejection') {
        visionVerdict = false;
        checkReason = 'Vision Analysis Failed: Gemini AI vision analysis detected ongoing defect or unrelated scene. Remediation not substantiated.';
      }
    }

    const rawRes = {
      gps_match: gpsMatch,
      hash_different: hashDiff,
      vision_verdict: visionVerdict,
      composite_score: vc.verification_score,
      reason: checkReason,
    };

    traces.push({
      complaint_id: vc.id,
      tool_name: 'verifyResolution',
      model_used: 'gemini-1.5-pro',
      latency_ms: 1200 + Math.floor(Math.random() * 500),
      input_summary: {
        complaintId: vc.id,
        beforeImageUrl: vc.image_url,
        afterImageUrl: vc.resolution_image_url,
        beforeCoordinates: [vc.lng, vc.lat],
        afterCoordinates: vc.resolution_location,
        prompt: 'Compare before and after photos with GPS and perceptual hash validation.',
      },
      output_summary: {
        verified: isVerified,
        score: vc.verification_score,
        checks: {
          gps: gpsMatch,
          hash: hashDiff,
          vision: visionVerdict,
        },
        reason: checkReason,
        compositeScore: vc.verification_score,
        raw_response: JSON.stringify(rawRes),
        rawResponse: JSON.stringify(rawRes),
      },
      created_at: vc.resolved_at || hoursAgo(4),
    });
  }

  // 6.4 Escalation Tool Trace
  const escRawRes = {
    format: 'rti',
    authority: 'ward_officer',
    authorityTitle: 'Ward Executive Engineer - BBMP',
    pdfUrl: escalationLetterUrl,
  };

  traces.push({
    complaint_id: escalatedComplaintId,
    tool_name: 'generateEscalation',
    model_used: 'gemini-1.5-pro',
    latency_ms: 980,
    input_summary: {
      complaintId: escalatedComplaintId,
      trigger: 'sla_breach',
      category: 'sewage',
      wardName: 'Ward 174 - HSR Layout',
      severity: 4,
      prompt: 'Draft formal municipal escalation notice under Right to Information Act / Citizen Charter norms.',
    },
    output_summary: {
      format: 'rti',
      authority: 'ward_officer',
      pdfUrl: escalationLetterUrl,
      raw_response: JSON.stringify(escRawRes),
    },
    created_at: hoursAgo(3),
  });

  // 6.5 NL Chat Tool Trace
  const chatRawRes = {
    sqlQuery: 'SELECT id, address_text, severity, created_at FROM complaints WHERE ward_id = $1 AND category = \'road\' AND created_at < NOW() - INTERVAL \'48 hours\'',
    count: 2,
  };

  traces.push({
    complaint_id: null,
    tool_name: 'answerChat',
    model_used: 'gemini-1.5-pro',
    latency_ms: 820,
    input_summary: {
      query: 'Which potholes have been pending for more than 48 hours in HSR Layout?',
      wardId: WARD_HSR,
      prompt: 'Translate natural language municipal query into parameter-safe SQL.',
    },
    output_summary: {
      answer: 'Found 2 road complaints in Ward 174 (HSR Layout) pending beyond 48 hours: #13000000 on 19th Main and #c0000000 on 27th Main.',
      sqlExecuted: 'SELECT id, address_text, severity, created_at FROM complaints WHERE ward_id = $1 AND category = \'road\' AND created_at < NOW() - INTERVAL \'48 hours\'',
      count: 2,
      raw_response: JSON.stringify(chatRawRes),
    },
    created_at: hoursAgo(1),
  });

  for (const t of traces) {
    const { error: trErr } = await adminClient.from('agent_traces').insert(t);
    if (trErr) {
      console.warn(`Trace insert notice for ${t.tool_name}:`, trErr.message);
    }
  }
  console.log(`  [OK] ${traces.length} agent audit traces seeded.`);

  console.log('\n========================================================================');
  console.log('✓ Phase 13 Demo Dataset successfully seeded!');
  console.log('========================================================================');
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed-phase-13-data')) {
  seedPhase13DemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
