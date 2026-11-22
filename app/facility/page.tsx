import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FacilityView from '@/components/facility/FacilityView';
import { FacilityComplaintItem } from '@/app/api/facility/complaints/route';
import { FacilityItem } from '@/app/api/facilities/route';

interface FacilityPageProps {
  searchParams: Promise<{ facilityId?: string }>;
}

async function FacilityContent({ searchParams }: FacilityPageProps) {
  const session = await getServerSession();
  const queryParams = await searchParams;

  // If user is not authenticated, redirect to sign-in
  if (!session.isAuthenticated) {
    redirect('/sign-in?redirect_url=/facility');
  }

  const supabase = await createServerSupabaseClient();

  // 1. Fetch all facilities for switcher
  const { data: facilitiesData } = await supabase.rpc('get_ward_facilities', {
    target_ward_id: null,
  });

  const allFacilities: FacilityItem[] = ((facilitiesData as any[]) || []).map((f: any) => ({
    id: f.id,
    ward_id: f.ward_id,
    name: f.name,
    type: f.type,
    contact_phone: f.contact_phone,
    lat: f.lat,
    lng: f.lng,
  }));

  // Determine target facility
  // 1st choice: searchParam ?facilityId=...
  // 2nd choice: user's assigned facilityId from session
  // 3rd choice: Bellandur PWD Road Works Depot ('b0000000-0000-0000-0000-000000000001')
  // 4th choice: first available facility
  const targetFacilityId =
    queryParams.facilityId ||
    session.facilityId ||
    'b0000000-0000-0000-0000-000000000001' ||
    (allFacilities.length > 0 ? allFacilities[0].id : null);

  // Fetch target facility info
  let facility = allFacilities.find((f) => f.id === targetFacilityId) || null;
  if (!facility && targetFacilityId) {
    const { data: singleFac } = await supabase
      .from('facilities')
      .select('id, name, type, ward_id, contact_phone')
      .eq('id', targetFacilityId)
      .maybeSingle();

    if (singleFac) {
      facility = {
        id: singleFac.id,
        ward_id: singleFac.ward_id,
        name: singleFac.name,
        type: singleFac.type,
        contact_phone: singleFac.contact_phone,
        lat: 0,
        lng: 0,
      };
    }
  }

  if (!facility) {
    facility = {
      id: 'b0000000-0000-0000-0000-000000000001',
      ward_id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Bellandur PWD Road Works Depot',
      type: 'road',
      contact_phone: '+91 80 2553 1001',
      lat: 12.935,
      lng: 77.675,
    };
  }

  // 2. Fetch complaints assigned to this facility via RPC
  const { data: complaintsData } = await supabase.rpc('get_facility_complaints', {
    p_facility_id: facility.id,
  });

  const complaints: FacilityComplaintItem[] = ((complaintsData as any[]) || []).map((c: any) => ({
    id: c.id,
    category: c.category as any,
    severity: c.severity,
    status: c.status as any,
    description: c.description,
    image_url: c.image_url,
    address_text: c.address_text,
    lat: c.lat,
    lng: c.lng,
    sla_deadline: c.sla_deadline,
    resolved_at: c.resolved_at,
    resolution_image_url: c.resolution_image_url,
    resolution_notes: c.resolution_notes,
    created_at: c.created_at,
    updated_at: c.updated_at,
    weight: c.weight,
    sla_breached: c.sla_breached,
  }));

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col bg-background">
      <FacilityView
        initialFacility={facility}
        initialComplaints={complaints}
        allFacilities={allFacilities}
      />
    </main>
  );
}

export default function FacilityPage(props: FacilityPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh] text-xs text-muted-foreground">
          Loading municipal facility depot view...
        </div>
      }
    >
      <FacilityContent {...props} />
    </Suspense>
  );
}
