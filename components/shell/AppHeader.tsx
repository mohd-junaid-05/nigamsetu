import Link from 'next/link';
import { Suspense } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { HeaderAuth } from '@/components/shell/HeaderAuth';
import { getServerSession } from '@/lib/auth/session';
import {
  MapPin,
  ShieldAlert,
  FileText,
  Building2,
  Sparkles,
  PlayCircle,
  Globe,
  ChevronRight,
} from 'lucide-react';

async function UserRoleClaimBadge() {
  const session = await getServerSession();

  if (!session.isAuthenticated) {
    return (
      <div
        data-testid="server-role-badge"
        className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded text-xs border border-border bg-surface text-muted-foreground"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span className="font-medium">Public Visitor</span>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    official: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    facility: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
    citizen: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  };

  return (
    <div
      data-testid="server-role-badge"
      className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border font-medium capitalize ${roleColors[session.role] ?? roleColors.citizen}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span>{session.role}</span>
      {session.wardId && (
        <span className="opacity-70 font-mono">· {session.wardId}</span>
      )}
    </div>
  );
}

export async function AppHeader() {
  const session = await getServerSession();
  const isOfficial =
    session.isAuthenticated &&
    (session.role === 'admin' || session.role === 'official' || session.role === 'facility');

  return (
    <header className="sticky top-0 z-[1000] w-full shadow-md">
      {/* GOV.UK-style top identity bar — slim, authoritative */}
      <div className="bg-[#0b0c0c] dark:bg-[#000000] text-white text-xs py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium">
            <Globe className="w-3 h-3 opacity-70" />
            <span className="opacity-80">Official municipal civic platform — Hyderabad, Telangana (GHMC)</span>
          </div>
          <div className="flex items-center gap-4">
            <Suspense fallback={null}>
              <UserRoleClaimBadge />
            </Suspense>
            <ThemeToggle />
            <HeaderAuth />
          </div>
        </div>
      </div>

      {/* Main navigation bar — Utah.gov civic navy style (dark: pure black) */}
      <div className="bg-[#071D49] dark:bg-black border-b-4 border-[#FFB81D] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB81D] rounded py-1 group"
          >
            <div className="w-9 h-9 rounded bg-[#FFB81D] text-[#071D49] flex items-center justify-center font-black text-sm tracking-tight shadow-sm">
              NS
            </div>
            <div className="flex flex-col">
              <span className="leading-tight font-black tracking-tight text-base text-white group-hover:text-[#FFB81D] transition-colors">
                NigamSetu
              </span>
              <span className="text-[9px] text-white/60 tracking-widest uppercase font-semibold">
                AI Civic Fix Platform
              </span>
            </div>
          </Link>

          {/* Primary Navigation — desktop */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded flex items-center gap-1.5 text-sm"
            >
              Overview
            </Link>
            <Link
              href="/map"
              className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded flex items-center gap-1.5 text-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-[#FFB81D]" />
              <span>Public Map</span>
            </Link>
            <Link
              href="/report"
              className="px-3.5 py-1.5 bg-[#FFB81D] text-[#071D49] font-bold text-xs rounded hover:bg-amber-300 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </Link>

            {/* Official / Internal Pages (Visible ONLY to authorized officials, depot managers & admins) */}
            {isOfficial && (
              <>
                <span className="h-4 w-px bg-white/20 mx-1" />
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded flex items-center gap-1.5 text-sm"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-300" />
                  <span>Official Ops</span>
                </Link>
                <Link
                  href="/facility"
                  className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded flex items-center gap-1.5 text-sm"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Depot</span>
                </Link>
                <Link
                  href="/admin/traces"
                  className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded flex items-center gap-1.5 text-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>AI Traces</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile nav strip — compact & role-tailored */}
      <div className="md:hidden bg-[#071D49] dark:bg-black border-b-2 border-[#FFB81D]/40 flex items-center justify-around px-2 py-2 text-xs font-medium text-white/80 overflow-x-auto gap-1">
        <Link href="/" className="px-2 py-1.5 hover:text-white flex items-center gap-1 shrink-0 rounded hover:bg-white/10 transition-colors">
          <span>Home</span>
        </Link>
        <Link href="/map" className="px-2 py-1.5 hover:text-white flex items-center gap-1 shrink-0 rounded hover:bg-white/10 transition-colors">
          <MapPin className="w-3.5 h-3.5 text-[#FFB81D]" />
          <span>Map</span>
        </Link>
        <Link href="/report" className="px-3 py-1.5 bg-[#FFB81D] text-[#071D49] font-bold flex items-center gap-1 shrink-0 rounded transition-colors">
          <FileText className="w-3.5 h-3.5" />
          <span>Report</span>
        </Link>
        {isOfficial && (
          <>
            <Link href="/dashboard" className="px-2 py-1.5 hover:text-white flex items-center gap-1 shrink-0 rounded hover:bg-white/10 transition-colors">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-300" />
              <span>Ops</span>
            </Link>
            <Link href="/facility" className="px-2 py-1.5 hover:text-white flex items-center gap-1 shrink-0 rounded hover:bg-white/10 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Depot</span>
            </Link>
            <Link href="/admin/traces" className="px-2 py-1.5 hover:text-white flex items-center gap-1 shrink-0 rounded hover:bg-white/10 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Traces</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
