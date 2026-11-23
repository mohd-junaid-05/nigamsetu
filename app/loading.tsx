'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-4">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <h2 className="text-base font-bold text-foreground">Loading NigamSetu...</h2>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Syncing municipal spatial data and AI verification engine.
      </p>
    </div>
  );
}
