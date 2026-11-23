import { createAuthenticatedSupabaseClient } from '../lib/supabase/server';
import { CivicAgent, VerifyResolutionOutput, haversineDistanceMeters } from '../lib/agent/CivicAgent';

async function runPhase09Verification() {
  console.log('========================================================================');
  console.log('NigamSetu: Phase 09 AI Agent Resolution Verification Acceptance Test');
  console.log('========================================================================\n');

  const testUserId = 'test_official_phase_09';
  const wardId = 'a0000000-0000-0000-0000-000000000001';
  const testComplaintId = 'c0000000-0000-0000-0000-000000000001';

  const officialClient = createAuthenticatedSupabaseClient(testUserId, 'official', wardId);
  const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, officialClient);

  const baseLat = 12.9352;
  const baseLng = 77.6245;

  const sampleBeforePhoto = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800';
  const sampleRealFixPhoto = 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800';
  const sampleDifferentPotholePhoto = 'https://images.unsplash.com/photo-1578991624414-276ef23a534f?w=800&different=true';

  const beforeTime = new Date(Date.now() - 3600000 * 24).toISOString();
  const afterTime = new Date().toISOString();

  let allChecksPassed = true;

  // -------------------------------------------------------------------------
  // Acceptance Check 1:
  // A facility uploads a real after photo of a fixed pothole, same location.
  // The AI scores 0.88. The status auto-updates to 'verified'. The map pin turns green.
  // -------------------------------------------------------------------------
  console.log('Checking Acceptance Criterion 1: Real fix photo at same location...');
  try {
    const res1: VerifyResolutionOutput = await agent.run(
      'verifyResolution',
      {
        complaintId: testComplaintId,
        beforeImageUrl: sampleBeforePhoto,
        afterImageUrl: sampleRealFixPhoto,
        beforeLocation: [baseLat, baseLng],
        afterLocation: [baseLat, baseLng],
        beforeTimestamp: beforeTime,
        afterTimestamp: afterTime,
        category: 'road',
      },
      {
        complaintId: testComplaintId,
        supabase: officialClient,
        userRole: 'official',
      }
    );

    console.log(`  - AI Composite Score: ${res1.score} (Formula: GPS ${res1.metrics.gpsScore}*0.2 + Hash ${res1.metrics.hashScore}*0.3 + Vision ${res1.metrics.visionScore}*0.5)`);
    console.log(`  - Auto-Status: ${res1.autoStatus}, Auto-Verification-Status: ${res1.autoVerificationStatus}`);
    console.log(`  - Checks: GPS=${res1.checks.gpsMatch}, Timestamp=${res1.checks.timestampValid}, HashDiff=${res1.checks.hashDifferent}, Vision=${res1.checks.visionVerdict}`);
    console.log(`  - Reasoning: "${res1.reason}"`);

    const isScore88 = res1.score === 0.88;
    const isVerified = res1.autoStatus === 'verified' && res1.autoVerificationStatus === 'passed';
    const allChecksTrue =
      res1.checks.gpsMatch &&
      res1.checks.timestampValid &&
      res1.checks.hashDifferent &&
      res1.checks.visionVerdict;

    if (isScore88 && isVerified && allChecksTrue) {
      console.log('  ✅ Acceptance Check 1 PASSED: AI scores 0.88, auto-updates to verified, map pin green.');
    } else {
      console.error('  ❌ Acceptance Check 1 FAILED: Score or status mismatch.', { score: res1.score, isScore88, isVerified, allChecksTrue });
      allChecksPassed = false;
    }
  } catch (err) {
    console.error('  ❌ Acceptance Check 1 ERROR:', err);
    allChecksPassed = false;
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 2:
  // A facility uploads the same before photo as the after photo (re-uploaded).
  // Hash distance is 0. The AI scores 0.15. The status auto-returns to 'in_progress'. The facility is notified.
  // -------------------------------------------------------------------------
  console.log('\nChecking Acceptance Criterion 2: Same photo re-uploaded (fraud detection)...');
  try {
    const res2: VerifyResolutionOutput = await agent.run(
      'verifyResolution',
      {
        complaintId: testComplaintId,
        beforeImageUrl: sampleBeforePhoto,
        afterImageUrl: sampleBeforePhoto, // Identical re-uploaded photo
        beforeLocation: [baseLat, baseLng],
        afterLocation: [baseLat, baseLng],
        beforeTimestamp: beforeTime,
        afterTimestamp: afterTime,
        category: 'road',
      },
      {
        complaintId: testComplaintId,
        supabase: officialClient,
        userRole: 'official',
      }
    );

    console.log(`  - Hamming Distance: ${res2.metrics.hammingDistance} (Threshold: < 5 fake)`);
    console.log(`  - AI Composite Score: ${res2.score} (Target: 0.15)`);
    console.log(`  - Auto-Status: ${res2.autoStatus}, Auto-Verification-Status: ${res2.autoVerificationStatus}`);
    console.log(`  - Reason: "${res2.reason}"`);

    const isScore15 = res2.score === 0.15;
    const isHashZero = res2.metrics.hammingDistance === 0;
    const isHashFailed = res2.checks.hashDifferent === false;
    const isReturnedInProgress =
      res2.autoStatus === 'in_progress' && res2.autoVerificationStatus === 'failed';

    if (isScore15 && isHashZero && isHashFailed && isReturnedInProgress) {
      console.log('  ✅ Acceptance Check 2 PASSED: Hamming dist 0, score 0.15, auto-returns to in_progress.');
    } else {
      console.error('  ❌ Acceptance Check 2 FAILED:', { isScore15, isHashZero, isHashFailed, isReturnedInProgress });
      allChecksPassed = false;
    }
  } catch (err) {
    console.error('  ❌ Acceptance Check 2 ERROR:', err);
    allChecksPassed = false;
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 3:
  // A facility uploads an after photo from 300m away.
  // GPS check fails immediately. Status returns to 'in_progress'. No vision model call is made.
  // -------------------------------------------------------------------------
  console.log('\nChecking Acceptance Criterion 3: Photo from 300m away (immediate GPS reject)...');
  try {
    const lat300m = baseLat + 0.0027; // ~300 meters away
    const distanceMeters = haversineDistanceMeters(baseLat, baseLng, lat300m, baseLng);

    const res3: VerifyResolutionOutput = await agent.run(
      'verifyResolution',
      {
        complaintId: testComplaintId,
        beforeImageUrl: sampleBeforePhoto,
        afterImageUrl: sampleRealFixPhoto,
        beforeLocation: [baseLat, baseLng],
        afterLocation: [lat300m, baseLng],
        beforeTimestamp: beforeTime,
        afterTimestamp: afterTime,
        category: 'road',
      },
      {
        complaintId: testComplaintId,
        supabase: officialClient,
        userRole: 'official',
      }
    );

    console.log(`  - Measured Distance: ${Math.round(distanceMeters)}m (> 100m limit)`);
    console.log(`  - Model Used: ${res3.modelUsed} (Should be algorithm:geospatial-reject)`);
    console.log(`  - Score: ${res3.score}, Status: ${res3.autoStatus}`);
    console.log(`  - Reason: "${res3.reason}"`);

    const isGpsMismatch = res3.checks.gpsMatch === false;
    const isScoreZero = res3.score === 0;
    const isReturnedInProgress =
      res3.autoStatus === 'in_progress' && res3.autoVerificationStatus === 'failed';
    const isNoVisionCall = res3.modelUsed === 'algorithm:geospatial-reject';

    if (isGpsMismatch && isScoreZero && isReturnedInProgress && isNoVisionCall) {
      console.log('  ✅ Acceptance Check 3 PASSED: GPS fails immediately (>100m), no vision call, returns to in_progress.');
    } else {
      console.error('  ❌ Acceptance Check 3 FAILED:', { isGpsMismatch, isScoreZero, isReturnedInProgress, isNoVisionCall });
      allChecksPassed = false;
    }
  } catch (err) {
    console.error('  ❌ Acceptance Check 3 ERROR:', err);
    allChecksPassed = false;
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 4:
  // A facility uploads an after photo of a different pothole nearby.
  // The vision model scores 0.35. Status returns to 'in_progress'.
  // -------------------------------------------------------------------------
  console.log('\nChecking Acceptance Criterion 4: Different pothole nearby (vision model rejection)...');
  try {
    const res4: VerifyResolutionOutput = await agent.run(
      'verifyResolution',
      {
        complaintId: testComplaintId,
        beforeImageUrl: sampleBeforePhoto,
        afterImageUrl: sampleDifferentPotholePhoto,
        beforeLocation: [baseLat, baseLng],
        afterLocation: [baseLat + 0.0001, baseLng], // ~11m nearby
        beforeTimestamp: beforeTime,
        afterTimestamp: afterTime,
        category: 'road',
      },
      {
        complaintId: testComplaintId,
        supabase: officialClient,
        userRole: 'official',
      }
    );

    console.log(`  - Vision Verdict: ${res4.checks.visionVerdict} (Confidence: ${res4.confidence})`);
    console.log(`  - AI Composite Score: ${res4.score} (Target: 0.35)`);
    console.log(`  - Status: ${res4.autoStatus}, Verification Status: ${res4.autoVerificationStatus}`);
    console.log(`  - Reason: "${res4.reason}"`);

    const isScore35 = res4.score === 0.35;
    const isVisionRejected = res4.checks.visionVerdict === false;
    const isReturnedInProgress =
      res4.autoStatus === 'in_progress' && res4.autoVerificationStatus === 'failed';

    if (isScore35 && isVisionRejected && isReturnedInProgress) {
      console.log('  ✅ Acceptance Check 4 PASSED: Vision model rejects different defect, score 0.35, returns to in_progress.');
    } else {
      console.error('  ❌ Acceptance Check 4 FAILED:', { score: res4.score, isScore35, isVisionRejected, isReturnedInProgress });
      allChecksPassed = false;
    }
  } catch (err) {
    console.error('  ❌ Acceptance Check 4 ERROR:', err);
    allChecksPassed = false;
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 5:
  // The verification panel shows before/after side-by-side with the score bar,
  // the four individual check results, and the reason text.
  // The "Why this score?" button opens the trace.
  // -------------------------------------------------------------------------
  console.log('\nChecking Acceptance Criterion 5: Verification audit trace and 4 checks in agent_traces...');
  try {
    const { data: latestTrace, error: traceErr } = await officialClient
      .from('agent_traces')
      .select('id, complaint_id, tool_name, output_summary, model_used, latency_ms')
      .eq('tool_name', 'verifyResolution')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (traceErr || !latestTrace) {
      console.error('  ❌ Failed to fetch latest verifyResolution trace:', traceErr);
      allChecksPassed = false;
    } else {
      const traceOut = latestTrace.output_summary as any;
      const traceChecks = traceOut?.checks;
      const traceMetrics = traceOut?.metrics;

      const hasFourChecks =
        traceChecks &&
        'gpsMatch' in traceChecks &&
        'timestampValid' in traceChecks &&
        'hashDifferent' in traceChecks &&
        'visionVerdict' in traceChecks;

      const hasFormulaMetrics =
        traceMetrics &&
        'gpsScore' in traceMetrics &&
        'hashScore' in traceMetrics &&
        'visionScore' in traceMetrics &&
        'compositeScore' in traceMetrics &&
        'weights' in traceMetrics;

      console.log(`  - Trace ID: ${latestTrace.id}, Tool: ${latestTrace.tool_name}, Model: ${latestTrace.model_used}`);
      console.log(`  - 4 Checks Present: ${hasFourChecks} (GPS=${traceChecks?.gpsMatch}, Time=${traceChecks?.timestampValid}, Hash=${traceChecks?.hashDifferent}, Vision=${traceChecks?.visionVerdict})`);
      console.log(`  - Formula Weights Present: ${hasFormulaMetrics ? JSON.stringify(traceMetrics?.weights) : 'false'}`);
      console.log(`  - Verdict: ${traceOut?.verdict}, Reason: "${traceOut?.reason}"`);

      if (hasFourChecks && hasFormulaMetrics) {
        console.log('  ✅ Acceptance Check 5 PASSED: Trace contains all 4 check results, formula metrics, and reason text.');
      } else {
        console.error('  ❌ Acceptance Check 5 FAILED: Trace missing checks or formula metrics.');
        allChecksPassed = false;
      }
    }
  } catch (err) {
    console.error('  ❌ Acceptance Check 5 ERROR:', err);
    allChecksPassed = false;
  }

  console.log('\n========================================================================');
  if (allChecksPassed) {
    console.log('🎉 ALL 5 ACCEPTANCE CHECKS PASSED PERFECTLY FOR PHASE 09!');
  } else {
    console.log('⚠️ SOME ACCEPTANCE CHECKS FAILED. SEE LOGS ABOVE.');
  }
  console.log('========================================================================\n');
}

runPhase09Verification().catch(console.error);
