import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';
import { getValidReportImageUrl, getValidResolutionImageUrl } from '@/lib/utils/reportImages';

export interface FacilityComplaintItem {
  id: string;
  category: ComplaintCategory;
  severity: number;
  status: ComplaintStatus;
  description: string | null;
  image_url: string;
  address_text: string | null;
  lat: number;
  lng: number;
  sla_deadline: string | null;
  resolved_at: string | null;
  resolution_image_url: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  weight: number;
  sla_breached: boolean;
}

export type FacilityComplaintsApiResponse = {
  success: boolean;
  facility?: {
    id: string;
    name: string;
    type: string;
    ward_id: string;
    contact_phone: string | null;
  };
  complaints: FacilityComplaintItem[];
  total: number;
  error?: string;
};

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const requestedFacilityId = searchParams.get('facilityId');

    const { userId, sessionClaims } = await auth();
    const claims = sessionClaims as Record<string, unknown> | null;
    const sessionFacilityId =
      (claims?.facility_id as string) ||
      ((claims?.public_metadata as Record<string, unknown>)?.facility_id as string) ||
      null;

    const targetFacilityId = requestedFacilityId || sessionFacilityId;

    if (!targetFacilityId) {
      return Response.json(
        {
          success: false,
          complaints: [],
          total: 0,
          error: 'Facility ID is required (specify ?facilityId=... or sign in as facility worker)',
        } satisfies FacilityComplaintsApiResponse,
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Fetch facility info
    const { data: facility, error: facError } = await supabase
      .from('facilities')
      .select('id, name, type, ward_id, contact_phone')
      .eq('id', targetFacilityId)
      .maybeSingle();

    if (facError || !facility) {
      return Response.json(
        {
          success: false,
          complaints: [],
          total: 0,
          error: 'Facility not found',
        } satisfies FacilityComplaintsApiResponse,
        { status: 404 }
      );
    }

    // Call RPC get_facility_complaints
    const { data: complaintsData, error: complaintsError } = await supabase.rpc(
      'get_facility_complaints',
      {
        p_facility_id: targetFacilityId,
      }
    );

    if (complaintsError) {
      // Fallback query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('complaints')
        .select(`
          id, category, severity, status, description, image_url, address_text,
          sla_deadline, resolved_at, resolution_image_url, resolution_notes,
          created_at, updated_at
        `)
        .eq('facility_id', targetFacilityId)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        return Response.json(
          {
            success: false,
            complaints: [],
            total: 0,
            error: fallbackError.message,
          } satisfies FacilityComplaintsApiResponse,
          { status: 500 }
        );
      }

      const mapped: FacilityComplaintItem[] = (fallbackData || []).map((row) => ({
        id: row.id,
        category: row.category as ComplaintCategory,
        severity: row.severity,
        status: row.status as ComplaintStatus,
        description: row.description,
        image_url: getValidReportImageUrl(row.image_url, row.category),
        address_text: row.address_text,
        lat: 0,
        lng: 0,
        sla_deadline: row.sla_deadline,
        resolved_at: row.resolved_at,
        resolution_image_url: getValidResolutionImageUrl(row.resolution_image_url, row.category),
        resolution_notes: row.resolution_notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        weight: 1,
        sla_breached: Boolean(row.sla_deadline && new Date(row.sla_deadline) < new Date()),
      }));

      return Response.json({
        success: true,
        facility,
        complaints: mapped,
        total: mapped.length,
      } satisfies FacilityComplaintsApiResponse);
    }

    const rawItems = (complaintsData || []) as any[];
    const items: FacilityComplaintItem[] = rawItems.map((c) => ({
      ...c,
      image_url: getValidReportImageUrl(c.image_url, c.category),
      resolution_image_url: getValidResolutionImageUrl(c.resolution_image_url, c.category),
    }));

    return Response.json({
      success: true,
      facility,
      complaints: items,
      total: items.length,
    } satisfies FacilityComplaintsApiResponse);
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json(
      {
        success: false,
        complaints: [],
        total: 0,
        error: error.message || 'Internal server error',
      } satisfies FacilityComplaintsApiResponse,
      { status: 500 }
    );
  }
}
