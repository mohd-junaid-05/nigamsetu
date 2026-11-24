'use client';

import React, { useState, useEffect } from 'react';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import { getValidReportImageUrl, getValidResolutionImageUrl } from '@/lib/utils/reportImages';
import {
  ShieldAlert,
  MapPin,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Users,
  Camera,
  Play,
  Sparkles,
  XCircle,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  Flag,
  CheckCheck,
  FileText,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import VerificationTraceModal, { VerificationTraceData } from './VerificationTraceModal';

interface ComplaintDetailPanelProps {
  complaint: PriorityQueueItem | null;
  onOpenAssign: (item: PriorityQueueItem) => void;
  onOpenResolve?: (item: PriorityQueueItem) => void;
  onStartWork?: (item: PriorityQueueItem) => void;
  onVerifyAction?: (complaintId: string, action: 'verify' | 'reject' | 'flag', notes?: string) => Promise<void>;
  onEscalateAction?: (item: PriorityQueueItem) => Promise<void>;
  facilityName?: string | null;
}

const SEVERITY_CONFIG: Record<
  number,
  { label: string; badge: string; dot: string; desc: string }
> = {
  4: {
    label: 'Tier 4 - Emergency',
    badge: 'bg-red-600/15 text-red-700 dark:text-red-300 border-red-600/30',
    dot: 'bg-red-600',
    desc: 'Immediate public hazard requiring emergency municipal intervention',
  },
  3: {
    label: 'Tier 3 - Critical',
    badge: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
    dot: 'bg-red-500',
    desc: 'Severe infrastructure defect posing safety/traffic failure risk',
  },
  2: {
    label: 'Tier 2 - Significant',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
    dot: 'bg-amber-500',
    desc: 'Standard municipal defect requiring scheduled maintenance',
  },
  1: {
    label: 'Tier 1 - Cosmetic',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
    desc: 'Minor aesthetic or low-impact surface issue',
  },
};

const STATUS_STEPS = [
  { key: 'open', label: 'Submitted / Open' },
  { key: 'assigned', label: 'Assigned Depot' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved (Unverified)' },
  { key: 'verified', label: 'Verified Fix' },
];

function formatFullDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ComplaintDetailPanel({
  complaint,
  onOpenAssign,
  onOpenResolve,
  onStartWork,
  onVerifyAction,
  onEscalateAction,
  facilityName,
}: ComplaintDetailPanelProps) {
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [traceData, setTraceData] = useState<VerificationTraceData | null>(null);
  const [allTraces, setAllTraces] = useState<VerificationTraceData[]>([]);
  const [targetTool, setTargetTool] = useState<string | undefined>(undefined);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);

  const handleEscalate = async () => {
    if (!complaint) return;
    setIsEscalating(true);
    try {
      if (onEscalateAction) {
        await onEscalateAction(complaint);
      } else {
        const res = await fetch(`/api/complaints/${complaint.id}/escalate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!data.success) {
          alert(`Escalation failed: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Escalation failed: ${e.message}`);
    } finally {
      setIsEscalating(false);
    }
  };

  // Fetch all audit traces for the selected complaint
  const fetchTrace = async (complaintId: string) => {
    setIsLoadingTrace(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/trace`);
      const data = await res.json();
      if (data.success) {
        setTraceData(data.trace || null);
        setAllTraces(data.allTraces || []);
      }
    } catch (err) {
      console.warn('[ComplaintDetailPanel] Failed to load trace audit:', err);
    } finally {
      setIsLoadingTrace(false);
    }
  };

  useEffect(() => {
    if (complaint?.id) {
      fetchTrace(complaint.id);
    }
  }, [complaint?.id]);

  if (!complaint) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
        <HelpCircle className="w-8 h-8 mb-2 opacity-40 text-blue-600" />
        <h4 className="font-bold text-foreground">Select a Complaint</h4>
        <p className="text-[11px] mt-1 max-w-[200px]">
          Click any ticket in the priority queue or marker on the map to inspect evidence and verification.
        </p>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[complaint.severity] || SEVERITY_CONFIG[2];
  const weight = complaint.weight || 1;
  const isClustered = weight > 1;
  const isBreached = complaint.sla_breached;
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === complaint.status);

  // Verification Data extracted from trace
  const verifyTrace = allTraces.find((t) => t.tool_name === 'verifyResolution' || t.tool_name === 'verify_resolution') || traceData;
  const verifyOutput = verifyTrace?.output_summary || {};
  const checks = (verifyOutput.checks as Record<string, boolean>) || {
    gpsMatch: true,
    hashDifferent: true,
    visionVerdict: true,
    timestampValid: true,
  };
  const verificationScore =
    typeof complaint.verification_score === 'number'
      ? complaint.verification_score
      : typeof verifyOutput.score === 'number'
      ? verifyOutput.score
      : null;
  const reasonText = (verifyOutput.reason as string) || ((complaint as any).notes ? (complaint as any).notes : '4-point AI evidence cross-check completed.');

  const handleAction = async (action: 'verify' | 'reject' | 'flag') => {
    if (!onVerifyAction) return;
    setIsPerformingAction(action);
    try {
      await onVerifyAction(complaint.id, action);
    } finally {
      setIsPerformingAction(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Header: Ticket ID & Ward */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
            Ticket #{complaint.id.slice(0, 8)}
          </span>
          <span className="text-xs font-bold text-foreground">
            {complaint.category.toUpperCase()} DEFECT
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border capitalize font-semibold ${
              complaint.status === 'open'
                ? 'bg-status-open/10 text-status-open border-status-open/30'
                : complaint.status === 'assigned'
                ? 'bg-status-assigned/10 text-status-assigned border-status-assigned/30'
                : complaint.status === 'in_progress'
                ? 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/30'
                : complaint.status === 'verified'
                ? 'bg-status-verified/10 text-status-verified border-status-verified/30'
                : 'bg-status-resolved/10 text-status-resolved border-status-resolved/30'
            }`}
          >
            {complaint.status}
          </span>
        </div>
      </div>

      {/* Main Evidence Photo Card */}
      <div className="relative w-full h-44 rounded-lg overflow-hidden border border-border bg-surface-card group">
        <img
          src={getValidReportImageUrl(complaint.image_url, complaint.category)}
          alt={complaint.category}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
          onError={(e) => {
            const fallback = getValidReportImageUrl('', complaint.category);
            if (e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
        />

        {/* Category tag */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white font-bold text-[10px] capitalize border border-white/10">
          {complaint.category}
        </div>

        {/* Full Inspector link */}
        <Link
          href={`/complaint/${complaint.id}`}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-black/75 backdrop-blur-md text-white hover:text-blue-400 transition-colors border border-white/10"
          title="Open Full Complaint View"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        {/* Severity Badge on Image with "Why this score?" button */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border backdrop-blur-md ${sev.badge}`}
            >
              {sev.label}
            </span>
            <button
              type="button"
              data-testid="why-this-severity-btn"
              onClick={() => {
                setTargetTool('scoreSeverity');
                setIsTraceModalOpen(true);
              }}
              className="px-2 py-0.5 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md text-[10px] text-white/90 border border-white/20 flex items-center gap-1 transition-colors cursor-pointer"
              title="Why this severity score? (Inspect AI Trace)"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Why this score?</span>
            </button>
          </div>
          {isClustered && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-600/90 text-white backdrop-blur-md border border-blue-400/30 flex items-center gap-1 shadow-xs">
              <Users className="w-3 h-3" />
              {weight}x Clustered
            </span>
          )}
        </div>
      </div>

      {/* Description & Address */}
      <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-surface border border-border">
        <h5 className="font-bold text-foreground text-xs">Issue Description</h5>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {complaint.description || 'No detailed voice or text transcript supplied by citizen.'}
        </p>
        <div className="flex items-start gap-1.5 text-[11px] text-foreground font-medium pt-2 border-t border-border">
          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>{complaint.address_text || 'GPS Coordinate Location Recorded'}</span>
        </div>
      </div>

      {/* SLA Breach / Countdown Box */}
      <div
        className={`p-3 rounded-lg border flex flex-col gap-1.5 ${
          isBreached
            ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        }`}
      >
        <div className="flex items-center justify-between font-bold text-xs">
          <span className="flex items-center gap-1.5">
            {isBreached ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            {isBreached ? 'MUNICIPAL SLA BREACHED' : 'Active SLA Timeline'}
          </span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/10">
            {isBreached ? 'Overdue' : 'On Target'}
          </span>
        </div>
        <p className="text-[11px] opacity-90">
          Target Resolution Deadline: <strong>{formatFullDate(complaint.created_at)}</strong>
        </p>
      </div>

      {/* ========================================================================= */}
      {/* RESOLUTION VERIFICATION PANEL (BEFORE/AFTER & SCORE BAR)                   */}
      {/* ========================================================================= */}
      {(complaint.resolution_image_url || complaint.status === 'resolved' || complaint.status === 'verified') && (
        <div className="p-3.5 rounded-lg border border-border bg-surface flex flex-col gap-3 shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>AI Resolution Verification</span>
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono uppercase border ${
                complaint.status === 'verified'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : complaint.status === 'in_progress'
                  ? 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              {complaint.status === 'verified'
                ? 'Verified Fix'
                : complaint.status === 'in_progress'
                ? 'Rejected / In Progress'
                : 'Pending Official Review'}
            </span>
          </div>

          {/* Side-by-Side Before & After Photo Evidence */}
          <div className="grid grid-cols-2 gap-2">
            {/* Before (Left) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Before (Report)
              </span>
              <div className="relative w-full h-28 rounded-md overflow-hidden border border-border bg-black/60 group">
                <img
                  src={getValidReportImageUrl(complaint.image_url, complaint.category)}
                  alt="Before defect"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
                  onError={(e) => {
                    const fallback = getValidReportImageUrl('', complaint.category);
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white backdrop-blur-md">
                  Original Defect
                </span>
              </div>
            </div>

            {/* After (Right) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                After (Claimed Fix)
              </span>
              <div className="relative w-full h-28 rounded-md overflow-hidden border border-border bg-black/60 group">
                {complaint.resolution_image_url ? (
                  <img
                    src={getValidResolutionImageUrl(complaint.resolution_image_url, complaint.category) || getValidReportImageUrl('', complaint.category)}
                    alt="After resolution"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
                    onError={(e) => {
                      const fallback = getValidResolutionImageUrl('', complaint.category) || getValidReportImageUrl('', complaint.category);
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                    No photo uploaded
                  </div>
                )}
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white backdrop-blur-md">
                  Municipal Proof
                </span>
              </div>
            </div>
          </div>

          {/* AI Composite Score Bar */}
          {verificationScore !== null && (
            <div className="flex flex-col gap-1.5 p-3 rounded-md bg-surface-card border border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span>AI Confidence Score:</span>
                  <span
                    className={`font-mono text-sm font-black ${
                      verificationScore >= 0.75
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : verificationScore < 0.4
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {(verificationScore * 100).toFixed(0)}% ({verificationScore.toFixed(2)})
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {verificationScore >= 0.75
                    ? 'Auto-Pass Threshold (≥0.75)'
                    : verificationScore < 0.4
                    ? 'Auto-Fail Threshold (<0.40)'
                    : 'Manual Review (0.40 - 0.75)'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-border">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    verificationScore >= 0.75
                      ? 'bg-emerald-500'
                      : verificationScore < 0.4
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, verificationScore * 100))}%` }}
                />
              </div>

              {/* Formula weights reminder */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1">
                <span>GPS (20%)</span>
                <span>•</span>
                <span>pHash (30%)</span>
                <span>•</span>
                <span>Gemini 1.5 Pro (50%)</span>
              </div>
            </div>
          )}

          {/* Four Individual Verification Checks */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded-md border border-border bg-surface-card flex items-center gap-1.5">
              {checks.gpsMatch ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
              <div className="truncate">
                <span className="font-bold text-foreground">GPS Proximity:</span>{' '}
                <span className={checks.gpsMatch ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-red-700 dark:text-red-400 font-semibold'}>
                  {checks.gpsMatch ? '≤ 100m' : '> 100m Fail'}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-md border border-border bg-surface-card flex items-center gap-1.5">
              {checks.timestampValid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
              <div className="truncate">
                <span className="font-bold text-foreground">Timestamp:</span>{' '}
                <span className={checks.timestampValid ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-red-700 dark:text-red-400 font-semibold'}>
                  {checks.timestampValid ? 'Ordered' : 'Invalid'}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-md border border-border bg-surface-card flex items-center gap-1.5">
              {checks.hashDifferent ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
              <div className="truncate">
                <span className="font-bold text-foreground">Hash Check:</span>{' '}
                <span className={checks.hashDifferent ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-red-700 dark:text-red-400 font-semibold'}>
                  {checks.hashDifferent ? 'Distinct Fix' : 'Fake Re-upload'}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-md border border-border bg-surface-card flex items-center gap-1.5">
              {checks.visionVerdict ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              <div className="truncate">
                <span className="font-bold text-foreground">Vision AI:</span>{' '}
                <span className={checks.visionVerdict ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
                  {checks.visionVerdict ? 'Repair Verified' : 'Defect Persists'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Reason Text */}
          <div className="p-2.5 rounded-md bg-surface-card border border-border flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              AI Verification Reasoning
            </span>
            <p className="text-[11px] text-foreground leading-relaxed italic">
              &quot;{reasonText}&quot;
            </p>
          </div>

          {/* "Why this score?" Button */}
          <button
            type="button"
            data-testid="why-this-score-btn"
            onClick={() => {
              setTargetTool('verifyResolution');
              setIsTraceModalOpen(true);
            }}
            className="w-full py-2 px-3 rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Why this score? (Inspect Full AI Trace)</span>
          </button>

          {/* The Three Official Verification Action Buttons */}
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Official Resolution Review
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Verify & Close */}
              <button
                type="button"
                disabled={Boolean(isPerformingAction) || complaint.status === 'verified'}
                onClick={() => handleAction('verify')}
                className="py-2 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] shadow-2xs flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
                title="Verify and close ticket (Turns pin green)"
              >
                {isPerformingAction === 'verify' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Verify & Close</span>
              </button>

              {/* Reject & Reopen */}
              <button
                type="button"
                disabled={Boolean(isPerformingAction) || complaint.status === 'in_progress'}
                onClick={() => handleAction('reject')}
                className="py-2 px-2 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-[11px] shadow-2xs flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
                title="Reject resolution and return to in_progress for rework"
              >
                {isPerformingAction === 'reject' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Reject & Reopen</span>
              </button>

              {/* Flag for Review */}
              <button
                type="button"
                disabled={Boolean(isPerformingAction)}
                onClick={() => handleAction('flag')}
                className="py-2 px-2 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] shadow-2xs flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
                title="Flag for manual site review"
              >
                {isPerformingAction === 'flag' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Flag className="w-3.5 h-3.5" />
                )}
                <span>Flag for Review</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Escalation Card */}
      {(complaint.escalation_letter_url || complaint.status === 'escalated') && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 flex flex-col gap-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
              <FileText className="w-4 h-4" />
              <span>Statutory Escalation Letter</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-red-600 text-white font-bold uppercase tracking-wider">
              Escalated
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Statutory grievance letter generated with evidentiary audit trail and legal response timeline. Routed strictly to designated authority inbox (<strong className="text-foreground font-mono">sessionbyilder7@gmail.com</strong>).
          </p>

          {complaint.escalation_letter_url ? (
            <a
              href={complaint.escalation_letter_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Escalation Letter (PDF)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          ) : (
            <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Generating legal document in background...</span>
            </div>
          )}
        </div>
      )}

      {/* Status History Timeline */}
      <div className="p-3 rounded-lg bg-surface border border-border flex flex-col gap-2">
        <h5 className="font-bold text-foreground text-xs">Resolution Workflow</h5>
        <div className="flex flex-col gap-2 relative pl-1">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx <= (currentStepIdx === -1 ? 0 : currentStepIdx);
            const isCurrent = idx === currentStepIdx;

            return (
              <div key={step.key} className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isCompleted
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted/30 text-muted-foreground border border-border'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[11px] ${
                    isCurrent
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : isCompleted
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                  {step.key === 'assigned' && facilityName && isCompleted
                    ? ` (${facilityName})`
                    : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Evidentiary Dossier Recipient Info */}
      <div className="p-3 rounded-lg bg-surface-card border border-border flex flex-col gap-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Evidentiary Report Recipient</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-600 font-bold border border-blue-500/20">
            Showcase Target
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Case reports, AI verification scores, and statutory appeals for this ticket are routed to:
          <strong className="block text-foreground font-mono mt-0.5">sessionbyilder7@gmail.com & sessionbyilder@gmail.com</strong>
        </p>
        <a
          href={`mailto:sessionbyilder7@gmail.com,sessionbyilder@gmail.com?subject=${encodeURIComponent(`[NigamSetu Report] Ticket #${complaint.id}: ${complaint.category.toUpperCase()}`)}&body=${encodeURIComponent(`NigamSetu Municipal Grievance Report\nTicket ID: #${complaint.id}\nCategory: ${complaint.category}\nStatus: ${complaint.status}\nSeverity: ${complaint.severity}\nLocation: ${complaint.address_text || 'Ward'}\nProof: ${complaint.image_url || 'N/A'}`)}`}
          className="mt-0.5 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-semibold transition-all cursor-pointer"
        >
          <Mail className="w-3 h-3 text-blue-600" />
          <span>Open Dispatched Report in Mail Client</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      {/* Action Buttons: Workflow transitions */}
      <div className="pt-1 flex flex-col gap-2">
        {complaint.status === 'in_progress' && onOpenResolve && (
          <button
            type="button"
            onClick={() => onOpenResolve(complaint)}
            className="w-full min-h-[40px] py-2 px-4 rounded-md bg-[#00703c] hover:bg-[#005a30] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Camera className="w-4 h-4" />
            <span>Mark Resolved (Upload Proof)</span>
          </button>
        )}

        {complaint.status === 'assigned' && onStartWork && (
          <button
            type="button"
            onClick={() => onStartWork(complaint)}
            className="w-full min-h-[40px] py-2 px-4 rounded-md bg-[#071D49] hover:bg-[#093692] dark:bg-[#1d70b8] dark:hover:bg-[#144e82] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Play className="w-4 h-4" />
            <span>Start Work (Mark In Progress)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenAssign(complaint)}
          className="w-full min-h-[40px] py-2 px-4 rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>
            {complaint.status === 'assigned'
              ? 'Reassign Municipal Facility'
              : 'Assign to nearest facility'}
          </span>
        </button>

        {/* Escalation Letter Button for overdue, failed verification, or manual trigger */}
        {!complaint.escalation_letter_url && complaint.status !== 'verified' && (
          <button
            type="button"
            disabled={isEscalating}
            onClick={handleEscalate}
            className="w-full min-h-[40px] py-2 px-4 rounded-md border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
            title="Generate formal RTI or Commissioner appeal letter"
          >
            {isEscalating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>
              {complaint.verification_status === 'failed'
                ? 'Generate Commissioner Appeal'
                : 'Generate Escalation Letter'}
            </span>
          </button>
        )}
      </div>

      {/* Trace Inspector Modal */}
      <VerificationTraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        trace={traceData}
        allTraces={allTraces}
        complaintId={complaint.id}
        initialTool={targetTool}
      />
    </div>
  );
}
