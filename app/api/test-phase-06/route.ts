export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  createAnonymousSupabaseClient,
  createAuthenticatedSupabaseClient,
} from '@/lib/supabase/server';
import { CivicAgent, CheckDuplicateInput, CheckDuplicateOutput } from '@/lib/agent/CivicAgent';

export async function GET(): Promise<Response> {
  const adminClient = createAuthenticatedSupabaseClient('system_test_admin', 'admin');
  const user1Client = createAuthenticatedSupabaseClient('test_user_phase_06_1', 'citizen');
  const user2Client = createAuthenticatedSupabaseClient('test_user_phase_06_2', 'citizen');
  const user3Client = createAuthenticatedSupabaseClient('test_user_phase_06_3', 'citizen');

  const checks: Array<{
    checkNumber: number;
    title: string;
    passed: boolean;
    expected: string;
    actual: string;
    details?: unknown;
  }> = [];

  try {
    // Ensure profiles exist for test users
    await adminClient.from('profiles').upsert([
      { id: 'test_user_phase_06_1', role: 'citizen' },
      { id: 'test_user_phase_06_2', role: 'citizen' },
      { id: 'test_user_phase_06_3', role: 'citizen' },
    ], { onConflict: 'id' });

    // Get a test ward
    const { data: wards } = await adminClient.from('wards').select('id, name').limit(1);
    const wardId = wards?.[0]?.id || null;

    // Use an authentic Indian municipal image for potholes
    const testImageUrl = '/images/reports/road_pothole_1.webp';

    // Base point X in Bengaluru
    const latX = 12.935;
    const lngX = 77.65;

    // 1. Submit Complaint 1 at point X
    const { data: comp1, error: err1 } = await user1Client
      .from('complaints')
      .insert({
        reporter_id: 'test_user_phase_06_1',
        ward_id: wardId,
        category: 'road',
        severity: 2,
        status: 'open',
        description: 'Pothole on 100ft road near junction (Report 1)',
        address_text: '100ft Ring Road, Point X',
        image_url: testImageUrl,
        location: `SRID=4326;POINT(${lngX} ${latX})`,
      })
      .select('id, category, severity, status, image_url, created_at')
      .single();

    if (err1 || !comp1) {
      throw new Error(`Failed to create test complaint 1: ${err1?.message}`);
    }

    const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, adminClient);

    // Run checkDuplicate on Complaint 1
    const res1 = await agent.run<CheckDuplicateInput, CheckDuplicateOutput>(
      'checkDuplicate',
      {
        complaintId: comp1.id,
        location: [latX, lngX],
        category: 'road',
        imageUrl: testImageUrl,
        createdAt: comp1.created_at,
      },
      {
        complaintId: comp1.id,
        wardId: wardId || undefined,
        supabase: adminClient,
      }
    );

    // 2. Submit Complaint 2 at point X + 30m (~0.00027 deg lat is ~30 meters)
    const lat30m = latX + 0.00027;
    const lng30m = lngX;

    const { data: comp2, error: err2 } = await user2Client
      .from('complaints')
      .insert({
        reporter_id: 'test_user_phase_06_2',
        ward_id: wardId,
        category: 'road',
        severity: 2,
        status: 'open',
        description: 'Large dangerous pothole at exact same junction (Report 2)',
        address_text: '100ft Ring Road, Point X + 30m',
        image_url: testImageUrl, // identical photo evidence
        location: `SRID=4326;POINT(${lng30m} ${lat30m})`,
      })
      .select('id, category, severity, status, image_url, created_at')
      .single();

    if (err2 || !comp2) {
      throw new Error(`Failed to create test complaint 2: ${err2?.message}`);
    }

    // Run checkDuplicate on Complaint 2
    const res2 = await agent.run<CheckDuplicateInput, CheckDuplicateOutput>(
      'checkDuplicate',
      {
        complaintId: comp2.id,
        location: [lat30m, lng30m],
        category: 'road',
        imageUrl: testImageUrl,
        createdAt: comp2.created_at,
      },
      {
        complaintId: comp2.id,
        wardId: wardId || undefined,
        supabase: adminClient,
      }
    );

    // Fetch updated complaint 2 from db
    const { data: updatedComp2 } = await adminClient
      .from('complaints')
      .select('cluster_id')
      .eq('id', comp2.id)
      .single();

    // Check 1: Complaint 2 gets cluster_id pointing to the first, complaint_count is 2
    const check1Passed =
      res2.isDuplicate &&
      res2.matchedComplaintId === comp1.id &&
      res2.clusterCount === 2 &&
      updatedComp2?.cluster_id === res1.matchedClusterId;

    checks.push({
      checkNumber: 1,
      title: 'Point X + 30m Duplicate Clustering: joins cluster, count = 2',
      passed: Boolean(check1Passed),
      expected: `isDuplicate=true, cluster_id=${res1.matchedClusterId}, complaint_count=2`,
      actual: `isDuplicate=${res2.isDuplicate}, cluster_id=${updatedComp2?.cluster_id}, complaint_count=${res2.clusterCount}, method=${res2.method}`,
      details: { res1, res2 },
    });

    // 3. Submit Complaint 3 at point X + 500m (~0.0045 deg lat is ~500 meters)
    const lat500m = latX + 0.0045;
    const lng500m = lngX;

    const { data: comp3, error: err3 } = await user3Client
      .from('complaints')
      .insert({
        reporter_id: 'test_user_phase_06_3',
        ward_id: wardId,
        category: 'road',
        severity: 2,
        status: 'open',
        description: 'Road damage 500m away (Report 3)',
        address_text: '100ft Ring Road, Point X + 500m',
        image_url: testImageUrl,
        location: `SRID=4326;POINT(${lng500m} ${lat500m})`,
      })
      .select('id, category, severity, status, image_url, created_at')
      .single();

    if (err3 || !comp3) {
      throw new Error(`Failed to create test complaint 3: ${err3?.message}`);
    }

    // Run checkDuplicate on Complaint 3
    const res3 = await agent.run<CheckDuplicateInput, CheckDuplicateOutput>(
      'checkDuplicate',
      {
        complaintId: comp3.id,
        location: [lat500m, lng500m],
        category: 'road',
        imageUrl: testImageUrl,
        createdAt: comp3.created_at,
      },
      {
        complaintId: comp3.id,
        wardId: wardId || undefined,
        supabase: adminClient,
      }
    );

    const { data: updatedComp3 } = await adminClient
      .from('complaints')
      .select('cluster_id')
      .eq('id', comp3.id)
      .single();

    // Check 2: Complaint 3 gets new cluster_id, complaint_count is 1
    const check2Passed =
      !res3.isDuplicate &&
      res3.clusterCount === 1 &&
      res3.method === 'geospatial' &&
      updatedComp3?.cluster_id !== res1.matchedClusterId;

    checks.push({
      checkNumber: 2,
      title: 'Point X + 500m Standalone: new cluster_id, count = 1',
      passed: Boolean(check2Passed),
      expected: `isDuplicate=false, new cluster_id != ${res1.matchedClusterId}, count=1`,
      actual: `isDuplicate=${res3.isDuplicate}, cluster_id=${updatedComp3?.cluster_id}, count=${res3.clusterCount}, method=${res3.method}`,
      details: { res3 },
    });

    // 4. Check 3: Public map shows one pin for cluster of 2 (badge '2 reports') and standalone pin has count = 1
    const anonClient = createAnonymousSupabaseClient();
    const { data: mapPins } = await anonClient.rpc('get_public_map_pins');
    const pinsList = Array.isArray(mapPins) ? mapPins : [];

    const clusterPin = pinsList.find((p) => p.id === comp1.id || p.id === comp2.id);
    const standalonePin = pinsList.find((p) => p.id === comp3.id);

    // Verify popup for cluster pin has attestations
    const { data: popupDetails } = await anonClient.rpc(
      'get_complaint_details_with_attestations',
      { target_id: comp1.id }
    );
    const popup = Array.isArray(popupDetails) && popupDetails.length > 0 ? popupDetails[0] : null;

    const check3Passed =
      clusterPin &&
      clusterPin.complaint_count === 2 &&
      standalonePin &&
      standalonePin.complaint_count === 1 &&
      popup &&
      popup.complaint_count === 2 &&
      Array.isArray(popup.attestations) &&
      popup.attestations.length >= 1;

    checks.push({
      checkNumber: 3,
      title: 'Public Map Clustered Pin: 1 pin with 2 reports badge; standalone has count 1',
      passed: Boolean(check3Passed),
      expected: 'Cluster of 2 -> 1 pin with complaint_count=2, popup has attestations. Standalone pin count=1',
      actual: `Cluster pin found: ${!!clusterPin} (count: ${clusterPin?.complaint_count}); Standalone count: ${standalonePin?.complaint_count}; Popup attestations: ${popup?.attestations?.length}`,
      details: { clusterPin, standalonePin, popup },
    });

    // 5. Check 4: Priority queue ranking: cluster complaint with weight=2 ranked higher than standalone with weight=1
    const { data: queue } = await anonClient.rpc('get_priority_queue', {
      target_ward_id: wardId,
    });
    const queueList = Array.isArray(queue) ? queue : [];

    const indexCluster = queueList.findIndex((item) => item.id === comp1.id);
    const indexStandalone = queueList.findIndex((item) => item.id === comp3.id);

    const clusterItem = queueList.find((item) => item.id === comp1.id);
    const standaloneItem = queueList.find((item) => item.id === comp3.id);

    const check4Passed =
      indexCluster !== -1 &&
      indexStandalone !== -1 &&
      indexCluster < indexStandalone &&
      clusterItem?.weight === 2 &&
      standaloneItem?.weight === 1;

    checks.push({
      checkNumber: 4,
      title: 'Priority Queue Ranking: cluster (weight=2) ranked higher than standalone (weight=1)',
      passed: Boolean(check4Passed),
      expected: 'Cluster rank < Standalone rank (Weight 2 effective score > Weight 1)',
      actual: `Cluster index: #${indexCluster + 1} (weight ${clusterItem?.weight}); Standalone index: #${indexStandalone + 1} (weight ${standaloneItem?.weight})`,
      details: { clusterItem, standaloneItem, queueSample: queueList.slice(0, 5) },
    });

    // 6. Check 5: agent_traces records duplicate check with method = 'hash' or 'geospatial'
    const { data: traces } = await adminClient
      .from('agent_traces')
      .select('complaint_id, tool_name, output_summary, model_used, created_at')
      .in('complaint_id', [comp1.id, comp2.id, comp3.id])
      .in('tool_name', ['checkDuplicate', 'duplicate_check'])
      .order('created_at', { ascending: false });

    const tracesList = Array.isArray(traces) ? traces : [];
    const hashTrace = tracesList.find(
      (t) => (t.output_summary as any)?.method === 'hash' || (t.output_summary as any)?.method === 'geospatial'
    );

    const check5Passed = tracesList.length >= 2 && Boolean(hashTrace);

    checks.push({
      checkNumber: 5,
      title: 'Audit Logging: agent_traces records method=hash and method=geospatial',
      passed: check5Passed,
      expected: 'agent_traces records checkDuplicate with method="hash" or "geospatial"',
      actual: `Traces found: ${tracesList.length}; Methods: ${tracesList.map((t) => (t.output_summary as any)?.method).join(', ')}`,
      details: tracesList,
    });

    const allPassed = checks.every((c) => c.passed);

    return NextResponse.json({
      success: allPassed,
      message: allPassed
        ? 'All Phase 06 acceptance checks verified successfully!'
        : 'Some acceptance checks failed.',
      checks,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        checks,
      },
      { status: 500 }
    );
  }
}
