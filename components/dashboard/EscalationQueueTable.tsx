'use client';

import React, { useState } from 'react';
import { EscalationQueueItem } from '@/app/api/escalations/route';
import { EscalationStatus } from '@/lib/types/database';
import {
  FileText,
  Clock,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Building,
  RefreshCw,
  Search,
} from 'lucide-react';

interface EscalationQueueTableProps {
  items: EscalationQueueItem[];
  selectedId: string | null;
  onSelect: (item: EscalationQueueItem) => void;
  onStatusChange?: (escalationId: string, newStatus: EscalationStatus) => Promise<void>;
  onTriggerCronScan?: () => Promise<void>;
  isScanning?: boolean;
}

const AUTHORITY_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  rti: {
    label: 'RTI Application',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    icon: FileText,
  },
  municipal_commissioner: {
    label: 'Commissioner Appeal',
    badgeClass: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    icon: Building,
  },
  ward_officer: {
    label: 'Ward Officer Notice',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    icon: AlertTriangle,
  },
};

const STATUS_CONFIG: Record<
  EscalationStatus,
  { label: string; badgeClass: string; nextStatus?: EscalationStatus }
> = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    nextStatus: 'submitted',
  },
  submitted: {
    label: 'Submitted',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    nextStatus: 'acknowledged',
  },
  acknowledged: {
    label: 'Acknowledged',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    nextStatus: 'resolved',
  },
  resolved: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
};

export default function EscalationQueueTable({
  items,
  selectedId,
  onSelect,
  onStatusChange,
  onTriggerCronScan,
  isScanning = false,
}: EscalationQueueTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EscalationStatus>('all');

  const filteredItems = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = item.complaint_id.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchWard = (item.ward_name || '').toLowerCase().includes(q);
      return matchId || matchCat || matchWard;
    }
    return true;
  });

  const handleNextStatus = async (item: EscalationQueueItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = STATUS_CONFIG[item.status]?.nextStatus;
    if (!next || !onStatusChange) return;

    setUpdatingId(item.id);
    try {
      await onStatusChange(item.id, next);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Search and Autopilot Scanner Controls */}
      <div className="p-2.5 border-b border-border bg-surface-card flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search escalations..."
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {onTriggerCronScan && (
            <button
              type="button"
              onClick={onTriggerCronScan}
              disabled={isScanning}
              className="py-1 px-2.5 rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-700 dark:text-red-400 border border-red-500/25 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 focus-visible:ring-2 focus-visible:ring-accent"
              title="Scan database for overdue tickets and generate letters"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Autopilot Scan</span>
            </button>
          )}
        </div>

        {/* Status Pill Filters */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
          {(['all', 'draft', 'submitted', 'acknowledged', 'resolved'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-0.5 rounded font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#071D49] text-white dark:bg-[#1d70b8] shadow-xs'
                  : 'bg-surface text-muted-foreground hover:bg-surface-hover border border-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Escalations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <FileText className="w-8 h-8 opacity-40 text-blue-600" />
            <p className="text-xs font-semibold text-foreground">No Escalated Complaints</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Complaints that breach SLA or fail verification will appear here with statutory deadlines.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = item.complaint_id === selectedId;
            const authorityCfg = AUTHORITY_CONFIG[item.authority] || AUTHORITY_CONFIG.rti;
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
            const isUpdating = updatingId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`p-3 transition-colors cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-[#071D49]/5 dark:bg-[#1d70b8]/15 border-l-4 border-l-[#071D49] dark:border-l-[#1d70b8]'
                    : 'hover:bg-surface-hover/60 bg-surface'
                }`}
              >
                {/* Header: Authority Badge & Letter Status */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${authorityCfg.badgeClass}`}
                  >
                    <authorityCfg.icon className="w-3 h-3" />
                    <span>{authorityCfg.label}</span>
                  </span>

                  {/* Letter Status Button / Changer */}
                  <button
                    type="button"
                    onClick={(e) => handleNextStatus(item, e)}
                    disabled={isUpdating || !statusCfg.nextStatus}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border transition-colors cursor-pointer flex items-center gap-1 ${
                      statusCfg.badgeClass
                    } ${statusCfg.nextStatus ? 'hover:opacity-80' : 'cursor-default'}`}
                    title={
                      statusCfg.nextStatus
                        ? `Click to advance status to ${statusCfg.nextStatus}`
                        : `Escalation is ${item.status}`
                    }
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : null}
                    <span>{statusCfg.label}</span>
                  </button>
                </div>

                {/* Complaint Category and Snippet */}
                <div className="flex items-start gap-2.5">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.category}
                      className="w-12 h-12 rounded-md object-cover border border-border shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground capitalize truncate">
                        {item.category} Defect #{item.complaint_id.slice(0, 6)}
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {item.deadline}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.ward_name ? `${item.ward_name} • ` : ''}
                      {item.address_text || 'GPS Location'}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-muted-foreground uppercase">
                        {item.trigger_reason.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deadline Countdown & PDF Link */}
                <div className="flex items-center justify-between pt-1 border-t border-border text-[10px]">
                  {/* Deadline status */}
                  <div className="flex items-center gap-1 font-semibold">
                    {item.is_overdue ? (
                      <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 bg-red-600/10 px-1.5 py-0.5 rounded-md font-bold">
                        <AlertCircle className="w-3 h-3" />
                        <span>Overdue by {Math.abs(item.days_remaining)}d</span>
                      </span>
                    ) : item.days_remaining === 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-600/10 px-1.5 py-0.5 rounded-md font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Statutory Deadline Today</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 bg-blue-600/10 px-1.5 py-0.5 rounded-md">
                        <Clock className="w-3 h-3" />
                        <span>{item.days_remaining}d remaining</span>
                      </span>
                    )}
                  </div>

                  {/* View PDF Button */}
                  {item.letter_url && (
                    <a
                      href={item.letter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface hover:bg-surface-hover border border-border text-foreground font-bold hover:text-blue-600 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      <span>PDF</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
