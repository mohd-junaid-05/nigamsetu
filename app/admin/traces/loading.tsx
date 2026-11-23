import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export default function AdminTracesLoading() {
  return (
    <div className="flex-1 bg-surface py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-surface-card p-6 rounded-2xl border border-border flex items-center justify-between">
          <div className="space-y-2">
            <div className="w-56 h-6 bg-muted/20 rounded animate-pulse" />
            <div className="w-80 h-3 bg-muted/20 rounded animate-pulse" />
          </div>
          <div className="w-32 h-8 bg-muted/20 rounded-xl animate-pulse" />
        </div>
        <div className="bg-surface-card p-12 rounded-2xl border border-border flex flex-col items-center justify-center text-center">
          <Sparkles className="w-8 h-8 text-purple-600 animate-pulse mb-3" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            <span>Loading agent traces and audit decision logs...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
