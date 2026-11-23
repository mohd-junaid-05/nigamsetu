// =====================================================================
// Route: GET /api/escalations
// Returns escalated complaints queue with statutory deadlines
// =====================================================================

import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ComplaintCategory, EscalationAuthority, EscalationStatus, EscalationTrigger } from '@/lib/types/database';

export interface EscalationQueueItem {
  id: string;
  complaint_id: string;
  trigger_reason: EscalationTrigger;
  letter_content: string;
  authority: EscalationAuthority;
  deadline: string; // YYYY-MM-DD
  status: EscalationStatus;
  letter_url: string;
  created_at: string;
  days_remaining: number;
  is_overdue: boolean;
  category: ComplaintCategory;
  severity: number;
  address_text: string | null;
  ward_id: string | null;
  ward_name: string | null;
  reporter_id: string | null;
  image_url: string;
}

export interface ListEscalationsResponse {
  success: boolean;
  escalations: EscalationQueueItem[];
  total: number;
  error?: string;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return Response.json(
        { success: false, escalations: [], total: 0, error: 'Unauthorized' } satisfies ListEscalationsResponse,
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const wardIdParam = searchParams.get('wardId');

    const claims = sessionClaims as Record<string, unknown> | null;
    const userRole =
      (claims?.role as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.role as string) ||
      'citizen';

    const supabase = await createServerSupabaseClient();

    if (userRole === 'official' || userRole === 'admin') {
      // Official / Admin: fetch through RPC get_ward_escalations
      const { data, error } = await supabase.rpc('get_ward_escalations', {
        target_ward_id: wardIdParam || null,
      });

      if (error) {
        return Response.json(
          { success: false, escalations: [], total: 0, error: error.message } satisfies ListEscalationsResponse,
          { status: 500 }
        );
      }

      const rows = (data as any[]) || [];
      const escalations: EscalationQueueItem[] = rows.map((r) => ({
        id: r.id,
        complaint_id: r.complaint_id,
        trigger_reason: r.trigger_reason,
        letter_content: r.letter_content,
        authority: r.authority,
        deadline: r.deadline,
        status: r.status,
        letter_url: r.letter_url || '',
        created_at: r.created_at,
        days_remaining: typeof r.days_remaining === 'number' ? r.days_remaining : 0,
        is_overdue: Boolean(r.is_overdue),
        category: r.category,
        severity: r.severity,
        address_text: r.address_text || null,
        ward_id: r.ward_id || null,
        ward_name: r.ward_name || null,
        reporter_id: r.reporter_id || null,
        image_url: r.image_url || '',
      }));

      return Response.json({
        success: true,
        escalations,
        total: escalations.length,
      } satisfies ListEscalationsResponse);
    } else {
      // Citizen: fetch escalations for complaints reported by this citizen
      const { data: rows, error } = await supabase
        .from('escalations')
        .select(`
          id,
          complaint_id,
          trigger_reason,
          letter_content,
          authority,
          deadline,
          status,
          letter_url,
          created_at,
          complaints!inner (
            id,
            category,
            severity,
            address_text,
            ward_id,
            reporter_id,
            image_url,
            escalation_letter_url,
            wards (
              name
            )
          )
        `)
        .eq('complaints.reporter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return Response.json(
          { success: false, escalations: [], total: 0, error: error.message } satisfies ListEscalationsResponse,
          { status: 500 }
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const escalations: EscalationQueueItem[] = ((rows as any[]) || []).map((r) => {
        const c = r.complaints;
        const deadlineDate = new Date(r.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        const diffMs = deadlineDate.getTime() - today.getTime();
        const daysRemaining = Math.round(diffMs / (1000 * 3600 * 24));
        const isOverdue = daysRemaining < 0 && r.status !== 'resolved';

        return {
          id: r.id,
          complaint_id: r.complaint_id,
          trigger_reason: r.trigger_reason,
          letter_content: r.letter_content,
          authority: r.authority,
          deadline: r.deadline,
          status: r.status,
          letter_url: r.letter_url || c?.escalation_letter_url || '',
          created_at: r.created_at,
          days_remaining: daysRemaining,
          is_overdue: isOverdue,
          category: c?.category || 'other',
          severity: c?.severity || 2,
          address_text: c?.address_text || null,
          ward_id: c?.ward_id || null,
          ward_name: c?.wards?.name || null,
          reporter_id: c?.reporter_id || null,
          image_url: c?.image_url || '',
        };
      });

      return Response.json({
        success: true,
        escalations,
        total: escalations.length,
      } satisfies ListEscalationsResponse);
    }
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      { success: false, escalations: [], total: 0, error: error.message } satisfies ListEscalationsResponse,
      { status: 500 }
    );
  }
}
