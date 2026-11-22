import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';

export interface ComplaintPopupData {
  id: string;
  category: ComplaintCategory;
  severity: number;
  status: ComplaintStatus;
  image_url: string;
  address_text: string | null;
  created_at: string;
  lat: number;
  lng: number;
}

export interface ComplaintPopupResponse {
  success: boolean;
  complaint?: ComplaintPopupData;
  error?: string;
}

interface RawPopupRow {
  id: string;
  category: ComplaintCategory;
  severity: number;
  status: ComplaintStatus;
  image_url: string;
  address_text: string | null;
  created_at: string;
  lat: number;
  lng: number;
}

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const params = await props.params;
    const complaintId = params.id;

    if (!complaintId) {
      return Response.json(
        {
          success: false,
          error: 'Complaint ID is required',
        } satisfies ComplaintPopupResponse,
        { status: 400 }
      );
    }

    const supabase = createAnonymousSupabaseClient();
    const { data, error } = await supabase.rpc('get_complaint_popup', {
      target_id: complaintId,
    });

    if (error) {
      return Response.json(
        {
          success: false,
          error: `Failed to fetch complaint popup: ${error.message}`,
        } satisfies ComplaintPopupResponse,
        { status: 500 }
      );
    }

    const rows = (data as RawPopupRow[]) || [];
    if (!rows.length) {
      return Response.json(
        {
          success: false,
          error: 'Complaint not found',
        } satisfies ComplaintPopupResponse,
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        complaint: rows[0],
      } satisfies ComplaintPopupResponse,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        error: error.message || 'Internal server error while fetching complaint popup',
      } satisfies ComplaintPopupResponse,
      { status: 500 }
    );
  }
}
