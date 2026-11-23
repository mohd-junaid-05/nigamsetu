'use client';

import React from 'react';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';
import {
  RotateCcw,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';

export const CATEGORY_OPTIONS: { id: ComplaintCategory; label: string; icon: string }[] = [
  { id: 'road', label: 'Roads & Potholes', icon: '🛣️' },
  { id: 'garbage', label: 'Garbage & Waste', icon: '🗑️' },
  { id: 'sewage', label: 'Drainage & Sewage', icon: '🚰' },
  { id: 'school', label: 'Schools', icon: '🏫' },
  { id: 'healthcenter', label: 'Health Clinics', icon: '🏥' },
  { id: 'other', label: 'Other', icon: '📦' },
];

export const STATUS_OPTIONS: { id: ComplaintStatus; label: string; colorClass: string; dotColor: string }[] = [
  { id: 'open', label: 'Open', colorClass: 'text-status-open', dotColor: 'bg-status-open' },
  { id: 'assigned', label: 'Assigned', colorClass: 'text-status-assigned', dotColor: 'bg-status-assigned' },
  { id: 'in_progress', label: 'In Progress', colorClass: 'text-status-in-progress', dotColor: 'bg-status-in-progress' },
  { id: 'resolved', label: 'Resolved (Unverified)', colorClass: 'text-status-resolved', dotColor: 'bg-status-resolved' },
  { id: 'verified', label: 'Verified Fix', colorClass: 'text-status-verified', dotColor: 'bg-status-verified' },
  { id: 'escalated', label: 'Escalated', colorClass: 'text-status-escalated', dotColor: 'bg-status-escalated' },
];

export const DATE_RANGES = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: 'All Days', days: null },
];

interface MapFilterBarProps {
  selectedCategories: Set<ComplaintCategory>;
  onToggleCategory: (cat: ComplaintCategory) => void;
  onSelectAllCategories: () => void;
  selectedStatuses: Set<ComplaintStatus>;
  onToggleStatus: (status: ComplaintStatus) => void;
  onSelectAllStatuses: () => void;
  dateRangeIndex: number;
  onChangeDateRange: (index: number) => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
  totalAvailableCount: number;
  className?: string;
}

export function MapFilterBar({
  selectedCategories,
  onToggleCategory,
  onSelectAllCategories,
  selectedStatuses,
  onToggleStatus,
  onSelectAllStatuses,
  dateRangeIndex,
  onChangeDateRange,
  onResetFilters,
  totalFilteredCount,
  totalAvailableCount,
  className = '',
}: MapFilterBarProps) {
  const allCategoriesSelected = selectedCategories.size === CATEGORY_OPTIONS.length;
  const allStatusesSelected = selectedStatuses.size === STATUS_OPTIONS.length;
  const isFiltered =
    !allCategoriesSelected ||
    !allStatusesSelected ||
    dateRangeIndex !== DATE_RANGES.length - 1;

  return (
    <div
      data-testid="map-filter-bar"
      className={`rounded-lg bg-surface/95 border border-border p-3.5 shadow-xs space-y-3.5 backdrop-blur-md ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Filter Map Pins
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            (Showing{' '}
            <strong className="text-foreground font-mono">{totalFilteredCount}</strong> of{' '}
            <span className="font-mono">{totalAvailableCount}</span> pins)
          </span>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-hover text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Row 1: Category Toggles */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" /> Categories
          </span>
          <button
            type="button"
            onClick={onSelectAllCategories}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {allCategoriesSelected ? 'Clear' : 'Select All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onToggleCategory(cat.id)}
                data-testid={`filter-category-${cat.id}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-foreground text-background border-foreground shadow-xs'
                    : 'bg-surface text-muted-foreground border-border hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Status Toggles */}
      <div className="space-y-1.5 pt-1 border-t border-border">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="font-semibold text-[11px] uppercase tracking-wider">
            Complaint Status
          </span>
          <button
            type="button"
            onClick={onSelectAllStatuses}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {allStatusesSelected ? 'Clear' : 'Select All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((status) => {
            const isSelected = selectedStatuses.has(status.id);
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => onToggleStatus(status.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-surface-card text-foreground border-foreground/50 shadow-xs ring-1 ring-border'
                    : 'bg-surface text-muted-foreground border-border hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                <span>{status.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Date Range Slider / Buttons */}
      <div className="space-y-1.5 pt-1 border-t border-border">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Reporting Period
        </div>
        <div className="grid grid-cols-4 gap-1 p-1 bg-surface-card rounded-md border border-border">
          {DATE_RANGES.map((range, index) => {
            const isSelected = dateRangeIndex === index;
            return (
              <button
                key={range.label}
                type="button"
                onClick={() => onChangeDateRange(index)}
                className={`py-1 text-center text-xs font-semibold rounded transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
