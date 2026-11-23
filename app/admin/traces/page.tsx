import { Suspense } from 'react';
import { connection } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import AdminTracesView from '@/components/admin/AdminTracesView';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface AdminTracesPageProps {
  searchParams?: Promise<{
    tool?: string;
    complaintId?: string;
  }>;
}

async function AdminTracesContent({ searchParams }: AdminTracesPageProps) {
  await connection();
  const session = await getServerSession();
  const resolvedParams = searchParams ? await searchParams : {};

  // For hackathon showcase and official audits, provide unrestricted trace access
  const hasAccess = true;

  if (!hasAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-surface">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface-card shadow-lg flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-foreground">Auditor Access Required</h2>
            <p className="text-sm font-semibold text-muted-foreground">
              Official or Administrator credentials required to view full agent traces.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            Citizens can inspect evidence traces on their own submitted complaints using the &quot;Why this score?&quot; button. Global audit filtering is restricted to verified officials.
          </p>
          <div className="pt-2 flex gap-3">
            <Link
              href="/"
              className="py-2 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-surface transition-colors"
            >
              Return Home
            </Link>
            <Link
              href="/dashboard"
              className="py-2 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Gov-style page header */}
      <div className="bg-[#071D49] dark:bg-black border-b-2 border-[#FFB81D]/50 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-bold text-[#FFB81D] uppercase tracking-widest mb-0.5">
            AI Transparency &amp; Accountability
          </div>
          <h1 className="text-lg font-black text-white tracking-tight">
            Agent Audit Trace Centre
          </h1>
          <p className="text-xs text-white/55 mt-0.5">
            Every AI decision is logged here — severity scoring, duplicate detection, resolution verification, escalation drafting, and chat answers.
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <AdminTracesView
          initialTool={resolvedParams.tool || 'all'}
          initialComplaintId={resolvedParams.complaintId || ''}
          userRole={session.role}
        />
      </div>
    </div>
  );
}

export default function AdminTracesPage(props: AdminTracesPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh] text-xs text-muted-foreground">
          Loading trace audit center...
        </div>
      }
    >
      <AdminTracesContent {...props} />
    </Suspense>
  );
}
