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
} from 'lucide-react';

async function UserRoleClaimBadge() {
  const session = await getServerSession();

  if (!session.isAuthenticated || session.role === 'citizen') {
    return null;
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    official: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    facility: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
  };

  return (
    <div
      data-testid="server-role-badge"
      className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${
        roleColors[session.role] ?? 'bg-white/10 text-white/90 border-white/15'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#FFB81D]" />
      <span>{session.role}</span>
    </div>
  );
}

export async function AppHeader() {
  const session = await getServerSession();
  const isOfficial =
    session.isAuthenticated &&
    (session.role === 'admin' || session.role === 'official' || session.role === 'facility');

  return (
    <header className="sticky top-0 z-[1000] w-full shadow-md bg-[#071D49] dark:bg-[#070b14] border-b-2 border-[#FFB81D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB81D] rounded py-1 group shrink-0"
          title="NigamSetu — Official AI Civic Fix Platform"
        >
          <div className="w-9 h-9 rounded-lg bg-white p-0.5 shadow-sm border border-white/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
            <img
              src="/images/logo.png"
              alt="NigamSetu Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight font-black tracking-tight text-base text-white group-hover:text-[#FFB81D] transition-colors">
              NigamSetu
            </span>
            <span className="text-[9px] text-white/70 tracking-widest uppercase font-semibold">
              AI Civic Fix Platform
            </span>
          </div>
        </Link>

        {/* Center: Primary Navigation (Desktop) */}
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

        {/* Right: Actions, Theme & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Suspense fallback={null}>
            <UserRoleClaimBadge />
          </Suspense>
          <ThemeToggle />
          <div className="h-5 w-px bg-white/20 hidden sm:block" />
          <HeaderAuth />
        </div>
      </div>

      {/* Mobile nav strip — compact & role-tailored */}
      <div className="md:hidden bg-[#051535] dark:bg-black/90 border-t border-white/10 flex items-center justify-around px-2 py-2 text-xs font-medium text-white/80 overflow-x-auto gap-1">
        <Link href="/" className="px-2.5 py-1.5 hover:text-white flex items-center gap-1 shrink-0 rounded hover:bg-white/10 transition-colors">
          <span>Home</span>
        </Link>
        <Link href="/map" className="px-2.5 py-1.5 hover:text-white flex items-center gap-1.5 shrink-0 rounded hover:bg-white/10 transition-colors">
          <MapPin className="w-3.5 h-3.5 text-[#FFB81D]" />
          <span>Map</span>
        </Link>
        <Link href="/report" className="px-3 py-1.5 bg-[#FFB81D] text-[#071D49] font-bold flex items-center gap-1 shrink-0 rounded transition-colors shadow-xs">
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
