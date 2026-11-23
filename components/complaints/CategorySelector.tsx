'use client';

import React from 'react';
import { ComplaintCategory } from '@/lib/types/database';
import {
  Construction,
  Trash2,
  Droplets,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface CategoryOption {
  id: ComplaintCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'road',
    label: 'Roads & Potholes',
    description: 'Cratered roads, broken tarmac, cave-ins',
    icon: Construction,
  },
  {
    id: 'garbage',
    label: 'Garbage & Waste',
    description: 'Overflowing bins, illegal dumps, animal carcass',
    icon: Trash2,
  },
  {
    id: 'sewage',
    label: 'Sewage & Drainage',
    description: 'Blocked stormwater drains, open manholes',
    icon: Droplets,
  },
  {
    id: 'school',
    label: 'School Infrastructure',
    description: 'Broken desks, collapsed walls, unusable toilets',
    icon: GraduationCap,
  },
  {
    id: 'healthcenter',
    label: 'Health Clinic',
    description: 'Damaged clinic facility, water failure',
    icon: HeartPulse,
  },
  {
    id: 'other',
    label: 'Other Civic Issue',
    description: 'Streetlights, fallen trees, park infrastructure',
    icon: HelpCircle,
  },
];

interface CategorySelectorProps {
  selectedCategory: ComplaintCategory | null;
  onSelect: (category: ComplaintCategory) => void;
  disabled?: boolean;
}

export function CategorySelector({
  selectedCategory,
  onSelect,
  disabled = false,
}: CategorySelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>Complaint Category</span>
          <span className="text-status-open font-bold">*</span>
        </label>
        {selectedCategory && (
          <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
            1 selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cat.id)}
              className={`relative flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer min-h-[96px] focus-visible:ring-2 focus-visible:ring-accent ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs text-foreground ring-1 ring-blue-600'
                  : 'border-border bg-surface hover:bg-surface-hover text-foreground/90'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="w-4 h-4 fill-blue-600 text-white dark:text-slate-950" />
                </div>
              )}
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center mb-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-surface-hover text-muted-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold leading-tight line-clamp-1">
                {cat.label}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {cat.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
