import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import DashboardController from '@/components/dashboard/DashboardController';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import { FacilityItem } from '@/app/api/facilities/route';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface DashboardPageProps {
  searchParams?: Promise<{ wardId?: string }>;
}

async function DashboardContent({ searchParams }: DashboardPageProps) {
  const session = await getServerSession();
  const resolvedParams = searchParams ? await searchParams : {};
  const effectiveWardId = session.wardId || resolvedParams?.wardId || null;

  // Acceptance Check 7: Empty state when official has no ward assigned
  if (!effectiveWardId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-surface">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface-card shadow-lg flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-foreground">Ward Access Required</h2>
            <p className="text-sm font-semibold text-muted-foreground">
              No ward assigned. Contact your administrator.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            Municipal officials must be assigned to an active municipal ward boundary to triage tickets, inspect evidence, and route maintenance crews.
          </p>
        </div>
      </div>
    );
  }

  // Load Initial Priority Queue & Ward Facilities on the server
  const supabase = createAnonymousSupabaseClient();

  const [queueRes, facilitiesRes, wardRes] = await Promise.all([
    supabase.rpc('get_priority_queue', { target_ward_id: effectiveWardId }),
    supabase.rpc('get_ward_facilities', { target_ward_id: effectiveWardId }),
    supabase.from('wards').select('name').eq('id', effectiveWardId).maybeSingle(),
  ]);

  const rawQueue = (queueRes.data as any[]) || [];
  const initialQueue: PriorityQueueItem[] = rawQueue.map((r) => ({
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
  }));

  const rawFacilities = (facilitiesRes.data as any[]) || [];
  const facilities: FacilityItem[] = rawFacilities.map((f) => ({
    id: f.id,
    ward_id: f.ward_id,
    name: f.name,
    type: f.type,
    contact_phone: f.contact_phone,
    lat: typeof f.lat === 'number' ? f.lat : 12.935,
    lng: typeof f.lng === 'number' ? f.lng : 77.65,
  }));

  const wardName = wardRes.data?.name || `Ward ${effectiveWardId.slice(0, 8)}`;

  return (
    <div className="flex-1 flex flex-col bg-surface min-h-[calc(100vh-4rem)]">
      {/* Official Controller Top Bar */}
      <section className="bg-surface-card border-b border-border py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-foreground">Municipal Official Controller</h1>
                <span
                  data-testid="dashboard-role-badge"
                  className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-blue-600/10 text-blue-600 border border-blue-500/20 capitalize"
                >
                  Role: {session.role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Desktop-first 3-panel command center for priority triage, facility routing, and fix verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <span className="text-muted-foreground">Assigned Ward:</span>{' '}
              <strong className="font-mono text-foreground font-bold">{wardName}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Panel Controller (Queue 25% | Ward Map 50% | Details 25%) */}
      <DashboardController
        initialQueue={initialQueue}
        facilities={facilities}
        wardId={effectiveWardId}
        wardName={wardName}
      />
    </div>
  );
}

export default function DashboardPage(props: DashboardPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh] text-xs text-muted-foreground">
          Loading official operations dashboard...
        </div>
      }
    >
      <DashboardContent {...props} />
    </Suspense>
  );
}
