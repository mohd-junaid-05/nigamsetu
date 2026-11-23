import Link from 'next/link';
import { Suspense } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { getServerSession } from '@/lib/auth/session';
import {
  MapPin,
  ShieldAlert,
  FileText,
  Building2,
  Sparkles,
  PlayCircle,
  Menu,
} from 'lucide-react';

async function UserRoleClaimBadge() {
  const session = await getServerSession();

  if (!session.isAuthenticated) {
    return (
      <div
        data-testid="server-role-badge"
        className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border border-border bg-surface text-muted-foreground"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span className="font-medium">Public Visitor</span>
      </div>
    );
  }

  return (
    <div
      data-testid="server-role-badge"
      className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border border-border bg-surface"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-status-verified" />
      <span className="text-muted-foreground font-medium">Role:</span>
      <span className="font-semibold capitalize text-foreground">{session.role}</span>
      {session.wardId && (
        <>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">Ward:</span>
          <span className="font-mono font-semibold text-foreground">{session.wardId}</span>
        </>
      )}
    </div>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface/85 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-3 text-foreground focus-visible:ring-2 focus-visible:ring-accent rounded-md py-1"
          >
            <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-sm tracking-tight shadow-xs">
              NS
            </div>
            <div className="flex flex-col">
              <span className="leading-tight font-black tracking-tight text-base">
                NigamSetu
              </span>
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">
                AI Civic Fix Platform
              </span>
            </div>
          </Link>

          {/* Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/map"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Public Map</span>
            </Link>
            <Link
              href="/report"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Report Issue</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Official Operations</span>
            </Link>
            <Link
              href="/facility"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Facility Depot</span>
            </Link>
            <Link
              href="/admin/traces"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>AI Traces</span>
            </Link>
            <Link
              href="/demo"
              className="px-2.5 py-1 rounded-md text-xs font-semibold text-foreground/90 hover:text-foreground hover:bg-surface-hover border border-border transition-colors flex items-center gap-1.5 ml-1"
            >
              <PlayCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Demo</span>
            </Link>
          </nav>
        </div>

        {/* Right Section: Identity Badge, Theme, Auth */}
        <div className="flex items-center gap-2.5">
          <Suspense
            fallback={
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border border-border bg-surface text-muted-foreground animate-pulse">
                <span>Loading identity...</span>
              </div>
            }
          >
            <UserRoleClaimBadge />
          </Suspense>

          <ThemeToggle />

          {/* User Sign-In / User Profile Button */}
          <div className="flex items-center pl-1">
            <Suspense fallback={<div className="w-8 h-8 rounded-full bg-surface border border-border animate-pulse" />}>
              <Show when="signed-in">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8',
                    },
                  }}
                />
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Sign In
                  </button>
                </SignInButton>
              </Show>
            </Suspense>
          </div>
        </div>
      </div>

      {/* Mobile Secondary Action Strip */}
      <div className="md:hidden flex items-center justify-around border-t border-border bg-surface px-2 py-2 text-xs font-medium text-muted-foreground overflow-x-auto">
        <Link href="/map" className="px-2 py-1 hover:text-foreground flex items-center gap-1 shrink-0">
          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Map</span>
        </Link>
        <Link href="/report" className="px-2 py-1 hover:text-foreground flex items-center gap-1 shrink-0 font-semibold text-foreground">
          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Report</span>
        </Link>
        <Link href="/dashboard" className="px-2 py-1 hover:text-foreground flex items-center gap-1 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          <span>Dashboard</span>
        </Link>
        <Link href="/facility" className="px-2 py-1 hover:text-foreground flex items-center gap-1 shrink-0">
          <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Depot</span>
        </Link>
        <Link href="/demo" className="px-2 py-1 hover:text-foreground flex items-center gap-1 shrink-0 font-medium">
          <PlayCircle className="w-3.5 h-3.5 text-red-600" />
          <span>Demo</span>
        </Link>
      </div>
    </header>
  );
}
