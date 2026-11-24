'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-md border border-border flex items-center justify-center overflow-hidden">
          <img
            src="/images/logo.png"
            alt="NigamSetu Logo"
            width={56}
            height={56}
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#071D49] text-[#FFB81D] flex items-center justify-center shadow">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      </div>
      <h2 className="text-base font-black text-foreground tracking-tight">Loading NigamSetu...</h2>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Syncing municipal spatial data and AI verification engine.
      </p>
    </div>
  );
}
