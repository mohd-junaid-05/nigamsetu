import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';
import { getValidReportImageUrl } from '@/lib/utils/reportImages';

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
  complaint_count?: number;
  cluster_id?: string | null;
  attestations?: Array<{
    id: string;
    created_at: string;
    address_text: string | null;
    image_url: string;
    severity: number;
  }>;
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
  complaint_count?: number;
  cluster_id?: string | null;
  attestations?: any;
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
    
    // Attempt detailed fetch with cluster attestations
    let row: ComplaintPopupData | null = null;
    const { data: detailData, error: detailError } = await supabase.rpc(
      'get_complaint_details_with_attestations',
      {
        target_id: complaintId,
      }
    );

    if (!detailError && Array.isArray(detailData) && detailData.length > 0) {
      const d = detailData[0] as RawPopupRow;
      row = {
        id: d.id,
        category: d.category,
        severity: d.severity,
        status: d.status,
        image_url: getValidReportImageUrl(d.image_url, d.category),
        address_text: d.address_text,
        created_at: d.created_at,
        lat: d.lat,
        lng: d.lng,
        complaint_count: typeof d.complaint_count === 'number' ? d.complaint_count : 1,
        cluster_id: d.cluster_id || null,
        attestations: Array.isArray(d.attestations)
          ? d.attestations.map((a: any) => ({
              ...a,
              image_url: getValidReportImageUrl(a.image_url, d.category),
            }))
          : [],
      };
    } else {
      // Fallback to basic get_complaint_popup
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
      row = {
        ...rows[0],
        image_url: getValidReportImageUrl(rows[0].image_url, rows[0].category),
      };
    }

    return Response.json(
      {
        success: true,
        complaint: row,
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
