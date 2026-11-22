import { createAnonymousSupabaseClient } from '@/lib/supabase/server';

export interface FacilityItem {
  id: string;
  ward_id: string;
  name: string;
  type: string;
  contact_phone: string | null;
  lat: number;
  lng: number;
}

export interface FacilitiesApiResponse {
  success: boolean;
  facilities: FacilityItem[];
  total: number;
  error?: string;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get('wardId');

    const supabase = createAnonymousSupabaseClient();
    const { data, error } = await supabase.rpc('get_ward_facilities', {
      target_ward_id: wardId || null,
    });

    if (error) {
      return Response.json(
        {
          success: false,
          facilities: [],
          total: 0,
          error: `Failed to load facilities: ${error.message}`,
        } satisfies FacilitiesApiResponse,
        { status: 500 }
      );
    }

    const facilities: FacilityItem[] = (data as FacilityItem[]) || [];

    return Response.json({
      success: true,
      facilities,
      total: facilities.length,
    } satisfies FacilitiesApiResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        facilities: [],
        total: 0,
        error: error.message || 'Internal server error while loading facilities',
      } satisfies FacilitiesApiResponse,
      { status: 500 }
    );
  }
}
