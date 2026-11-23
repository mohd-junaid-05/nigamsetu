import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { MapPin, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
import { PublicMapContainer } from '@/components/map/PublicMapContainer';

async function IdentityDiagnostic() {
  const session = await getServerSession();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground font-medium">Session Status:</span>
      <span
        data-testid="server-role-display"
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-xs font-medium bg-surface border border-border capitalize text-foreground"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            session.isAuthenticated ? 'bg-status-verified' : 'bg-slate-400'
          }`}
        />
        <span>Role: {session.role} {session.wardId ? `| Ward: ${session.wardId}` : '| (All Wards)'}</span>
      </span>
      <span className="text-[11px] text-muted-foreground hidden lg:inline">
        • Server-verified claims
      </span>
    </div>
  );
}

async function MapClaimFooter() {
  const session = await getServerSession();

  return (
    <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <span>Active User Claim:</span>
        <strong className="capitalize text-foreground font-mono font-medium">{session.role}</strong>
        {session.wardId && (
          <span className="font-mono text-foreground font-medium">({session.wardId})</span>
        )}
      </div>
      <div>
        <span>Access Level: </span>
        <strong className="text-foreground font-medium">
          {session.isAuthenticated ? 'Authenticated Civic User' : 'Public Explorer (Read-Only)'}
        </strong>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Top Banner / Identity Bar */}
      <section className="bg-surface border-b border-border py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <Suspense
            fallback={
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <span>Checking server identity claims...</span>
              </div>
            }
          >
            <IdentityDiagnostic />
          </Suspense>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/report"
              className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Submit Complaint</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="/dashboard"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Official Operations</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        {/* Civic Hero / Overview */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-xl bg-surface border border-border shadow-xs">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-600/10 text-blue-700 dark:text-blue-400 border border-blue-600/20 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Evidence-Based Civic Accountability</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Municipal Infrastructure & Hazard Monitor
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track road defects, drainage blockages, and sanitation hazards across Bangalore municipal wards.
              Repairs require photographic proof verified by AI vision before ticket closure.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/report"
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-xs transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Issue</span>
            </Link>
            <Link
              href="/map"
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-surface hover:bg-surface-hover text-foreground border border-border active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Full Map</span>
            </Link>
          </div>
        </section>

        {/* Embedded Public Map View */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Live Civic Map & Incident Pins</span>
            <span>Realtime Ward GIS Data</span>
          </div>

          <Suspense
            fallback={
              <div className="w-full h-[540px] rounded-xl bg-surface border border-border animate-pulse flex items-center justify-center text-sm text-muted-foreground">
                Loading Public Map View...
              </div>
            }
          >
            <PublicMapContainer viewMode="embedded" />
          </Suspense>
        </section>

        <Suspense
          fallback={
            <div className="mt-4 text-xs text-muted-foreground animate-pulse">
              Loading session diagnostics...
            </div>
          }
        >
          <MapClaimFooter />
        </Suspense>
      </div>
    </div>
  );
}
