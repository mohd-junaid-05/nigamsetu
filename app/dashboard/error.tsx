'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[65vh] p-6 text-center bg-surface">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface-card shadow-lg flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-bold text-foreground">Dashboard Unavailable</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error?.message || 'Unable to connect to municipal priority queues or load ward boundaries.'}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Queue</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-surface-hover transition-colors text-foreground flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Public View</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
