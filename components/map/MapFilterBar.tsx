'use client';

import React from 'react';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';
import {
  RotateCcw,
  SlidersHorizontal,
  Calendar,
  Layers,
  Activity,
} from 'lucide-react';

export const CATEGORY_OPTIONS: { id: ComplaintCategory; label: string; icon: string }[] = [
  { id: 'road', label: 'Roads & Potholes', icon: '🛣️' },
  { id: 'garbage', label: 'Garbage & Waste', icon: '🗑️' },
  { id: 'sewage', label: 'Drainage & Sewage', icon: '🚰' },
  { id: 'school', label: 'Schools', icon: '🏫' },
  { id: 'healthcenter', label: 'Health Centers', icon: '🏥' },
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
      className={`rounded-2xl bg-surface-card border border-border p-4 shadow-sm space-y-4 backdrop-blur-md ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Filters & Layers
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors border border-border cursor-pointer"
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-foreground text-background border-foreground shadow-sm'
                    : 'bg-surface/80 text-muted-foreground border-border hover:bg-surface hover:text-foreground'
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
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" /> Complaint Status
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
                data-testid={`filter-status-${status.id}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-surface-card text-foreground border-foreground shadow-sm font-semibold'
                    : 'bg-surface/80 text-muted-foreground border-border hover:bg-surface hover:text-foreground opacity-60'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${status.dotColor} shrink-0`} />
                <span>{status.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Date Range Slider */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" /> Date Range
          </span>
          <span className="text-xs font-bold text-foreground font-mono">
            {DATE_RANGES[dateRangeIndex].label}
          </span>
        </div>

        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={DATE_RANGES.length - 1}
            step={1}
            value={dateRangeIndex}
            onChange={(e) => onChangeDateRange(parseInt(e.target.value, 10))}
            data-testid="date-range-slider"
            className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
            {DATE_RANGES.map((range, idx) => (
              <span
                key={range.label}
                onClick={() => onChangeDateRange(idx)}
                className={`cursor-pointer hover:text-foreground ${
                  dateRangeIndex === idx ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                }`}
              >
                {range.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
