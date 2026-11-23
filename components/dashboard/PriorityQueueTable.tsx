'use client';

import React, { useState } from 'react';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import { Layers, AlertTriangle, Clock, ArrowRight, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react';

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
      {/* Queue Filter Bar */}
      <div className="p-2 border-b border-border bg-surface/50 flex items-center justify-between gap-1 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-colors ${
            filterTab === 'all'
              ? 'bg-surface-card text-foreground font-bold shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-colors ${
            filterTab === 'active'
              ? 'bg-surface-card text-foreground font-bold shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('review')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-colors ${
            filterTab === 'review'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-xs border border-amber-500/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Verify ({reviewCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('verified')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-colors ${
            filterTab === 'verified'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs border border-emerald-500/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Done ({verifiedCount})
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-8 flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
          <Layers className="w-8 h-8 mb-2 opacity-40 text-blue-500" />
          <p className="font-semibold text-foreground">No Tickets In Filter</p>
          <p className="text-[11px] mt-1 max-w-[200px]">
            {filterTab === 'review'
              ? 'No complaints currently awaiting resolution verification.'
              : 'No complaints match the selected status tab.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {filteredItems.map((item, index) => {
            const isSelected = item.id === selectedId;
            const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG[2];
            const cat = CATEGORY_ICONS[item.category] || item.category;
            const weight = item.weight || 1;
            const isClustered = weight > 1;
            const isBreached = item.sla_breached;
            const isNeedsVerification = item.status === 'resolved' || item.verification_status === 'pending';
            const isVerified = item.status === 'verified';

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`p-3.5 transition-all cursor-pointer flex flex-col gap-2 relative ${
                  isBreached
                    ? 'border-l-4 border-l-red-600 bg-red-500/[0.02]'
                    : isNeedsVerification
                    ? 'border-l-4 border-l-amber-500 bg-amber-500/[0.02]'
                    : isVerified
                    ? 'border-l-4 border-l-emerald-500 bg-emerald-500/[0.02]'
                    : 'border-l-4 border-l-transparent'
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

                {/* Status Badge Tag for Verification State */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isNeedsVerification && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Resolution Awaiting Verification</span>
                    </span>
                  )}
                  {isVerified && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Verified Fix ({item.verification_score ? (item.verification_score * 100).toFixed(0) + '%' : 'Passed'})</span>
                    </span>
                  )}
                  {item.status === 'in_progress' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      In Progress
                    </span>
                  )}
                  {item.status === 'assigned' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                      Assigned Depot
                    </span>
                  )}
                </div>

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

                    {/* SLA breach indicator */}
                    {isBreached && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-600/15 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        <span>SLA Breached</span>
                      </span>
                    )}
                  </div>

                  {/* Assign action trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAssign(item);
                    }}
                    className="p-1 px-2 rounded-lg hover:bg-surface border border-border text-[11px] font-semibold text-foreground flex items-center gap-1 transition-colors"
                  >
                    <UserCheck className="w-3 h-3 text-blue-600" />
                    <span>{item.status === 'assigned' ? 'Reassign' : 'Route'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
