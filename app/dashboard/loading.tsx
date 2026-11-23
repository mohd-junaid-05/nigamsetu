'use client';

import React from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col bg-surface min-h-[calc(100vh-4rem)]">
      {/* Top Bar Skeleton */}
      <div className="bg-surface-card border-b border-border py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted/20 animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-48 h-4 bg-muted/20 rounded animate-pulse" />
              <div className="w-72 h-3 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-24 h-7 bg-muted/20 rounded-full animate-pulse" />
        </div>
      </div>

      {/* 3-Panel Skeleton */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
        {/* Left Panel Skeleton: Priority Queue */}
        <div className="w-full lg:w-1/4 bg-surface-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="w-28 h-4 bg-muted/20 rounded animate-pulse" />
            <div className="w-12 h-4 bg-muted/20 rounded-full animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <div className="w-16 h-3 bg-muted/20 rounded animate-pulse" />
                  <div className="w-10 h-3 bg-muted/20 rounded animate-pulse" />
                </div>
                <div className="w-full h-3 bg-muted/20 rounded animate-pulse" />
                <div className="w-3/4 h-2 bg-muted/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel Skeleton: Map */}
        <div className="w-full lg:w-1/2 bg-surface-card border border-border rounded-xl p-4 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <p className="text-xs text-muted-foreground font-medium">Loading ward map and live tickets...</p>
        </div>

        {/* Right Panel Skeleton: Detail */}
        <div className="w-full lg:w-1/4 bg-surface-card border border-border rounded-xl p-4 flex flex-col gap-4">
          <div className="w-32 h-4 bg-muted/20 rounded animate-pulse" />
          <div className="w-full h-48 bg-muted/20 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="w-full h-3 bg-muted/20 rounded animate-pulse" />
            <div className="w-5/6 h-3 bg-muted/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
