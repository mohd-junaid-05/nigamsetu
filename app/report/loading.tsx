import React from 'react';
import { Loader2, Camera } from 'lucide-react';

export default function ReportLoading() {
  return (
    <div className="flex-1 bg-surface py-6 px-4 sm:px-6">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="w-24 h-4 bg-muted/20 rounded animate-pulse" />
          <div className="w-28 h-5 bg-muted/20 rounded-full animate-pulse" />
        </div>
        <div className="bg-surface-card p-4 rounded-2xl border border-border space-y-2">
          <div className="w-40 h-5 bg-muted/20 rounded animate-pulse" />
          <div className="w-64 h-3 bg-muted/20 rounded animate-pulse" />
        </div>
        <div className="bg-surface-card p-6 rounded-2xl border border-border flex flex-col items-center justify-center min-h-[300px] text-center">
          <Camera className="w-10 h-10 text-muted-foreground/40 animate-pulse mb-3" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Initializing camera and GPS subsystem...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
