import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';

export interface PriorityQueueItem {
  id: string;
  category: ComplaintCategory;
  severity: number;
  status: ComplaintStatus;
  description: string | null;
  address_text: string | null;
  image_url: string;
  created_at: string;
  weight: number;
  sla_breached: boolean;
  effective_priority?: number;
  location?: any;
  facility_id?: string | null;
  resolved_at?: string | null;
  resolution_image_url?: string | null;
}

export interface PriorityQueueResponse {
  success: boolean;
  items: PriorityQueueItem[];
  total: number;
  error?: string;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get('wardId');

    const supabase = createAnonymousSupabaseClient();
    const { data, error } = await supabase.rpc('get_priority_queue', {
      target_ward_id: wardId || null,
    });

    if (error) {
      return Response.json(
        {
          success: false,
          items: [],
          total: 0,
          error: `Failed to fetch priority queue: ${error.message}`,
        } satisfies PriorityQueueResponse,
        { status: 500 }
      );
    }

    const rows = (data as any[]) || [];
    const items: PriorityQueueItem[] = rows.map((r) => ({
      id: r.id,
      category: r.category,
      severity: r.severity,
      status: r.status,
      description: r.description,
      address_text: r.address_text,
      image_url: r.image_url,
      created_at: r.created_at,
      weight: typeof r.weight === 'number' ? r.weight : 1,
      sla_breached: Boolean(r.sla_breached),
      effective_priority: r.severity * (typeof r.weight === 'number' ? r.weight : 1),
      location: r.location,
      facility_id: r.facility_id,
      resolved_at: r.resolved_at || null,
      resolution_image_url: r.resolution_image_url || null,
    }));

    return Response.json({
      success: true,
      items,
      total: items.length,
    } satisfies PriorityQueueResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        items: [],
        total: 0,
        error: error.message || 'Internal server error while fetching priority queue',
      } satisfies PriorityQueueResponse,
      { status: 500 }
    );
  }
}
