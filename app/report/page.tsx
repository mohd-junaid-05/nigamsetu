import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { Smartphone, ArrowLeft, ChevronRight, FileText, ShieldCheck } from 'lucide-react';
import { ReportContainer } from '@/components/complaints/ReportContainer';

async function ReportShell() {
  const session = await getServerSession();

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Gov-style page header banner (Utah.gov / GOV.UK pattern) */}
      <div className="bg-[#071D49] dark:bg-black border-b-2 border-[#FFB81D]/40 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-white/60 mb-2">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#FFB81D] font-medium">Report Issue</span>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#FFB81D] text-[#071D49] flex items-center justify-center font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Municipal Defect &amp; Hazard Reporting
                </h1>
                <p className="text-xs text-white/70 mt-0.5">
                  Official citizen submission portal · Hyderabad Municipal Wards (GHMC)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                data-testid="citizen-role-badge"
                className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white/10 text-white border border-white/20 capitalize flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Role: {session.role}
              </span>
              <span className="text-[11px] font-mono px-2 py-1 rounded bg-[#FFB81D]/20 text-[#FFB81D] font-semibold hidden sm:flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> PWA Ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content Container */}
      <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-xl mx-auto flex flex-col gap-5">
          {/* Instructions Notice Banner (GOV.UK style) */}
          <div className="bg-surface border-l-4 border-[#071D49] dark:border-[#1d70b8] border-y border-r border-border p-4 rounded-r-lg shadow-xs">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#1d70b8] dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-foreground">
                  Evidence-based verification required
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Your complaint will be scored by AI vision and routed directly to the responsible ward depot. Repairs are verified against before/after photographic proof prior to ticket closure.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Complaint Form & My Complaints Flow */}
          <ReportContainer userRole={session.role} />
        </div>
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
