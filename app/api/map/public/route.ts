import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';

export interface PublicMapPin {
  id: string;
  category: ComplaintCategory;
  severity: number;
  status: ComplaintStatus;
  location: {
    lat: number;
    lng: number;
  };
  created_at: string;
  resolved_at: string | null;
}

export interface PublicMapApiResponse {
  success: boolean;
  pins: PublicMapPin[];
  total: number;
  error?: string;
}

interface RawPublicComplaintRow {
  id: string;
  category: ComplaintCategory;
  severity: number;
  status: ComplaintStatus;
  lat: number;
  lng: number;
  created_at: string;
  resolved_at: string | null;
}

export async function GET(): Promise<Response> {
  try {
    const supabase = createAnonymousSupabaseClient();

    // Call the public RPC function which bypasses RLS and returns sanitized fields
    const { data, error } = await supabase.rpc('get_public_map_complaints');

    if (error) {
      return Response.json(
        {
          success: false,
          pins: [],
          total: 0,
          error: `Failed to fetch public map data: ${error.message}`,
        } satisfies PublicMapApiResponse,
        { status: 500 }
      );
    }

    const rows = (data as RawPublicComplaintRow[]) || [];

    // Map into standardized PublicMapPin structure
    const pins: PublicMapPin[] = rows.map((row) => ({
      id: row.id,
      category: row.category,
      severity: row.severity,
      status: row.status,
      location: {
        lat: row.lat,
        lng: row.lng,
      },
      created_at: row.created_at,
      resolved_at: row.resolved_at,
    }));

    return Response.json(
      {
        success: true,
        pins,
        total: pins.length,
      } satisfies PublicMapApiResponse,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        pins: [],
        total: 0,
        error: error.message || 'Internal server error while fetching map complaints',
      } satisfies PublicMapApiResponse,
      { status: 500 }
    );
  }
}
