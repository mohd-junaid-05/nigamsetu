'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
 Bryan?: string;
}) {
  useEffect(() => {
    // Log safe error without exposing unformatted internals to UI
    console.error('[NigamSetu Application Error]', error);
  }, [error]);

  const readableMessage =
    error?.message && !error.message.includes('digest')
      ? error.message
      : 'An unexpected issue occurred while communicating with the civic data service.';

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[65vh] p-6 text-center bg-surface">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface-card shadow-lg flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-status-open flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black text-foreground">Something went wrong</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {readableMessage}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-surface-hover transition-colors text-foreground flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Map</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
