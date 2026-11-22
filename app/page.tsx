import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { MapPin, AlertTriangle, ArrowRight } from 'lucide-react';

async function IdentityDiagnostic() {
  const session = await getServerSession();

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">Server Identity Claim:</span>
      <span
        data-testid="server-role-display"
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold bg-surface-card border border-border capitalize text-foreground"
      >
        <span className={`w-2 h-2 rounded-full ${session.isAuthenticated ? 'bg-status-verified' : 'bg-gray-400'}`} />
        Role: {session.role} {session.wardId ? `| Ward: ${session.wardId}` : '| (No ward)'}
      </span>
      <span className="text-xs text-muted-foreground hidden md:inline">
        (Rendered server-side on first paint)
      </span>
    </div>
  );
}

async function MapClaimFooter() {
  const session = await getServerSession();

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
      <span className="px-3 py-1.5 rounded-lg bg-surface border border-border font-mono">
        Role: <strong className="capitalize">{session.role}</strong>
      </span>
      <span className="px-3 py-1.5 rounded-lg bg-surface border border-border font-mono">
        Ward: <strong>{session.wardId ?? 'Unassigned'}</strong>
      </span>
      <span className="px-3 py-1.5 rounded-lg bg-surface border border-border font-mono">
        Auth State: <strong>{session.isAuthenticated ? 'Signed In' : 'Public Visitor'}</strong>
      </span>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Top Banner / Identity Diagnostic */}
      <section className="bg-surface border-b border-border py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
          <Suspense
            fallback={
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <span>Loading identity claims...</span>
              </div>
            }
          >
            <IdentityDiagnostic />
          </Suspense>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/report" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Submit Complaint (PWA) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Official Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Public Map Shell Container */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        {/* Intro Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-card border border-border">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Public Infrastructure Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Live civic issues verified by AI vision and cross-checked evidence.
              Unverified closures remain grey until before-and-after photos match.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/report"
              className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Issue</span>
            </Link>
          </div>
        </div>

        {/* Status & Severity Filter Bar Placeholder */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Status Filters:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-md bg-surface-card border border-border font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-open" /> Open
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-card border border-border font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-assigned" /> Assigned
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-card border border-border font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-in-progress" /> In Progress
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-card border border-border font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-resolved" /> Resolved (Unverified)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-card border border-border font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-verified" /> Verified Fix
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-card border border-border font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-escalated" /> Escalated
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Severity:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-surface-card text-severity-1 border border-border font-semibold">
                Cosmetic
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-card text-severity-2 border border-border font-semibold">
                Significant
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-card text-severity-3 border border-border font-semibold">
                Critical
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-card text-severity-4 border border-border font-semibold">
                Emergency
              </span>
            </div>
          </div>
        </div>

        {/* Public Map Canvas Shell */}
        <div className="flex-1 min-h-[480px] rounded-2xl border border-border bg-surface-card relative flex flex-col items-center justify-center p-8 text-center overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Interactive Public Map Shell</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            This viewport hosts the Leaflet PostGIS map cluster in Phase 4. All shell panels, theme tokens,
            and role claim handlers are active.
          </p>
          <Suspense
            fallback={
              <div className="mt-6 text-xs text-muted animate-pulse">
                Loading role information...
              </div>
            }
          >
            <MapClaimFooter />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
