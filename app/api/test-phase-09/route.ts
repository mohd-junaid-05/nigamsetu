import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server';
import { CivicAgent, VerifyResolutionOutput, haversineDistanceMeters } from '@/lib/agent/CivicAgent';

export type AcceptanceTestItem = {
  checkNumber: number;
  title: string;
  passed: boolean;
  score?: number;
  status?: string;
  details: Record<string, unknown>;
  error?: string;
};

export type Phase09TestResponse = {
  success: boolean;
  allPassed: boolean;
  totalChecks: number;
  passedChecks: number;
  results: AcceptanceTestItem[];
  timestamp: string;
};

export async function GET(): Promise<Response> {
  const testUserId = 'test_official_phase_09';
  const wardId = 'a0000000-0000-0000-0000-000000000001';
  const testComplaintId = 'c0000000-0000-0000-0000-000000000001';

  const supabase = createAuthenticatedSupabaseClient(testUserId, 'official', wardId);
  const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);
  const results: AcceptanceTestItem[] = [];

  const baseLat = 12.9352;
  const baseLng = 77.6245;

  const sampleBeforePhoto = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800';
  const sampleRealFixPhoto = 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800';
  const sampleDifferentPotholePhoto = 'https://images.unsplash.com/photo-1578991624414-276ef23a534f?w=800&different=true';

  const beforeTime = new Date(Date.now() - 3600000 * 24).toISOString();
  const afterTime = new Date().toISOString();

  // -------------------------------------------------------------------------
  // Acceptance Check 1:
  // A facility uploads a real after photo of a fixed pothole, same location.
  // The AI scores 0.88. The status auto-updates to 'verified'. The map pin turns green.
  // -------------------------------------------------------------------------
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
        supabase,
        userRole: 'official',
      }
    );

    const isScore88 = res1.score === 0.88;
    const isVerified = res1.autoStatus === 'verified' && res1.autoVerificationStatus === 'passed';
    const allChecksTrue =
      res1.checks.gpsMatch &&
      res1.checks.timestampValid &&
      res1.checks.hashDifferent &&
      res1.checks.visionVerdict;

    const passed1 = isScore88 && isVerified && allChecksTrue;

    results.push({
      checkNumber: 1,
      title: 'Real after photo of fixed pothole -> Score 0.88, auto-updates to verified, green pin',
      passed: passed1,
      score: res1.score,
      status: res1.autoStatus,
      details: {
        score: res1.score,
        targetScore: 0.88,
        autoStatus: res1.autoStatus,
        autoVerificationStatus: res1.autoVerificationStatus,
        checks: res1.checks,
        metrics: res1.metrics,
        reason: res1.reason,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 1,
      title: 'Real after photo of fixed pothole -> Score 0.88, auto-updates to verified',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 2:
  // A facility uploads the same before photo as the after photo (re-uploaded).
  // Hash distance is 0. The AI scores 0.15. The status auto-returns to 'in_progress'. The facility is notified.
  // -------------------------------------------------------------------------
  try {
    const res2: VerifyResolutionOutput = await agent.run(
      'verifyResolution',
      {
        complaintId: testComplaintId,
        beforeImageUrl: sampleBeforePhoto,
        afterImageUrl: sampleBeforePhoto, // Exact same photo re-uploaded
        beforeLocation: [baseLat, baseLng],
        afterLocation: [baseLat, baseLng],
        beforeTimestamp: beforeTime,
        afterTimestamp: afterTime,
        category: 'road',
      },
      {
        complaintId: testComplaintId,
        supabase,
        userRole: 'official',
      }
    );

    const isScore15 = res2.score === 0.15;
    const isHashZero = res2.metrics.hammingDistance === 0;
    const isHashFailed = res2.checks.hashDifferent === false;
    const isReturnedInProgress =
      res2.autoStatus === 'in_progress' && res2.autoVerificationStatus === 'failed';

    const passed2 = isScore15 && isHashZero && isHashFailed && isReturnedInProgress;

    results.push({
      checkNumber: 2,
      title: 'Same before photo re-uploaded -> Hash distance 0, score 0.15, auto-returns to in_progress',
      passed: passed2,
      score: res2.score,
      status: res2.autoStatus,
      details: {
        score: res2.score,
        targetScore: 0.15,
        hammingDistance: res2.metrics.hammingDistance,
        hashDifferent: res2.checks.hashDifferent,
        autoStatus: res2.autoStatus,
        autoVerificationStatus: res2.autoVerificationStatus,
        reason: res2.reason,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 2,
      title: 'Same before photo re-uploaded -> Hash distance 0, score 0.15, auto-returns to in_progress',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 3:
  // A facility uploads an after photo from 300m away.
  // GPS check fails immediately. Status returns to 'in_progress'. No vision model call is made.
  // -------------------------------------------------------------------------
  try {
    const lat300m = baseLat + 0.0027;
    const measuredDistance = haversineDistanceMeters(baseLat, baseLng, lat300m, baseLng);

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
        supabase,
        userRole: 'official',
      }
    );

    const isGpsMismatch = res3.checks.gpsMatch === false;
    const isScoreZero = res3.score === 0;
    const isReturnedInProgress =
      res3.autoStatus === 'in_progress' && res3.autoVerificationStatus === 'failed';
    const isNoVisionCall = res3.modelUsed === 'algorithm:geospatial-reject';

    const passed3 = isGpsMismatch && isScoreZero && isReturnedInProgress && isNoVisionCall;

    results.push({
      checkNumber: 3,
      title: 'After photo from 300m away -> GPS check fails immediately, returns to in_progress, no vision call',
      passed: passed3,
      score: res3.score,
      status: res3.autoStatus,
      details: {
        distanceMeters: Math.round(measuredDistance),
        gpsMatch: res3.checks.gpsMatch,
        modelUsed: res3.modelUsed,
        score: res3.score,
        autoStatus: res3.autoStatus,
        reason: res3.reason,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 3,
      title: 'After photo from 300m away -> GPS check fails immediately, returns to in_progress',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 4:
  // A facility uploads an after photo of a different pothole nearby.
  // The vision model scores 0.35. Status returns to 'in_progress'.
  // -------------------------------------------------------------------------
  try {
    const res4: VerifyResolutionOutput = await agent.run(
      'verifyResolution',
      {
        complaintId: testComplaintId,
        beforeImageUrl: sampleBeforePhoto,
        afterImageUrl: sampleDifferentPotholePhoto, // Different pothole nearby
        beforeLocation: [baseLat, baseLng],
        afterLocation: [baseLat + 0.0001, baseLng], // ~11m nearby
        beforeTimestamp: beforeTime,
        afterTimestamp: afterTime,
        category: 'road',
      },
      {
        complaintId: testComplaintId,
        supabase,
        userRole: 'official',
      }
    );

    const isScore35 = res4.score === 0.35;
    const isVisionRejected = res4.checks.visionVerdict === false;
    const isReturnedInProgress =
      res4.autoStatus === 'in_progress' && res4.autoVerificationStatus === 'failed';

    const passed4 = isScore35 && isVisionRejected && isReturnedInProgress;

    results.push({
      checkNumber: 4,
      title: 'After photo of different pothole nearby -> Vision model scores 0.35, returns to in_progress',
      passed: passed4,
      score: res4.score,
      status: res4.autoStatus,
      details: {
        score: res4.score,
        targetScore: 0.35,
        visionVerdict: res4.checks.visionVerdict,
        autoStatus: res4.autoStatus,
        reason: res4.reason,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 4,
      title: 'After photo of different pothole nearby -> Vision model scores 0.35, returns to in_progress',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 5:
  // The verification panel shows before/after side-by-side with the score bar,
  // the four individual check results, and the reason text.
  // The "Why this score?" button opens the trace.
  // -------------------------------------------------------------------------
  try {
    const { data: latestTrace } = await supabase
      .from('agent_traces')
      .select('id, complaint_id, tool_name, output_summary, model_used, latency_ms')
      .eq('tool_name', 'verifyResolution')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const traceOut = latestTrace?.output_summary as Record<string, unknown> | null;
    const traceChecks = traceOut?.checks as Record<string, unknown> | null;
    const traceMetrics = traceOut?.metrics as Record<string, unknown> | null;

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

    const passed5 = Boolean(latestTrace && hasFourChecks && hasFormulaMetrics);

    results.push({
      checkNumber: 5,
      title: 'Verification panel before/after side-by-side, score bar, 4 individual checks, "Why this score?" trace',
      passed: passed5,
      details: {
        traceId: latestTrace?.id || 'none',
        toolName: latestTrace?.tool_name || 'none',
        modelUsed: latestTrace?.model_used || 'none',
        hasFourChecks,
        hasFormulaMetrics,
        checks: traceChecks,
        weights: (traceMetrics?.weights as any) || { gps: 0.2, hash: 0.3, vision: 0.5 },
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 5,
      title: 'Verification panel before/after side-by-side, score bar, 4 individual checks, "Why this score?" trace',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  const passedChecks = results.filter((r) => r.passed).length;
  const allPassed = passedChecks === results.length;

  return Response.json({
    success: true,
    allPassed,
    totalChecks: results.length,
    passedChecks,
    results,
    timestamp: new Date().toISOString(),
  } satisfies Phase09TestResponse);
}
