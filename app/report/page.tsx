import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { Smartphone, ArrowLeft } from 'lucide-react';
import { ReportContainer } from '@/components/complaints/ReportContainer';

async function ReportShell() {
  const session = await getServerSession();

  return (
    <div className="flex-1 bg-surface py-6 px-4 sm:px-6">
      {/* Mobile-First Container */}
      <div className="max-w-md mx-auto flex flex-col gap-4">
        {/* Back navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Public Map</span>
          </Link>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold flex items-center gap-1">
            <Smartphone className="w-3 h-3" /> PWA Standalone Ready
          </span>
        </div>

        {/* Title & Role Header */}
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Report Civic Failure
            </h1>
            <span
              data-testid="citizen-role-badge"
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border text-foreground capitalize"
            >
              {session.role}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Photos and coordinates are automatically routed to your municipal ward.
          </p>
        </div>

        {/* Interactive Complaint Form & My Complaints Flow */}
        <ReportContainer userRole={session.role} />
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-surface py-12 px-4 flex items-center justify-center text-xs text-muted-foreground">
          Loading complaint submission interface...
        </div>
      }
    >
      <ReportShell />
    </Suspense>
  );
}
