import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { Camera, MapPin, Smartphone, ArrowLeft } from 'lucide-react';

async function CitizenClaimBadge() {
  const session = await getServerSession();

  return (
    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Reporter Claim:</span>
      <span
        data-testid="citizen-role-badge"
        className="font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border text-foreground capitalize"
      >
        {session.role}
      </span>
    </div>
  );
}

export default function ReportPage() {
  return (
    <div className="flex-1 bg-surface py-6 px-4 sm:px-6">
      {/* Mobile-First Container */}
      <div className="max-w-md mx-auto flex flex-col gap-5">
        {/* Back navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Public Map</span>
          </Link>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 font-semibold flex items-center gap-1">
            <Smartphone className="w-3 h-3" /> PWA Standalone Ready
          </span>
        </div>

        {/* Title & Role Info */}
        <div className="bg-surface-card p-5 rounded-2xl border border-border">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Report Civic Infrastructure
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Submit road potholes, garbage heaps, broken drainage, or school/clinic damage.
          </p>

          <Suspense
            fallback={
              <div className="mt-4 pt-3 border-t border-border text-xs text-muted animate-pulse">
                Loading reporter claim...
              </div>
            }
          >
            <CitizenClaimBadge />
          </Suspense>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-card border border-border rounded-xl text-center text-xs font-medium">
          <button type="button" className="py-2 px-3 rounded-lg bg-blue-600 text-white font-semibold">
            Report
          </button>
          <button type="button" className="py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground">
            My Complaints
          </button>
          <Link href="/" className="py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground">
            Map
          </Link>
        </div>

        {/* Camera / Photo Capture Intake Shell */}
        <div className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-surface-card gap-3">
          <div className="w-16 h-16 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center shadow-inner">
            <Camera className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Take or Upload Evidence Photo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every verification requires genuine image evidence.
            </p>
          </div>
          <button
            type="button"
            className="mt-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Open Camera
          </button>
        </div>

        {/* GPS Location Auto-Detection Placeholder */}
        <div className="p-4 rounded-2xl bg-surface-card border border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-status-in-progress/10 text-status-in-progress flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-foreground">Live GPS Coordinates</h4>
            <p className="text-[11px] text-muted-foreground truncate">
              Detects nearest ward boundary for routing
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-verified/10 text-status-verified font-bold">
            GPS Active
          </span>
        </div>

        {/* Sticky Mobile Submit Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled
            className="w-full py-3 px-4 rounded-xl bg-surface text-muted-foreground border border-border font-bold text-sm cursor-not-allowed"
          >
            Submit Complaint (Phase 3)
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Complaint submission pipeline activates in Phase 3.
          </p>
        </div>
      </div>
    </div>
  );
}
