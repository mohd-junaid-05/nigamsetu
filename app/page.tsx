import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { MapPin, AlertTriangle, ArrowRight } from 'lucide-react';
import { PublicMapContainer } from '@/components/map/PublicMapContainer';

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
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border/60 pt-4">
      <div className="flex items-center gap-2">
        <span>Identity Session:</span>
        <strong className="capitalize text-foreground font-mono">{session.role}</strong>
        {session.wardId && (
          <span className="font-mono text-foreground font-semibold">({session.wardId})</span>
        )}
      </div>
      <div>
        <span>Status: </span>
        <strong className="text-foreground">{session.isAuthenticated ? 'Signed In' : 'Public Visitor (Anonymous)'}</strong>
      </div>
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
            <Link href="/map" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Full Map View <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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

        {/* Embedded Public Map View */}
        <Suspense
          fallback={
            <div className="w-full h-[540px] rounded-2xl bg-surface border border-border animate-pulse flex items-center justify-center text-sm text-muted-foreground">
              Loading Public Map Tracker...
            </div>
          }
        >
          <PublicMapContainer viewMode="embedded" />
        </Suspense>

        <Suspense
          fallback={
            <div className="mt-4 text-xs text-muted animate-pulse">
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
