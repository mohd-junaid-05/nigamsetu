import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { createAnonymousSupabaseClient } from '@/lib/supabase/server';
import { ShieldCheck, Layers, Map, MessageSquare, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

async function DashboardHeaderInfo() {
  const session = await getServerSession();

  return (
    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-foreground">Municipal Official Controller</h1>
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
          <strong className="font-mono text-foreground">
            {session.wardId ?? 'Ward 42 (Shivajinagar Default)'}
          </strong>
        </div>
      </div>
    </div>
  );
}

async function PriorityQueuePanel() {
  const session = await getServerSession();
  const supabase = createAnonymousSupabaseClient();

  const { data: queueData } = await supabase.rpc('get_priority_queue', {
    target_ward_id: session.wardId || null,
  });

  const items = Array.isArray(queueData) ? queueData : [];

  const SEVERITY_LABELS: Record<number, { text: string; color: string; dot: string }> = {
    4: { text: 'Emergency', color: 'text-severity-4', dot: 'bg-severity-4' },
    3: { text: 'Critical', color: 'text-severity-3', dot: 'bg-severity-3' },
    2: { text: 'Significant', color: 'text-severity-2', dot: 'bg-severity-2' },
    1: { text: 'Cosmetic', color: 'text-severity-1', dot: 'bg-severity-1' },
  };

  if (items.length === 0) {
    return (
      <div className="p-4 flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
        <Layers className="w-8 h-8 mb-2 opacity-40 text-blue-500" />
        <p className="font-semibold text-foreground">Priority Queue Clear</p>
        <p className="text-[11px] mt-1 max-w-[200px]">
          No active complaints in this ward. New submissions automatically cluster and rank by severity & attestations.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 flex-1 flex flex-col gap-3 text-xs overflow-y-auto max-h-[680px]">
      {items.map((item, idx) => {
        const sev = SEVERITY_LABELS[item.severity] || SEVERITY_LABELS[2];
        const weight = typeof item.weight === 'number' ? item.weight : 1;
        const isClustered = weight > 1;
        const effectiveScore = item.severity * weight;

        return (
          <div
            key={item.id}
            className={`p-3 rounded-xl border bg-surface flex flex-col gap-1.5 transition-all hover:border-blue-500/40 ${
              isClustered ? 'border-blue-500/30 bg-blue-500/[0.02]' : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  #{idx + 1}
                </span>
                <span className={`font-bold ${sev.color} flex items-center gap-1`}>
                  <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                  {sev.text}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isClustered && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-600/15 text-blue-600 border border-blue-500/25">
                    Clustered ({weight})
                  </span>
                )}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/20 border border-border">
                  Score: {effectiveScore}
                </span>
              </div>
            </div>

            <p className="text-foreground text-[11px] font-medium line-clamp-2">
              {item.description || item.address_text || `Reported ${item.category} issue`}
            </p>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/80">
              <span className={isClustered ? 'font-bold text-blue-600' : ''}>
                Attestations: <strong>{weight} {weight === 1 ? 'report' : 'reports'}</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className={item.sla_breached ? 'text-red-500 font-bold' : 'text-status-open font-semibold'}>
                  {item.sla_breached ? 'SLA Breached' : 'SLA: Active'}
                </span>
                <Link
                  href={`/complaint/${item.id}`}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  View →
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex-1 flex flex-col bg-surface">
      {/* Ward Controller Header Banner */}
      <section className="bg-surface-card border-b border-border py-4 px-4 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto h-12 flex items-center text-xs text-muted animate-pulse">
              Loading controller claim...
            </div>
          }
        >
          <DashboardHeaderInfo />
        </Suspense>
      </section>

      {/* Official 3-Panel Layout (Queue 25% | Map 50% | Details/Chat 25%) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Panel 1: Priority Queue (25% -> 3 cols) */}
        <section className="lg:col-span-3 flex flex-col rounded-2xl border border-border bg-surface-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-foreground">Priority Queue</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border">
              25% Width
            </span>
          </div>

          <Suspense
            fallback={
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
                <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
                <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
              </div>
            }
          >
            <PriorityQueuePanel />
          </Suspense>
        </section>

        {/* Panel 2: Ward Map (50% -> 6 cols) */}
        <section className="lg:col-span-6 flex flex-col rounded-2xl border border-border bg-surface-card overflow-hidden min-h-[460px]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-foreground">Ward Geospatial Operations</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border">
              50% Width
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface/50">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-3">
              <Map className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Ward Polygon & KNN Facility Router</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Displays PostGIS ward boundary and auto-routes tickets to nearest municipal depot via KNN geospatial distance.
            </p>
          </div>
        </section>

        {/* Panel 3: Verification & AI Assistant (25% -> 3 cols) */}
        <section className="lg:col-span-3 flex flex-col rounded-2xl border border-border bg-surface-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-foreground">Verification & Agent Chat</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border">
              25% Width
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-4 text-xs">
            {/* Resolution Verification Preview */}
            <div className="p-3 rounded-xl border border-border bg-surface">
              <h4 className="font-bold text-foreground mb-1">Fix Verification Hero</h4>
              <p className="text-[11px] text-muted-foreground">
                Before/after vision embeddings compare repair evidence. Unverified fixes are never trusted on checkboxes.
              </p>
            </div>

            {/* Structured Ward Query */}
            <div className="p-3 rounded-xl border border-border bg-surface">
              <h4 className="font-bold text-foreground mb-1">Ward Structured Agent</h4>
              <p className="text-[11px] text-muted-foreground">
                Ask questions about your ward. The agent derives structured answers directly from SQL queries rather than hallucinating.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
