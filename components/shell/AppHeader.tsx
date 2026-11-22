import Link from 'next/link';
import { Suspense } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { getServerSession } from '@/lib/auth/session';
import { MapPin, ShieldAlert, FileText } from 'lucide-react';

async function UserRoleClaimBadge() {
  const session = await getServerSession();

  if (!session.isAuthenticated) {
    return (
      <div
        data-testid="server-role-badge"
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-border bg-surface text-muted-foreground"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
        <span>Visitor (Public)</span>
      </div>
    );
  }

  return (
    <div
      data-testid="server-role-badge"
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-border bg-surface"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-status-verified" />
      <span className="text-muted-foreground">Role:</span>
      <span className="font-semibold capitalize text-foreground">{session.role}</span>
      {session.wardId && (
        <>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">Ward:</span>
          <span className="font-mono font-medium text-foreground">{session.wardId}</span>
        </>
      )}
    </div>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/75">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-sm">
              NS
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-foreground font-black tracking-tight">NigamSetu</span>
              <span className="text-[10px] text-muted tracking-wider uppercase font-semibold mt-0.5">
                AI Civic Fix Layer
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>Public Map</span>
            </Link>
            <Link
              href="/report"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Report Issue</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                Mobile
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Official Dashboard</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold">
                Ops
              </span>
            </Link>
          </nav>
        </div>

        {/* Right Section: Role Claim, Ward, Theme, Auth */}
        <div className="flex items-center gap-3">
          <Suspense
            fallback={
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-border bg-surface text-muted-foreground animate-pulse">
                <span>Loading identity...</span>
              </div>
            }
          >
            <UserRoleClaimBadge />
          </Suspense>

          {/* Theme Switcher */}
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
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Sign In
                  </button>
                </SignInButton>
              </Show>
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
