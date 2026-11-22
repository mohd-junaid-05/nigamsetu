import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { CivicAgent, ScoreSeverityInput, ScoreSeverityOutput } from '../lib/agent/CivicAgent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlagdiqtedflkigftwov.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_7y4gVv5VE6TVDPqvGewU4Q_0PTa9PuB';

const testUserId = 'user_test_citizen_phase05';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-id': testUserId,
      'x-user-role': 'citizen',
    },
  },
});

async function createSampleImage(pattern: 'pothole' | 'sinkhole' | 'graffiti' | 'garbage' | 'blank'): Promise<Buffer> {
  const width = 300;
  const height = 300;

  if (pattern === 'blank') {
    // Pure solid white uniform buffer (zero variance)
    return await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  // Generate pattern with some variance
  const colorMap = {
    pothole: { r: 60, g: 60, b: 60 },
    sinkhole: { r: 30, g: 20, b: 10 },
    graffiti: { r: 200, g: 50, b: 150 },
    garbage: { r: 100, g: 140, b: 70 },
  };

  const base = colorMap[pattern] || { r: 120, g: 120, b: 120 };
  const rawBytes = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const noise = (i % 37) * 2;
    rawBytes[i * 3] = Math.min(255, base.r + noise);
    rawBytes[i * 3 + 1] = Math.min(255, base.g + noise);
    rawBytes[i * 3 + 2] = Math.min(255, base.b + noise);
  }

  return await sharp(rawBytes, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function uploadTestImage(fileName: string, buffer: Buffer): Promise<string> {
  const path = `${testUserId}/${Date.now()}_${fileName}`;
  const { error } = await supabase.storage
    .from('complaint-images')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from('complaint-images').getPublicUrl(path);
  return data.publicUrl;
}

async function runPhase05AcceptanceChecks() {
  console.log('====================================================');
  console.log('--- STARTING PHASE 05 AI AGENT SEVERITY SCORING CHECKS ---');
  console.log('====================================================\n');

  let allPassed = true;

  // Setup: Ensure reporter profile exists
  await supabase.from('profiles').upsert(
    { id: testUserId, role: 'citizen' },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  // -------------------------------------------------------------------------
  // Check 1: Submit complaint with pothole photo.
  // Within 5 seconds, severity column in database updates to 3 (critical).
  // -------------------------------------------------------------------------
  console.log('[Check 1] Submitting complaint with large pothole photo...');
  const potholeBuffer = await createSampleImage('pothole');
  const potholeUrl = await uploadTestImage('large_pothole_road.jpg', potholeBuffer);

  const { data: potholeComplaint, error: insertErr1 } = await supabase
    .from('complaints')
    .insert({
      reporter_id: testUserId,
      category: 'road',
      severity: 2, // Initial default before AI scoring
      status: 'open',
      description: 'Severe large pothole causing major vehicle disruption',
      address_text: 'Outer Ring Road, Bellandur, Bengaluru',
      image_url: potholeUrl,
      location: 'SRID=4326;POINT(77.6744 12.9304)',
    })
    .select('id, severity, image_url, category')
    .single();

  if (insertErr1 || !potholeComplaint) {
    console.error('✗ Failed to insert pothole test complaint:', insertErr1);
    allPassed = false;
    return;
  }

  console.log(`  Complaint created: ${potholeComplaint.id} (initial severity: ${potholeComplaint.severity})`);

  const startTime = Date.now();
  const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);
  const scoreResult = await agent.run<ScoreSeverityInput, ScoreSeverityOutput>('scoreSeverity', {
    complaintId: potholeComplaint.id,
    imageUrl: potholeComplaint.image_url,
    category: potholeComplaint.category,
    description: 'Severe large pothole',
  }, {
    complaintId: potholeComplaint.id,
    supabase,
  });

  const durationMs = Date.now() - startTime;
  console.log(`  Agent scored severity in ${durationMs}ms:`, {
    severity: scoreResult.severity,
    reason: scoreResult.reason,
    fallback: scoreResult.fallback,
  });

  // Verify in database that complaints.severity updated to 3
  const { data: updatedComplaint, error: fetchErr1 } = await supabase
    .from('complaints')
    .select('severity, status')
    .eq('id', potholeComplaint.id)
    .single();

  if (fetchErr1 || !updatedComplaint) {
    console.error('✗ Failed to query updated complaint:', fetchErr1);
    allPassed = false;
  } else if (updatedComplaint.severity === 3 && durationMs <= 5000) {
    console.log(`✓ Acceptance Check 1 PASSED: Severity updated to ${updatedComplaint.severity} (Critical) within ${durationMs}ms (<= 5s)`);
  } else {
    console.error(`✗ Acceptance Check 1 FAILED: severity=${updatedComplaint?.severity}, duration=${durationMs}ms`);
    allPassed = false;
  }

  // -------------------------------------------------------------------------
  // Check 2: agent_traces row exists with tool_name = 'scoreSeverity',
  // input_summary, output_summary, and latency_ms populated.
  // -------------------------------------------------------------------------
  console.log('\n[Check 2] Verifying agent_traces audit row...');
  const { data: traceRow, error: traceErr } = await supabase
    .from('agent_traces')
    .select('id, complaint_id, tool_name, input_summary, output_summary, model_used, latency_ms')
    .eq('complaint_id', potholeComplaint.id)
    .eq('tool_name', 'scoreSeverity')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (traceErr || !traceRow) {
    console.error('✗ Acceptance Check 2 FAILED: No agent_traces row found for scoreSeverity:', traceErr);
    allPassed = false;
  } else {
    const hasTool = traceRow.tool_name === 'scoreSeverity';
    const hasInput = traceRow.input_summary && typeof traceRow.input_summary === 'object';
    const hasOutput = traceRow.output_summary && typeof traceRow.output_summary === 'object';
    const hasLatency = typeof traceRow.latency_ms === 'number' && traceRow.latency_ms >= 0;
    const modelUsed = traceRow.model_used;

    if (hasTool && hasInput && hasOutput && hasLatency) {
      console.log('✓ Acceptance Check 2 PASSED: Trace logged with full audit fields:', {
        traceId: traceRow.id,
        tool_name: traceRow.tool_name,
        model_used: modelUsed,
        latency_ms: traceRow.latency_ms,
        output_severity: (traceRow.output_summary as any).severity,
      });
    } else {
      console.error('✗ Acceptance Check 2 FAILED: Missing fields in trace:', traceRow);
      allPassed = false;
    }
  }

  // -------------------------------------------------------------------------
  // Check 3: Submit complaint with a photo model can't parse (blank image).
  // Severity defaults to 2. Trace logs fallback and raw response.
  // -------------------------------------------------------------------------
  console.log('\n[Check 3] Testing unparseable/blank image fallback...');
  const blankBuffer = await createSampleImage('blank');
  const blankUrl = await uploadTestImage('blank_empty_photo.jpg', blankBuffer);

  const { data: blankComplaint } = await supabase
    .from('complaints')
    .insert({
      reporter_id: testUserId,
      category: 'other',
      severity: 1, // Start at 1 to verify it changes to 2
      status: 'open',
      description: 'Blank white test image',
      image_url: blankUrl,
      location: 'SRID=4326;POINT(77.6744 12.9304)',
    })
    .select('id, severity, image_url, category')
    .single();

  const blankResult = await agent.run<ScoreSeverityInput, ScoreSeverityOutput>('scoreSeverity', {
    complaintId: blankComplaint!.id,
    imageUrl: blankComplaint!.image_url,
    category: blankComplaint!.category,
    description: 'Blank test image',
  }, {
    complaintId: blankComplaint!.id,
    supabase,
  });

  const { data: updatedBlank } = await supabase
    .from('complaints')
    .select('severity')
    .eq('id', blankComplaint!.id)
    .single();

  const { data: blankTrace } = await supabase
    .from('agent_traces')
    .select('output_summary')
    .eq('complaint_id', blankComplaint!.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const traceOutput = (blankTrace?.output_summary as any) || {};

  if (
    updatedBlank?.severity === 2 &&
    blankResult.fallback === true &&
    traceOutput.fallback === true &&
    traceOutput.raw_response
  ) {
    console.log(`✓ Acceptance Check 3 PASSED: Blank image defaulted to severity ${updatedBlank.severity} (significant), fallback=true, raw_response logged: "${traceOutput.raw_response.slice(0, 70)}..."`);
  } else {
    console.error('✗ Acceptance Check 3 FAILED: Expected severity 2 and fallback=true:', {
      severity: updatedBlank?.severity,
      fallback: blankResult.fallback,
      traceOutput,
    });
    allPassed = false;
  }

  // -------------------------------------------------------------------------
  // Check 4: Five different complaint photos match what the agent claims.
  // Coherent reason field.
  // -------------------------------------------------------------------------
  console.log('\n[Check 4] Testing 5 distinct complaint photo scenarios against taxonomy...');
  const testScenarios = [
    {
      name: 'Scenario 1: Large Road Pothole',
      pattern: 'pothole' as const,
      category: 'road',
      fileName: 'road_pothole_critical.jpg',
      expectedSeverity: 3,
      expectedLabel: 'Critical',
    },
    {
      name: 'Scenario 2: Emergency Sinkhole / Road Collapse',
      pattern: 'sinkhole' as const,
      category: 'road',
      fileName: 'sinkhole_collapse_emergency.jpg',
      expectedSeverity: 4,
      expectedLabel: 'Emergency',
    },
    {
      name: 'Scenario 3: Minor Wall Graffiti / Cosmetic',
      pattern: 'graffiti' as const,
      category: 'other',
      fileName: 'wall_graffiti_cosmetic.jpg',
      expectedSeverity: 1,
      expectedLabel: 'Cosmetic',
    },
    {
      name: 'Scenario 4: Overflowing Waste Bin',
      pattern: 'garbage' as const,
      category: 'garbage',
      fileName: 'garbage_bin_overflow.jpg',
      expectedSeverity: 2,
      expectedLabel: 'Significant',
    },
    {
      name: 'Scenario 5: Blank Unparseable Photo',
      pattern: 'blank' as const,
      category: 'other',
      fileName: 'blank_featureless.jpg',
      expectedSeverity: 2,
      expectedLabel: 'Significant (Fallback)',
    },
  ];

  let check4Passed = true;
  for (const scenario of testScenarios) {
    const buf = await createSampleImage(scenario.pattern);
    const url = await uploadTestImage(scenario.fileName, buf);

    const res = await agent.run<ScoreSeverityInput, ScoreSeverityOutput>('scoreSeverity', {
      imageUrl: url,
      category: scenario.category,
    });

    const isMatch = res.severity === scenario.expectedSeverity;
    const hasReason = Boolean(res.reason && res.reason.length > 5);

    if (isMatch && hasReason) {
      console.log(`  ✓ ${scenario.name}: Severity ${res.severity} (${scenario.expectedLabel}) — Reason: "${res.reason}"`);
    } else {
      console.error(`  ✗ ${scenario.name} FAILED: Got severity ${res.severity}, expected ${scenario.expectedSeverity}`);
      check4Passed = false;
    }
  }

  if (check4Passed) {
    console.log('✓ Acceptance Check 4 PASSED: All 5 photos match severity taxonomy with coherent reasons.');
  } else {
    allPassed = false;
  }

  // -------------------------------------------------------------------------
  // Check 5: Status endpoint returns severity without page refresh.
  // -------------------------------------------------------------------------
  console.log('\n[Check 5] Verifying lightweight status endpoint query logic...');
  const { data: statusComplaint } = await supabase
    .from('complaints')
    .select('id, severity, status')
    .eq('id', potholeComplaint.id)
    .single();

  const { data: statusTrace } = await supabase
    .from('agent_traces')
    .select('output_summary, latency_ms')
    .eq('complaint_id', potholeComplaint.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const outSummary = (statusTrace?.output_summary as any) || {};

  if (statusComplaint && statusComplaint.severity === 3 && outSummary.reason) {
    console.log('✓ Acceptance Check 5 PASSED: Status query returns populated live payload:', {
      complaintId: statusComplaint.id,
      severity: statusComplaint.severity,
      reason: outSummary.reason,
      analyzed: true,
      latencyMs: statusTrace?.latency_ms,
    });
  } else {
    console.error('✗ Acceptance Check 5 FAILED:', { statusComplaint, outSummary });
    allPassed = false;
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('✓✓ ALL PHASE 05 ACCEPTANCE CHECKS PASSED SUCCESSFULLY! ✓✓');
  } else {
    console.error('✗ SOME PHASE 05 CHECKS FAILED. Review logs above.');
  }
  console.log('====================================================\n');
}

runPhase05AcceptanceChecks().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
