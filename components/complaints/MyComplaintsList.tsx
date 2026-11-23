'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ComplaintItem, ListComplaintsResponse } from '@/app/api/complaints/route';
import {
  RefreshCw,
  MapPin,
  Calendar,
  Construction,
  Trash2,
  Droplets,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  ExternalLink,
  Inbox,
  AlertCircle,
  FileText,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ComplaintCategory, ComplaintStatus } from '@/lib/types/database';
import AgentTraceModal, { VerificationTraceData } from '@/components/dashboard/AgentTraceModal';

function getSeverityBadgeClasses(severity: number | null): string {
  switch (severity) {
    case 1:
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    case 2:
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 3:
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 font-bold';
    case 4:
      return 'bg-red-600/15 text-red-800 dark:text-red-300 border-red-600/40 font-bold';
    default:
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
  }
}

interface MyComplaintsListProps {
  onSwitchToReport: () => void;
}

const CATEGORY_ICONS: Record<ComplaintCategory, React.ComponentType<{ className?: string }>> = {
  road: Construction,
  garbage: Trash2,
  sewage: Droplets,
  school: GraduationCap,
  healthcenter: HeartPulse,
  other: HelpCircle,
};

const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; badgeClass: string }
> = {
  open: {
    label: 'Open',
    badgeClass: 'bg-status-open/10 text-status-open border-status-open/30',
  },
  assigned: {
    label: 'Assigned',
    badgeClass: 'bg-status-assigned/10 text-status-assigned border-status-assigned/30',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/30',
  },
  resolved: {
    label: 'Resolved',
    badgeClass: 'bg-status-resolved/10 text-status-resolved border-status-resolved/30',
  },
  verified: {
    label: 'Verified',
    badgeClass: 'bg-status-verified/10 text-status-verified border-status-verified/30',
  },
  escalated: {
    label: 'Escalated',
    badgeClass: 'bg-status-escalated/10 text-status-escalated border-status-escalated/30',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-muted/10 text-muted-foreground border-border',
  },
};

export function MyComplaintsList({ onSwitchToReport }: MyComplaintsListProps) {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phase 12: Transparency Trace Inspector State
  const [selectedTrace, setSelectedTrace] = useState<VerificationTraceData | null>(null);
  const [allTraces, setAllTraces] = useState<VerificationTraceData[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>('');
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [targetTool, setTargetTool] = useState<string | undefined>(undefined);
  const [loadingTraceId, setLoadingTraceId] = useState<string | null>(null);

  const handleOpenTrace = async (complaintId: string, tool?: string) => {
    setSelectedComplaintId(complaintId);
    setTargetTool(tool);
    setLoadingTraceId(complaintId);
    try {
      const res = await fetch(
        `/api/complaints/${complaintId}/trace${tool ? `?tool=${encodeURIComponent(tool)}` : ''}`
      );
      const data = await res.json();
      if (data.success) {
        setSelectedTrace(data.trace || null);
        setAllTraces(data.allTraces || []);
        setIsTraceModalOpen(true);
      } else {
        alert(data.error || 'Failed to load AI trace');
      }
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Failed to load AI trace: ${e.message}`);
    } finally {
      setLoadingTraceId(null);
    }
  };

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/complaints', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to load complaints (${res.status})`);
      }
      const data: ListComplaintsResponse = await res.json();
      if (data.success) {
        setComplaints(data.complaints);
      } else {
        throw new Error(data.error || 'Failed to fetch complaints');
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Unable to retrieve your complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">My Reported Complaints</h2>
          <p className="text-xs text-muted-foreground">
            Track status and evidence verification across your ward
          </p>
        </div>

        <button
          type="button"
          onClick={fetchComplaints}
          disabled={loading}
          className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-accent"
          title="Refresh list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-border bg-surface animate-pulse flex gap-3"
            >
              <div className="w-20 h-20 rounded-md bg-surface-hover shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-hover rounded w-2/3" />
                <div className="h-3 bg-surface-hover rounded w-1/2" />
                <div className="h-3 bg-surface-hover rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-lg border border-status-open/30 bg-status-open/10 text-status-open text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{error}</span>
            <button
              type="button"
              onClick={fetchComplaints}
              className="mt-1.5 block underline font-medium hover:opacity-80 cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && complaints.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-surface space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-hover text-muted-foreground flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">No Complaints Yet</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs leading-relaxed">
              You haven't submitted any civic complaints. Take a photo of an issue to report it.
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToReport}
            className="py-2.5 px-4 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
          >
            Report an Issue Now
          </button>
        </div>
      )}

      {/* Complaints list */}
      {!loading && !error && complaints.length > 0 && (
        <div className="space-y-3">
          {complaints.map((item) => {
            const Icon = CATEGORY_ICONS[item.category] || HelpCircle;
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
            const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-border bg-surface hover:bg-surface-hover/40 transition-colors flex flex-col sm:flex-row gap-3.5"
              >
                {/* Photo Thumbnail */}
                <div className="relative w-full sm:w-28 h-28 sm:h-auto rounded-md overflow-hidden border border-border bg-surface-card shrink-0">
                  <img
                    src={item.image_url}
                    alt={item.category}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-1 left-1 sm:hidden">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold capitalize ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded bg-surface-hover flex items-center justify-center text-foreground shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-foreground capitalize truncate">
                          {item.category} Report
                        </h4>
                      </div>

                      <span
                        className={`hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold capitalize shrink-0 ${statusConfig.badgeClass}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-foreground/90 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Severity Badge & AI "Why this score?" Info Button (Phase 12) */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold ${getSeverityBadgeClasses(
                          item.severity
                        )}`}
                      >
                        Severity {item.severity}
                      </span>
                      <button
                        type="button"
                        data-testid="why-this-score-btn"
                        onClick={() => handleOpenTrace(item.id, 'scoreSeverity')}
                        disabled={loadingTraceId === item.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        title="Why this severity score? (Inspect AI Trace)"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Why this score?</span>
                      </button>

                      {item.status === 'verified' && (
                        <button
                          type="button"
                          onClick={() => handleOpenTrace(item.id, 'verifyResolution')}
                          disabled={loadingTraceId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-semibold transition-colors cursor-pointer"
                          title="Inspect Resolution Verification Trace"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>
                            Verified{' '}
                            {typeof item.verification_score === 'number'
                              ? `(${Math.round(item.verification_score * 100)}%)`
                              : ''}{' '}
                            Trace
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Escalation Letter Button for escalated complaints */}
                    {(item.escalation_letter_url || item.status === 'escalated') && (
                      <div className="mt-2 flex items-center gap-2">
                        {item.escalation_letter_url ? (
                          <a
                            href={item.escalation_letter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Escalation Letter</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[10px] font-medium">
                            <FileText className="w-3 h-3" />
                            <span>Escalation Generating...</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenTrace(item.id, 'generateEscalation')}
                          className="text-[10px] text-red-600 dark:text-red-400 underline font-medium cursor-pointer"
                        >
                          Audit Letter
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span className="truncate">
                        {item.wards?.name ? item.wards.name : 'Ward Assigned'} &bull;{' '}
                        {item.address_text || 'GPS Position'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                      <span className="truncate max-w-[120px]" title={item.id}>
                        #{item.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* AI Trace Transparency Inspector Modal */}
      <AgentTraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        trace={selectedTrace}
        allTraces={allTraces}
        complaintId={selectedComplaintId}
        initialTool={targetTool}
      />
    </div>
  );
}
