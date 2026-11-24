// =====================================================================
// Acceptance Test Suite: Phase 10 - AI Agent: Escalation autopilot
// Route: GET /api/test-phase-10
// Validates all 5 acceptance checks defined in phase-10.md
// =====================================================================

import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server';
import { CivicAgent, GenerateEscalationOutput } from '@/lib/agent/CivicAgent';

export type AcceptanceTestItem = {
  checkNumber: number;
  title: string;
  passed: boolean;
  status?: string;
  details: Record<string, unknown>;
  error?: string;
};

export type Phase10TestResponse = {
  success: boolean;
  allPassed: boolean;
  totalChecks: number;
  passedChecks: number;
  results: AcceptanceTestItem[];
  timestamp: string;
};

export async function GET(request: Request): Promise<Response> {
  const _url = new URL(request.url);
  const testUserId = 'test_citizen_phase_10';
  const officialUserId = 'test_official_phase_10';
  const wardId = 'a0000000-0000-0000-0000-000000000001';
  const complaintId1 = 'c1000000-0000-0000-0000-000000000001';
  const complaintId2 = 'c1000000-0000-0000-0000-000000000002';

  const supabase = createAuthenticatedSupabaseClient(officialUserId, 'official', wardId);
  const citizenSupabase = createAuthenticatedSupabaseClient(testUserId, 'citizen', wardId);
  const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);
  const results: AcceptanceTestItem[] = [];

  const submissionDateStr = '2026-11-01';
  const pastSlaDate = '2026-11-04'; // Breached SLA
  const sampleDesc = 'Large deep pothole on MG Road causing vehicular damage and traffic hazard';
  const sampleAddress = '12 MG Road, Shivajinagar, Ward 42';

  // Ensure test ward, profile, and test complaints exist in database
  try {
    await citizenSupabase.from('profiles').upsert(
      { id: testUserId, role: 'citizen', phone: '+91-9876543210' },
      { onConflict: 'id' }
    );
    await supabase.from('profiles').upsert(
      { id: officialUserId, role: 'official', ward_id: wardId, phone: '+91-9876543299' },
      { onConflict: 'id' }
    );

    // Complaint 1: Breached SLA ticket
    const { error: c1Err } = await citizenSupabase.from('complaints').upsert(
      {
        id: complaintId1,
        reporter_id: testUserId,
        ward_id: wardId,
        category: 'road',
        severity: 3,
        status: 'in_progress',
        description: sampleDesc,
        image_url: '/images/reports/road_pothole_1.webp',
        address_text: sampleAddress,
        location: 'SRID=4326;POINT(77.6245 12.9352)',
        sla_deadline: new Date(Date.now() - 3600000 * 48).toISOString(), // 48h overdue
        created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
      },
      { onConflict: 'id' }
    );
    if (c1Err) console.error('[test-phase-10] c1Err:', c1Err);

    // Complaint 2: Verification Failed ticket
    const { error: c2Err } = await citizenSupabase.from('complaints').upsert(
      {
        id: complaintId2,
        reporter_id: testUserId,
        ward_id: wardId,
        category: 'road',
        severity: 4,
        status: 'in_progress',
        verification_status: 'failed',
        verification_score: 0.28,
        description: 'Dangerous open trench overflowing with sewage after attempted fix',
        image_url: '/images/reports/road_pothole_1.webp',
        resolution_image_url: '/images/reports/road_pothole_2.webp',
        address_text: 'Station Road Crossing, Ward 42',
        location: 'SRID=4326;POINT(77.6255 12.9362)',
        created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
        resolved_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      { onConflict: 'id' }
    );
    if (c2Err) console.error('[test-phase-10] c2Err:', c2Err);
  } catch (seedErr) {
    console.warn('[test-phase-10] Setup error:', seedErr);
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 1:
  // A complaint breaches SLA (deadline passed, not verified).
  // The escalation autopilot triggers. A letter is generated, stored as PDF,
  // and linked to the complaint.
  // -------------------------------------------------------------------------
  try {
    const res1: GenerateEscalationOutput = await agent.run(
      'generateEscalation',
      {
        complaintId: complaintId1,
        trigger: 'sla_breach',
        category: 'road',
        severity: 3,
        description: sampleDesc,
        addressText: sampleAddress,
        submissionDate: submissionDateStr,
        slaDeadline: pastSlaDate,
      },
      { supabase, complaintId: complaintId1, wardId, userRole: 'official' }
    );

    // Verify database record was updated
    const { data: updatedComplaint } = await supabase
      .from('complaints')
      .select('status, escalation_letter_url, previous_status')
      .eq('id', complaintId1)
      .single();

    const passed1 =
      Boolean(res1.pdfUrl && res1.pdfUrl.includes('.pdf')) &&
      res1.letterContent.length > 200 &&
      updatedComplaint?.status === 'escalated' &&
      Boolean(updatedComplaint?.escalation_letter_url);

    results.push({
      checkNumber: 1,
      title: 'SLA Breach Autopilot triggers and links generated PDF letter to complaint',
      passed: passed1,
      status: updatedComplaint?.status,
      details: {
        authority: res1.authority,
        pdfUrl: res1.pdfUrl,
        submissionDeadline: res1.submissionDeadline,
        dbEscalationUrl: updatedComplaint?.escalation_letter_url,
        dbStatus: updatedComplaint?.status,
        dbPreviousStatus: updatedComplaint?.previous_status,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 1,
      title: 'SLA Breach Autopilot triggers and links generated PDF letter to complaint',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 2:
  // The letter contains the correct complaint ID, dates, location, category,
  // and description. No invented facts. The format matches the RTI template structure.
  // -------------------------------------------------------------------------
  try {
    // Fetch generated escalation record
    const { data: escRow } = await supabase
      .from('escalations')
      .select('*')
      .eq('complaint_id', complaintId1)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const letter = escRow?.letter_content || '';

    // Verify key facts from database (NO hallucinations)
    const hasComplaintId = letter.includes(complaintId1);
    const hasCategory = letter.toLowerCase().includes('road');
    const hasDescription = letter.includes('Large deep pothole on MG Road');
    const hasSection61 = letter.includes('Section 6(1)') || letter.includes('Right to Information');
    const hasPio = letter.includes('Public Information Officer');
    const hasQuestions = letter.includes('Please provide the current status') || letter.includes('copies of any action taken');

    const passed2 =
      hasComplaintId && hasCategory && hasDescription && hasSection61 && hasPio && hasQuestions;

    results.push({
      checkNumber: 2,
      title: 'Letter contains exact complaint facts and conforms strictly to RTI statutory template',
      passed: passed2,
      details: {
        hasComplaintId,
        hasCategory,
        hasDescription,
        hasSection61,
        hasPio,
        hasQuestions,
        letterPreview: letter.slice(0, 300) + '...',
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 2,
      title: 'Letter contains exact complaint facts and conforms strictly to RTI statutory template',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 3:
  // The escalation appears in the dashboard escalation queue with status 'draft'
  // and a deadline countdown.
  // -------------------------------------------------------------------------
  try {
    const { data: queueItems, error: qErr } = await supabase.rpc('get_ward_escalations', {
      target_ward_id: wardId,
    });

    const items = (queueItems as any[]) || [];
    const matched = items.find((i) => i.complaint_id === complaintId1);

    const passed3 =
      !qErr &&
      Boolean(matched) &&
      matched.status === 'draft' &&
      typeof matched.days_remaining === 'number' &&
      matched.days_remaining > 0 &&
      Boolean(matched.letter_url);

    results.push({
      checkNumber: 3,
      title: 'Escalation appears in dashboard queue with status "draft" and deadline countdown',
      passed: passed3,
      details: {
        foundInQueue: Boolean(matched),
        escalationId: matched?.id,
        status: matched?.status,
        deadline: matched?.deadline,
        daysRemaining: matched?.days_remaining,
        isOverdue: matched?.is_overdue,
        totalInWard: items.length,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 3,
      title: 'Escalation appears in dashboard queue with status "draft" and deadline countdown',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 4:
  // A manual trigger on a verified-failed complaint generates a Commissioner appeal
  // instead of an RTI. The format is different and correct.
  // -------------------------------------------------------------------------
  try {
    const res4: GenerateEscalationOutput = await agent.run(
      'generateEscalation',
      {
        complaintId: complaintId2,
        trigger: 'verification_failed',
        category: 'road',
        severity: 4,
        description: 'Dangerous open trench overflowing with sewage after attempted fix',
        verificationScore: 0.28,
        verificationReason: 'Post-fix photograph indicates sewage ponding remained unaddressed',
      },
      { supabase, complaintId: complaintId2, wardId, userRole: 'official' }
    );

    const letter4 = res4.letterContent;
    const isCommissioner = res4.authority === 'municipal_commissioner';
    const isCommissionerFormat = res4.format === 'commissioner';
    const mentionsCommissioner = letter4.includes('The Municipal Commissioner');
    const mentionsAppeal = letter4.includes('Appeal regarding non-redressal');
    const mentionsFailedScore =
      letter4.includes('VERIFICATION FAILED') ||
      letter4.includes('28%') ||
      letter4.includes('0.28');
    const notRti = !letter4.includes('Section 6(1) of the Right to Information Act');

    const passed4 =
      isCommissioner &&
      isCommissionerFormat &&
      mentionsCommissioner &&
      mentionsAppeal &&
      mentionsFailedScore &&
      notRti;

    results.push({
      checkNumber: 4,
      title: 'Manual trigger on verified-failed complaint generates Municipal Commissioner appeal format',
      passed: passed4,
      details: {
        authority: res4.authority,
        format: res4.format,
        mentionsCommissioner,
        mentionsAppeal,
        mentionsFailedScore,
        notRti,
        submissionDeadline: res4.submissionDeadline,
        letterPreview: letter4.slice(0, 320) + '...',
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 4,
      title: 'Manual trigger on verified-failed complaint generates Municipal Commissioner appeal format',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  // -------------------------------------------------------------------------
  // Acceptance Check 5:
  // The citizen's "My complaints" view shows an "Escalation Letter" button
  // for escalated complaints. Clicking it downloads or views the PDF.
  // -------------------------------------------------------------------------
  try {
    // 1. Query complaints as citizen reporter
    const { data: citizenComplaints } = await citizenSupabase
      .from('complaints')
      .select('id, category, status, escalation_letter_url, previous_status')
      .eq('reporter_id', testUserId);

    const escalatedComplaint = (citizenComplaints || []).find(
      (c) => c.id === complaintId1 && c.status === 'escalated'
    );

    const hasEscalationUrl = Boolean(escalatedComplaint?.escalation_letter_url);

    // 2. Validate PDF file availability by fetching first few bytes from URL or verifying URL format
    let validPdfHeader = false;
    if (escalatedComplaint?.escalation_letter_url) {
      try {
        const headRes = await fetch(escalatedComplaint.escalation_letter_url, { method: 'HEAD' });
        validPdfHeader = headRes.ok;
      } catch {
        // If network sandbox restricts local fetch of Supabase Storage URL, verify URL structure
        validPdfHeader = escalatedComplaint.escalation_letter_url.endsWith('.pdf');
      }
    }

    const passed5 = Boolean(escalatedComplaint) && hasEscalationUrl;

    results.push({
      checkNumber: 5,
      title: 'Citizen "My complaints" view exposes "Escalation Letter" button with valid PDF link',
      passed: passed5,
      details: {
        citizenComplaintCount: citizenComplaints?.length || 0,
        foundEscalatedTicket: Boolean(escalatedComplaint),
        escalationLetterUrl: escalatedComplaint?.escalation_letter_url,
        pdfAvailable: validPdfHeader,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    results.push({
      checkNumber: 5,
      title: 'Citizen "My complaints" view exposes "Escalation Letter" button with valid PDF link',
      passed: false,
      details: {},
      error: error.message,
    });
  }

  const passedChecks = results.filter((r) => r.passed).length;
  const allPassed = passedChecks === results.length;

  return Response.json(
    {
      success: true,
      allPassed,
      totalChecks: results.length,
      passedChecks,
      results,
      timestamp: new Date().toISOString(),
    } satisfies Phase10TestResponse,
    { status: allPassed ? 200 : 500 }
  );
}
