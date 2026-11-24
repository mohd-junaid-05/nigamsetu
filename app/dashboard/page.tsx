import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Official Operations Dashboard | Priority Queue & Redressal',
  description:
    'Ward official operations dashboard for reviewing civic priority queue, assigning municipal depot facilities, and auditing verification traces across Hyderabad municipal wards (GHMC).',
};
import { getServerSession } from '@/lib/auth/session';
import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import DashboardController from '@/components/dashboard/DashboardController';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import { FacilityItem } from '@/app/api/facilities/route';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { getValidReportImageUrl, getValidResolutionImageUrl } from '@/lib/utils/reportImages';

interface DashboardPageProps {
  searchParams?: Promise<{ wardId?: string }>;
}

async function DashboardContent({ searchParams }: DashboardPageProps) {
  await connection();
  const session = await getServerSession();

  // Route Guard: Strictly restricted to official and administrator credentials
  const isAuthorized = session.isAuthenticated && (session.role === 'admin' || session.role === 'official');
  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-surface">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface-card shadow-lg flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-foreground">Municipal Official Access Required</h2>
            <p className="text-sm font-semibold text-muted-foreground">
              Citizen accounts cannot access internal municipal triage operations.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            To report civic defects or track your complaints, please visit the citizen portal. Official operations are restricted to verified administrators and officials.
          </p>
          <div className="pt-2 flex gap-3">
            <Link
              href="/"
              className="py-2 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-surface transition-colors"
            >
              Return Home
            </Link>
            <Link
              href="/report"
              className="py-2 px-4 rounded-xl bg-[#FFB81D] text-[#071D49] text-xs font-bold hover:bg-amber-300 transition-colors shadow-xs"
            >
              Report an Issue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Load Priority Queue & Facilities across all locations (irrespective of ward)
  const supabase = createAnonymousSupabaseClient();

  const [queueRes, facilitiesRes] = await Promise.all([
    supabase.rpc('get_priority_queue', { target_ward_id: null }),
    supabase.rpc('get_ward_facilities', { target_ward_id: null }),
  ]);

  const rawQueue = (queueRes.data as any[]) || [];
  const initialQueue: PriorityQueueItem[] = rawQueue.map((r) => ({
    id: r.id,
    category: r.category,
    severity: r.severity,
    status: r.status,
    description: r.description,
    address_text: r.address_text,
    image_url: getValidReportImageUrl(r.image_url, r.category),
    created_at: r.created_at,
    weight: typeof r.weight === 'number' ? r.weight : 1,
    sla_breached: Boolean(r.sla_breached),
    effective_priority: r.severity * (typeof r.weight === 'number' ? r.weight : 1),
    location: r.location,
    facility_id: r.facility_id,
    resolved_at: r.resolved_at || null,
    resolution_image_url: getValidResolutionImageUrl(r.resolution_image_url, r.category),
    resolution_notes: r.resolution_notes || null,
    verification_score: typeof r.verification_score === 'number' ? r.verification_score : null,
    verification_status: r.verification_status || null,
  }));

  const rawFacilities = (facilitiesRes.data as any[]) || [];
  const facilities: FacilityItem[] = rawFacilities.map((f) => ({
    id: f.id,
    ward_id: f.ward_id,
    name: f.name,
    type: f.type,
    contact_phone: f.contact_phone,
    lat: typeof f.lat === 'number' ? f.lat : 17.4156,
    lng: typeof f.lng === 'number' ? f.lng : 78.4350,
  }));

  const dashboardTitle = 'All User Complaints';

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
                Desktop-first unified command center for priority triage, facility routing, and fix verification across all locations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Global Intake Stream · All User Complaints</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Panel Controller (Queue 25% | Map 50% | Details 25%) */}
      <DashboardController
        initialQueue={initialQueue}
        facilities={facilities}
        wardId={null}
        wardName={dashboardTitle}
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
