import React from 'react';
import Link from 'next/link';
import { MapPin, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[65vh] p-6 text-center bg-surface">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface-card shadow-lg flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
          <MapPin className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black text-foreground">Ward Not Found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The civic page or complaint resource you requested does not exist or has been archived.
          </p>
        </div>
        <Link
          href="/"
          className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Back to Public Map</span>
        </Link>
      </div>
    </div>
  );
}
