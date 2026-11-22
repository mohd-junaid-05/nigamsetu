'use client';

import React from 'react';
import { Info } from 'lucide-react';

interface MapLegendProps {
  className?: string;
}

export function MapLegend({ className = '' }: MapLegendProps) {
  return (
    <div
      data-testid="map-legend"
      className={`rounded-2xl bg-surface-card/95 border border-border p-3.5 shadow-md backdrop-blur-md text-xs space-y-3 ${className}`}
    >
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-foreground">
        <Info className="w-3.5 h-3.5 text-blue-600" />
        <span>Map Legend</span>
      </div>

      {/* Status Indicators */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Status Colors
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-open shrink-0" />
            <span className="text-foreground">Open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-assigned shrink-0" />
            <span className="text-foreground">Assigned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-in-progress shrink-0" />
            <span className="text-foreground">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-resolved shrink-0" />
            <span className="text-foreground">Resolved (Unverified)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-verified shrink-0" />
            <span className="text-foreground">Verified Fix</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-escalated shrink-0" />
            <span className="text-foreground">Escalated</span>
          </div>
        </div>
      </div>

      {/* Severity Scaling */}
      <div className="space-y-1.5 pt-2 border-t border-border/50">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Severity Size Scale
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted" />
            <span>Cosmetic</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-muted" />
            <span>Significant</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4.5 h-4.5 rounded-full bg-muted" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-5.5 h-5.5 rounded-full bg-status-open animate-pulse" />
            <span className="font-semibold text-foreground">Emergency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
