'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PublicMapPin, PublicMapApiResponse } from '@/app/api/map/public/route';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';
import { MapStatsBanner } from './MapStatsBanner';
import {
  MapFilterBar,
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  DATE_RANGES,
} from './MapFilterBar';
import { MapLegend } from './MapLegend';
import {
  RotateCw,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  Maximize2,
} from 'lucide-react';
import Link from 'next/link';

// Dynamically import PublicMapClient with ssr: false to prevent Leaflet window errors
const PublicMapClient = dynamic(() => import('./PublicMapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-surface border border-border rounded-2xl p-8 text-center text-muted-foreground animate-pulse">
      <MapPin className="w-10 h-10 mb-2 text-blue-600 opacity-60 animate-bounce" />
      <span className="text-sm font-semibold text-foreground">
        Initializing Interactive Public Map...
      </span>
      <span className="text-xs text-muted-foreground mt-1">
        Loading OpenStreetMap tiles and PostGIS marker clusters
      </span>
    </div>
  ),
});

interface PublicMapContainerProps {
  viewMode?: 'fullscreen' | 'embedded';
  className?: string;
}

export function PublicMapContainer({
  viewMode = 'embedded',
  className = '',
}: PublicMapContainerProps) {
  const [pins, setPins] = useState<PublicMapPin[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedCategories, setSelectedCategories] = useState<Set<ComplaintCategory>>(
    new Set(CATEGORY_OPTIONS.map((c) => c.id))
  );
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ComplaintStatus>>(
    new Set(STATUS_OPTIONS.map((s) => s.id))
  );
  const [dateRangeIndex, setDateRangeIndex] = useState<number>(DATE_RANGES.length - 1); // Default to 'All Days'
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Set current client time on mount to avoid Next.js prerender timestamp conflicts
  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  // Fetch Public Map Pins
  const fetchPins = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(Date.now());
    try {
      const res = await fetch('/api/map/public', {
        headers: { Accept: 'application/json' },
      });
      const data: PublicMapApiResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch public map data');
      }

      setPins(data.pins || []);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Unable to connect to map services');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  // Toggle Category Filter
  const handleToggleCategory = (category: ComplaintCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSelectAllCategories = () => {
    if (selectedCategories.size === CATEGORY_OPTIONS.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(CATEGORY_OPTIONS.map((c) => c.id)));
    }
  };

  // Toggle Status Filter
  const handleToggleStatus = (status: ComplaintStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const handleSelectAllStatuses = () => {
    if (selectedStatuses.size === STATUS_OPTIONS.length) {
      setSelectedStatuses(new Set());
    } else {
      setSelectedStatuses(new Set(STATUS_OPTIONS.map((s) => s.id)));
    }
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setSelectedCategories(new Set(CATEGORY_OPTIONS.map((c) => c.id)));
    setSelectedStatuses(new Set(STATUS_OPTIONS.map((s) => s.id)));
    setDateRangeIndex(DATE_RANGES.length - 1);
  };

  // Derived Filtered Pins
  const filteredPins = useMemo(() => {
    const daysLimit = DATE_RANGES[dateRangeIndex].days;

    return pins.filter((pin) => {
      // 1. Category check
      if (!selectedCategories.has(pin.category)) return false;

      // 2. Status check
      if (!selectedStatuses.has(pin.status)) return false;

      // 3. Date check (evaluated safely with client timestamp)
      if (daysLimit !== null && currentTime > 0) {
        const pinTime = new Date(pin.created_at).getTime();
        const diffMs = currentTime - pinTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > daysLimit) return false;
      }

      return true;
    });
  }, [pins, selectedCategories, selectedStatuses, dateRangeIndex, currentTime]);

  // Fullscreen layout
  if (viewMode === 'fullscreen') {
    return (
      <div className="relative w-full h-[calc(100vh-65px)] flex flex-col overflow-hidden bg-background">
        {/* Floating Top Control Bar */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
            {/* Stats Banner Floating */}
            <div className="w-full lg:w-auto lg:max-w-2xl">
              <MapStatsBanner visiblePins={filteredPins} />
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                className="px-3.5 py-2.5 rounded-xl bg-surface-card/95 border border-border shadow-sm text-xs font-semibold text-foreground hover:bg-surface transition-colors flex items-center gap-2 pointer-events-auto backdrop-blur-md cursor-pointer"
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Filters ({filteredPins.length})</span>
                {showFiltersMobile ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={fetchPins}
                disabled={isLoading}
                title="Refresh Map Data"
                className="p-2.5 rounded-xl bg-surface-card/95 border border-border shadow-sm text-foreground hover:bg-surface transition-colors pointer-events-auto backdrop-blur-md cursor-pointer"
              >
                <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Collapsible Filter Bar Overlay */}
          {showFiltersMobile && (
            <div className="pointer-events-auto max-w-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <MapFilterBar
                selectedCategories={selectedCategories}
                onToggleCategory={handleToggleCategory}
                onSelectAllCategories={handleSelectAllCategories}
                selectedStatuses={selectedStatuses}
                onToggleStatus={handleToggleStatus}
                onSelectAllStatuses={handleSelectAllStatuses}
                dateRangeIndex={dateRangeIndex}
                onChangeDateRange={setDateRangeIndex}
                onResetFilters={handleResetFilters}
                totalFilteredCount={filteredPins.length}
                totalAvailableCount={pins.length}
                className="bg-surface-card/95 backdrop-blur-md max-h-[75vh] overflow-y-auto"
              />
            </div>
          )}
        </div>

        {/* Floating Bottom Left Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] hidden sm:block max-w-xs pointer-events-auto">
          {showLegend ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
              >
                ✕
              </button>
              <MapLegend />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLegend(true)}
              className="px-3 py-1.5 rounded-xl bg-surface-card/95 border border-border text-xs font-semibold shadow-md backdrop-blur-md hover:bg-surface text-foreground transition-colors cursor-pointer"
            >
              Show Legend
            </button>
          )}
        </div>

        {/* Map Canvas */}
        <div className="flex-1 w-full h-full relative z-0">
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
              <h3 className="text-base font-bold text-foreground">Map Error</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
              <button
                type="button"
                onClick={fetchPins}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <PublicMapClient pins={filteredPins} className="w-full h-full" />
          )}
        </div>
      </div>
    );
  }

  // Embedded layout (for Home page or Dashboard panel)
  return (
    <div className={`flex flex-col gap-5 w-full ${className}`}>
      {/* Dynamic Statistics Banner */}
      <MapStatsBanner visiblePins={filteredPins} />

      {/* Main Map Container Card */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs flex flex-col">
        {/* Top Filter and Controls Bar */}
        <div className="p-3.5 border-b border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Public Complaint Clusters
              </h2>
              <span className="text-xs text-muted-foreground">
                (PostGIS verified pins)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-foreground transition-colors shadow-2xs"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Full Viewport</span>
              </Link>

              <button
                type="button"
                onClick={fetchPins}
                disabled={isLoading}
                title="Refresh Map"
                className="p-1.5 rounded-md bg-surface hover:bg-surface-hover border border-border text-foreground transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          <MapFilterBar
            selectedCategories={selectedCategories}
            onToggleCategory={handleToggleCategory}
            onSelectAllCategories={handleSelectAllCategories}
            selectedStatuses={selectedStatuses}
            onToggleStatus={handleToggleStatus}
            onSelectAllStatuses={handleSelectAllStatuses}
            dateRangeIndex={dateRangeIndex}
            onChangeDateRange={setDateRangeIndex}
            onResetFilters={handleResetFilters}
            totalFilteredCount={filteredPins.length}
            totalAvailableCount={pins.length}
            className="border-0 shadow-none p-0 bg-transparent"
          />
        </div>

        {/* Embedded Map Canvas Viewport */}
        <div className="relative w-full h-[540px] sm:h-[600px] z-0">
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-sm font-semibold text-foreground">{error}</p>
              <button
                type="button"
                onClick={fetchPins}
                className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white"
              >
                Retry
              </button>
            </div>
          ) : (
            <PublicMapClient pins={filteredPins} className="w-full h-full" />
          )}

          {/* Floating Legend on Bottom Left of Embedded Map */}
          <div className="absolute bottom-3 left-3 z-[1000] hidden sm:block max-w-xs">
            <MapLegend />
          </div>
        </div>
      </div>
    </div>
  );
}
