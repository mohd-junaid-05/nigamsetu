// =====================================================================
// Route: GET & POST /api/agent/escalate/cron
// Automated SLA breach & ghost closure detector cron job
// Scans for overdue complaints and generates statutory escalation letters
// =====================================================================

import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import { CivicAgent, GenerateEscalationOutput } from '@/lib/agent/CivicAgent';

export type CronEscalateItemResult = {
  complaintId: string;
  category: string;
  trigger: 'sla_breach' | 'verification_failed' | 'ghost_closure';
  authority: string;
  pdfUrl: string;
  deadline: string;
};

export type CronEscalateResponse = {
  success: boolean;
  scannedCount: number;
  escalatedCount: number;
  items: CronEscalateItemResult[];
  error?: string;
};

export async function GET(req: Request): Promise<Response> {
  return handleCronScan(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleCronScan(req);
}

async function handleCronScan(req: Request): Promise<Response> {
  try {
    const supabase = createAnonymousSupabaseClient();
    const agent = new CivicAgent(process.env.GOOGLE_AI_API_KEY, supabase);

    // 1. Query complaints that have breached SLA or failed verification, and are not yet escalated/verified
    const nowIso = new Date().toISOString();
    const { data: candidates, error } = await supabase
      .from('complaints')
      .select(`
        id,
        category,
        severity,
        status,
        sla_deadline,
        verification_status,
        escalation_letter_url,
        description,
        ward_id,
        reporter_id,
        created_at,
        resolved_at
      `)
      .not('status', 'in', '("verified","escalated","rejected")')
      .is('escalation_letter_url', null)
      .or(`sla_deadline.lt.${nowIso},verification_status.eq.failed`)
      .limit(15);

    if (error) {
      return Response.json(
        {
          success: false,
          scannedCount: 0,
          escalatedCount: 0,
          items: [],
          error: error.message,
        } satisfies CronEscalateResponse,
        { status: 500 }
      );
    }

    const itemsToProcess = candidates || [];
    const results: CronEscalateItemResult[] = [];

    // 2. Process each overdue ticket through CivicAgent
    for (const c of itemsToProcess) {
      try {
        const trigger: 'sla_breach' | 'verification_failed' =
          c.verification_status === 'failed' ? 'verification_failed' : 'sla_breach';

        const output: GenerateEscalationOutput = await agent.run(
          'generateEscalation',
          {
            complaintId: c.id,
            trigger,
            category: c.category,
            severity: c.severity,
            description: c.description || undefined,
            submissionDate: c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : undefined,
            slaDeadline: c.sla_deadline ? new Date(c.sla_deadline).toLocaleDateString('en-IN') : undefined,
            claimedResolutionDate: c.resolved_at ? new Date(c.resolved_at).toLocaleDateString('en-IN') : undefined,
            notes: `Automated escalation autopilot triggered: ${trigger}`,
          },
          {
            supabase,
            complaintId: c.id,
            wardId: c.ward_id || undefined,
            userRole: 'system',
          }
        );

        results.push({
          complaintId: c.id,
          category: c.category,
          trigger,
          authority: output.authority,
          pdfUrl: output.pdfUrl,
          deadline: output.submissionDeadline,
        });
      } catch (itemErr) {
        console.error(`[Cron Escalate] Error processing complaint ${c.id}:`, itemErr);
      }
    }

    return Response.json({
      success: true,
      scannedCount: itemsToProcess.length,
      escalatedCount: results.length,
      items: results,
    } satisfies CronEscalateResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        scannedCount: 0,
        escalatedCount: 0,
        items: [],
        error: error.message,
      } satisfies CronEscalateResponse,
      { status: 500 }
    );
  }
}
