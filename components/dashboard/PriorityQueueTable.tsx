'use client';

import React, { useState } from 'react';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import {
  Layers,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserCheck,
  Sparkles,
  CheckCircle2,
  Construction,
  Trash2,
  Droplets,
  GraduationCap,
  HeartPulse,
  HelpCircle,
} from 'lucide-react';

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
    badge: 'bg-red-600/10 text-red-700 dark:text-red-400 border-red-600/30',
    dot: 'bg-red-600',
  },
  3: {
    label: 'Critical',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25',
    dot: 'bg-red-500',
  },
  2: {
    label: 'Significant',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    dot: 'bg-amber-500',
  },
  1: {
    label: 'Cosmetic',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  road: { label: 'Road', icon: Construction },
  garbage: { label: 'Garbage', icon: Trash2 },
  sewage: { label: 'Sewage', icon: Droplets },
  school: { label: 'School', icon: GraduationCap },
  healthcenter: { label: 'Health', icon: HeartPulse },
  other: { label: 'Other', icon: HelpCircle },
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
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'review' | 'verified'>('all');

  const activeCount = items.filter((i) => ['open', 'assigned', 'in_progress'].includes(i.status)).length;
  const reviewCount = items.filter((i) => i.status === 'resolved' || i.verification_status === 'pending').length;
  const verifiedCount = items.filter((i) => i.status === 'verified').length;

  const filteredItems = items.filter((item) => {
    if (filterTab === 'active') return ['open', 'assigned', 'in_progress'].includes(item.status);
    if (filterTab === 'review') return item.status === 'resolved' || item.verification_status === 'pending';
    if (filterTab === 'verified') return item.status === 'verified';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Queue Filter Bar (Government data-table style) */}
      <div className="p-2 border-b border-border bg-surface flex items-center justify-between gap-1 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-1.5 px-2 rounded text-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
            filterTab === 'all'
              ? 'bg-[#071D49] text-white dark:bg-[#1d70b8] font-bold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-1.5 px-2 rounded text-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
            filterTab === 'active'
              ? 'bg-[#071D49] text-white dark:bg-[#1d70b8] font-bold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('review')}
          className={`flex-1 py-1.5 px-2 rounded text-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
            filterTab === 'review'
              ? 'bg-amber-600 text-white font-bold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          Verify ({reviewCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('verified')}
          className={`flex-1 py-1.5 px-2 rounded text-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
            filterTab === 'verified'
              ? 'bg-[#00703c] text-white font-bold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          Done ({verifiedCount})
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-8 flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
          <Layers className="w-8 h-8 mb-2 opacity-40 text-blue-600" />
          <p className="font-semibold text-foreground">No Tickets In Filter</p>
          <p className="text-[11px] mt-1">All tickets in this view have been processed or moved.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filteredItems.map((item) => {
            const isSelected = item.id === selectedId;
            const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG[2];
            const catCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
            const CatIcon = catCfg.icon;
            const age = formatAge(item.created_at);

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`p-3 text-left transition-colors cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-[#071D49]/5 dark:bg-[#1d70b8]/15 border-l-4 border-l-[#071D49] dark:border-l-[#1d70b8]'
                    : 'hover:bg-surface-hover/60 bg-surface'
                }`}
              >
                {/* Top Row: Category, Cluster Weight, Age, Status */}
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <CatIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{catCfg.label}</span>
                    </span>

                    {/* Duplicate Cluster Weight Pill */}
                    {item.weight > 1 && (
                      <span
                        className="px-1.5 py-0.2 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-400 font-bold font-mono text-[10px] border border-blue-600/20 shrink-0"
                        title={`DBSCAN Spatial Cluster: ${item.weight} citizens reported this failure`}
                      >
                        {item.weight}x reports
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground font-mono text-[10px]">
                    <Clock className="w-3 h-3" />
                    <span>{age}</span>
                  </div>
                </div>

                {/* Second Row: Description or Address preview */}
                <p className="text-xs text-foreground/80 line-clamp-1 leading-relaxed">
                  {item.description || item.address_text || 'No description provided'}
                </p>

                {/* Bottom Row: Severity Badge, Status Chip, Assign Action */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${sev.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                      <span>{sev.label}</span>
                    </span>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border capitalize font-semibold ${
                        item.status === 'open'
                          ? 'bg-status-open/10 text-status-open border-status-open/25'
                          : item.status === 'assigned'
                          ? 'bg-status-assigned/10 text-status-assigned border-status-assigned/25'
                          : item.status === 'in_progress'
                          ? 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/25'
                          : item.status === 'verified'
                          ? 'bg-status-verified/10 text-status-verified border-status-verified/25'
                          : 'bg-status-resolved/10 text-status-resolved border-status-resolved/25'
                      }`}
                    >
                      {item.status}
                    </span>

                    {/* SLA Breach Indicator */}
                    {item.sla_breached && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600/15 text-red-700 dark:text-red-400 border border-red-600/30 font-bold text-[10px]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>SLA Breached</span>
                      </span>
                    )}
                  </div>

                  {/* Assign Action Button if Open */}
                  {item.status === 'open' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAssign(item);
                      }}
                      className="px-2 py-1 rounded bg-[#071D49] hover:bg-[#093692] text-white dark:bg-[#1d70b8] dark:hover:bg-[#144e82] text-[10px] font-bold transition-colors shadow-xs flex items-center gap-1 shrink-0 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Assign</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
