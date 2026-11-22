import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import { FacilityItem } from '../route';

export interface NearestFacilityItem extends FacilityItem {
  distance_meters?: number;
}

export interface NearestFacilitiesApiResponse {
  success: boolean;
  facilities: NearestFacilityItem[];
  total: number;
  error?: string;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get('complaintId');

    if (!complaintId) {
      return Response.json(
        {
          success: false,
          facilities: [],
          total: 0,
          error: 'complaintId is required',
        } satisfies NearestFacilitiesApiResponse,
        { status: 400 }
      );
    }

    const supabase = createAnonymousSupabaseClient();
    const { data, error } = await supabase.rpc('get_nearest_facilities', {
      p_complaint_id: complaintId,
      p_limit: 3,
    });

    if (error) {
      return Response.json(
        {
          success: false,
          facilities: [],
          total: 0,
          error: `Failed to find nearest facilities: ${error.message}`,
        } satisfies NearestFacilitiesApiResponse,
        { status: 500 }
      );
    }

    const facilities: NearestFacilityItem[] = (data as NearestFacilityItem[]) || [];

    return Response.json({
      success: true,
      facilities,
      total: facilities.length,
    } satisfies NearestFacilitiesApiResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        facilities: [],
        total: 0,
        error: error.message || 'Internal server error while finding nearest facilities',
      } satisfies NearestFacilitiesApiResponse,
      { status: 500 }
    );
  }
}
