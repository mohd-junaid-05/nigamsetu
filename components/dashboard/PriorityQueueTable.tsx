'use client';

import React from 'react';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import { Layers, AlertTriangle, Clock, ArrowRight, UserCheck } from 'lucide-react';

interface PriorityQueueTableProps {
  items: PriorityQueueItem[];
  selectedId: string | null;
  onSelect: (item: PriorityQueueItem) => void;
  onOpenAssign: (item: PriorityQueueItem) => void;
}

const SEVERITY_CONFIG: Record<
  number,
  { label: string; badge: string; dot: string }
> = {
  4: {
    label: 'Emergency',
    badge: 'bg-red-600/10 text-red-600 dark:text-red-400 border-red-600/30',
    dot: 'bg-red-600',
  },
  3: {
    label: 'Critical',
    badge: 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20',
    dot: 'bg-red-500',
  },
  2: {
    label: 'Significant',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  1: {
    label: 'Cosmetic',
    badge: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    dot: 'bg-zinc-500',
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  road: '🛣️ Road',
  garbage: '🗑️ Garbage',
  sewage: '🚰 Sewage',
  school: '🏫 School',
  healthcenter: '🏥 Health',
  other: '📦 Other',
};

// Formats age into hours or minutes ago
function formatAge(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
}

export default function PriorityQueueTable({
  items,
  selectedId,
  onSelect,
  onOpenAssign,
}: PriorityQueueTableProps) {
  if (items.length === 0) {
    return (
      <div className="p-8 flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
        <Layers className="w-8 h-8 mb-2 opacity-40 text-blue-500" />
        <p className="font-semibold text-foreground">Priority Queue Empty</p>
        <p className="text-[11px] mt-1 max-w-[200px]">
          All tickets in this ward are resolved or no open complaints exist.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border/60">
      {items.map((item, index) => {
        const isSelected = item.id === selectedId;
        const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG[2];
        const cat = CATEGORY_ICONS[item.category] || item.category;
        const weight = item.weight || 1;
        const isClustered = weight > 1;
        const isBreached = item.sla_breached;

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`p-3.5 transition-all cursor-pointer flex flex-col gap-2 relative ${
              isBreached ? 'border-l-4 border-l-red-600 bg-red-500/[0.02]' : 'border-l-4 border-l-transparent'
            } ${
              isSelected
                ? 'bg-blue-600/10 ring-1 ring-inset ring-blue-600/30'
                : 'hover:bg-muted/10'
            }`}
          >
            {/* Row Header: Rank, Severity Badge, Category, Age */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] font-bold text-muted-foreground w-4">
                  #{index + 1}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 ${sev.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                  {sev.label}
                </span>
                <span className="text-[11px] font-semibold text-foreground">
                  {cat}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium shrink-0">
                <Clock className="w-3 h-3 opacity-60" />
                <span>{formatAge(item.created_at)}</span>
              </div>
            </div>

            {/* Description Snippet */}
            <p className="text-[11px] text-foreground font-medium line-clamp-2 leading-relaxed">
              {item.description || item.address_text || 'Reported municipal grievance'}
            </p>

            {/* Row Footer: Attestations Badge, SLA Status, Assign Button */}
            <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-2">
                {/* Attestation Count */}
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    isClustered
                      ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      : 'bg-muted/20 text-muted-foreground border-border'
                  }`}
                  title={`${weight} citizen reports clustered`}
                >
                  👥 {weight} {weight === 1 ? 'report' : 'reports'}
                </span>

                {/* SLA Status Indicator */}
                <div
                  className="group relative flex items-center"
                  title={item.sla_breached ? 'SLA Target Exceeded' : 'Within Municipal SLA window'}
                >
                  {isBreached ? (
                    <span className="px-2 py-0.5 text-[9px] font-black tracking-wider uppercase rounded bg-red-600 text-white flex items-center gap-1 shadow-sm">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      BREACHED
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active SLA
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-1.5">
                {item.status === 'assigned' ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Assigned
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAssign(item);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1 transition-colors"
                  >
                    <span>Assign</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
