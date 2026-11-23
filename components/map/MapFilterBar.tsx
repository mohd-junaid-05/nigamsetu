'use client';

import React from 'react';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';
import {
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Construction,
  Trash2,
  Droplets,
  GraduationCap,
  HeartPulse,
  HelpCircle,
} from 'lucide-react';

export const CATEGORY_OPTIONS: {
  id: ComplaintCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'road', label: 'Roads & Potholes', icon: Construction },
  { id: 'garbage', label: 'Garbage & Waste', icon: Trash2 },
  { id: 'sewage', label: 'Drainage & Sewage', icon: Droplets },
  { id: 'school', label: 'Schools', icon: GraduationCap },
  { id: 'healthcenter', label: 'Health Clinics', icon: HeartPulse },
  { id: 'other', label: 'Other', icon: HelpCircle },
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
      className={`rounded-lg bg-surface border-2 border-border p-4 shadow-sm space-y-4 ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#071D49] dark:bg-[#1d70b8] text-[#FFB81D] flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Filter Map Pins
          </span>
          <span className="text-xs text-muted-foreground">
            (Showing{' '}
            <strong className="text-foreground font-mono">{totalFilteredCount}</strong> of{' '}
            <span className="font-mono">{totalAvailableCount}</span> pins)
          </span>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-surface-hover text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Row 1: Category Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-foreground">
            <Layers className="w-3.5 h-3.5" /> Categories
          </span>
          <button
            type="button"
            onClick={onSelectAllCategories}
            className="text-[11px] text-[#1d70b8] dark:text-blue-400 hover:underline cursor-pointer font-semibold"
          >
            {allCategoriesSelected ? 'Clear' : 'Select All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategories.has(cat.id);
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onToggleCategory(cat.id)}
                data-testid={`filter-category-${cat.id}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all border cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-[#071D49] dark:bg-[#1d70b8] text-white border-[#071D49] dark:border-[#1d70b8] shadow-sm'
                    : 'bg-surface text-muted-foreground border-border hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Status Toggles */}
      <div className="space-y-2 pt-1 border-t border-border">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="font-bold text-[11px] uppercase tracking-wider text-foreground">
            Complaint Status
          </span>
          <button
            type="button"
            onClick={onSelectAllStatuses}
            className="text-[11px] text-[#1d70b8] dark:text-blue-400 hover:underline cursor-pointer font-semibold"
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all border cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-surface-card text-foreground border-foreground/40 shadow-sm ring-1 ring-border'
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

      {/* Row 3: Date Range */}
      <div className="space-y-2 pt-1 border-t border-border">
        <div className="text-[11px] font-bold text-foreground uppercase tracking-wider">
          Reporting Period
        </div>
        <div className="grid grid-cols-4 gap-1 p-1 bg-surface-hover rounded border border-border">
          {DATE_RANGES.map((range, index) => {
            const isSelected = dateRangeIndex === index;
            return (
              <button
                key={range.label}
                type="button"
                onClick={() => onChangeDateRange(index)}
                className={`py-1.5 text-center text-xs font-bold rounded transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'bg-[#071D49] dark:bg-[#1d70b8] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface'
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
