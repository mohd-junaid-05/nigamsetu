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
          <span className="text-[11px] font-mono text-accent font-medium">
            1 selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cat.id)}
              className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent text-foreground'
                  : 'border-border bg-surface-card hover:border-surface-hover hover:bg-surface text-foreground/80'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 text-accent">
                  <CheckCircle2 className="w-4 h-4 fill-accent text-white dark:text-black" />
                </div>
              )}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  isSelected
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold leading-tight line-clamp-1">
                {cat.label}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                {cat.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
