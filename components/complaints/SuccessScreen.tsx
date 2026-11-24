'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Copy,
  Check,
  MapPin,
  Clock,
  ArrowRight,
  RotateCcw,
  ExternalLink,
  Sparkles,
  Loader2,
  Bot,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { SeverityPostResponse, SeverityGetResponse } from '@/app/api/agent/severity/route';
import AgentTraceModal, { VerificationTraceData } from '@/components/dashboard/AgentTraceModal';

interface SuccessScreenProps {
  complaintId: string;
  wardName: string | null;
  imageUrl?: string;
  category?: string;
  initialSeverity?: number;
  onReset: () => void;
  onViewMyComplaints: () => void;
}

function getSeverityLabel(severity: number | null): string {
  switch (severity) {
    case 1:
      return 'Tier 1 • Cosmetic';
    case 2:
      return 'Tier 2 • Significant';
    case 3:
      return 'Tier 3 • Critical';
    case 4:
      return 'Tier 4 • Emergency';
    default:
      return 'Tier 2 • Significant';
  }
}

function getSeverityLabelName(severity: number | null): string {
  switch (severity) {
    case 1:
      return 'Cosmetic';
    case 2:
      return 'Significant';
    case 3:
      return 'Critical';
    case 4:
      return 'Emergency';
    default:
      return 'Significant';
  }
}

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

export function SuccessScreen({
  complaintId,
  wardName,
  imageUrl,
  category,
  initialSeverity,
  onReset,
  onViewMyComplaints,
}: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);
  const [severity, setSeverity] = useState<number | null>(initialSeverity ?? null);
  const [reason, setReason] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [fallback, setFallback] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Phase 12: Transparency Trace Inspector State
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [traceData, setTraceData] = useState<VerificationTraceData | null>(null);
  const [allTraces, setAllTraces] = useState<VerificationTraceData[]>([]);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);

  const handleOpenTrace = async () => {
    setIsLoadingTrace(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/trace?tool=scoreSeverity`);
      const data = await res.json();
      if (data.success) {
        setTraceData(data.trace || null);
        setAllTraces(data.allTraces || []);
        setIsTraceModalOpen(true);
      } else {
        alert(data.error || 'Failed to load severity trace');
      }
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Failed to load trace: ${e.message}`);
    } finally {
      setIsLoadingTrace(false);
    }
  };

  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    let isMounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    const requestSeverity = async () => {
      try {
        const res = await fetch('/api/agent/severity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complaintId }),
        });

        const data: SeverityPostResponse = await res.json();
        if (isMounted && data.success && data.severity) {
          setSeverity(data.severity);
          setReason(data.reason || null);
          setFallback(Boolean(data.fallback));
          setLatencyMs(data.latencyMs ?? null);
          setIsAnalyzing(false);
          return;
        }
      } catch (err) {
        console.warn('[SuccessScreen] Direct severity evaluation request error:', err);
      }

      // If direct POST didn't finalize, poll lightweight status endpoint
      let attempts = 0;
      const pollStatus = async () => {
        if (!isMounted || attempts > 6) {
          if (isMounted) setIsAnalyzing(false);
          return;
        }
        attempts++;
        try {
          const res = await fetch(`/api/agent/severity?complaintId=${encodeURIComponent(complaintId)}`);
          const data: SeverityGetResponse = await res.json();
          if (isMounted && data.success && (data.analyzed || data.severity !== undefined)) {
            setSeverity(data.severity ?? 2);
            setReason(data.reason ?? null);
            setFallback(Boolean(data.fallback));
            setLatencyMs(data.latencyMs ?? null);
            setIsAnalyzing(false);
            return;
          }
        } catch {
          // Continue polling
        }
        if (isMounted) {
          pollTimer = setTimeout(pollStatus, 1500);
        }
      };

      pollTimer = setTimeout(pollStatus, 1000);
    };

    requestSeverity();

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [complaintId]);

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(complaintId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center text-center space-y-5 animate-in fade-in duration-200">
      {/* Success Badge */}
      <div className="w-12 h-12 rounded-full bg-status-verified/10 text-status-verified flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-status-open/10 text-status-open font-semibold uppercase tracking-wider border border-status-open/20">
          Status: Open
        </span>
        <h2 className="text-xl font-extrabold text-foreground">
          Complaint Registered
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          Your report has landed in the municipal operations queue with PostGIS ward routing.
        </p>
      </div>

      {/* Submitted Image Thumbnail */}
      {imageUrl && (
        <div className="w-full max-w-xs h-36 rounded-lg overflow-hidden border border-border bg-surface relative">
          <img
            src={imageUrl}
            alt="Submitted civic evidence"
            className="w-full h-full object-cover"
          />
          {category && (
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-900/80 text-white backdrop-blur-xs">
              {category}
            </span>
          )}
        </div>
      )}

      {/* AI Agent Severity Assessment Card (Phase 05) */}
      <div className="w-full bg-surface-card border border-border rounded-lg p-4 text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            AI Severity Assessment
          </span>

          {isAnalyzing ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Analyzing photo...</span>
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span
                data-testid="severity-badge"
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-bold ${getSeverityBadgeClasses(severity)}`}
              >
                {getSeverityLabel(severity)}
              </span>
              <button
                type="button"
                data-testid="why-this-score-btn"
                onClick={handleOpenTrace}
                disabled={isLoadingTrace}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                title="Why this severity score? (Inspect AI Trace)"
              >
                <Sparkles className="w-3 h-3" />
                <span>Why this score?</span>
              </button>
            </div>
          )}
        </div>

        {isAnalyzing ? (
          <div className="py-1 space-y-2 animate-pulse">
            <div className="h-3.5 bg-muted/20 rounded w-4/5"></div>
            <div className="h-2.5 bg-muted/15 rounded w-3/5"></div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p data-testid="severity-reason-text" className="text-xs font-semibold text-foreground leading-relaxed">
              Severity: {getSeverityLabelName(severity)} &mdash; {reason || 'Verified from photo evidence'}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono flex-wrap">
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                <Bot className="w-3 h-3" />
                Gemini 1.5 Flash
              </span>
              {latencyMs && <span>&bull; {latencyMs}ms latency</span>}
              {fallback && (
                <span className="text-status-assigned">&bull; (fallback rule applied)</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Official Email Dispatch Notification */}
      <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3.5 text-left space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Official Grievance Dossier Dispatched
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-600 text-white font-bold uppercase">
            Dispatched
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The full complaint report and evidentiary photos have been dispatched to the designated official authority inbox:
          <span className="block font-mono font-bold text-foreground mt-0.5">nigamsetupanel@gmail.com</span>
        </p>
      </div>

      {/* Ticket Details Box */}
      <div className="w-full bg-surface-card border border-border rounded-lg p-4 text-left space-y-2.5">
        {/* Ticket ID */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Complaint ID:</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-foreground">
            <span className="truncate max-w-[180px]">{complaintId}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Copy ID"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-status-verified" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Assigned Ward */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Assigned Ward:</span>
          <span className="font-semibold text-foreground flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {wardName || 'Ward Assigned via Location'}
          </span>
        </div>

        {/* SLA Timeline */}
        <div className="flex items-start justify-between text-xs pt-2 border-t border-border">
          <span className="text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Expected Timeline:
          </span>
          <span className="font-semibold text-foreground text-right max-w-[200px]">
            {severity && severity >= 3 ? '24 to 48 hours (Priority Escalation)' : '48 to 72 hours under municipal service SLA'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-2 pt-1">
        <button
          type="button"
          onClick={onViewMyComplaints}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span>View in "My Complaints"</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <Link
          href="/"
          className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-surface border border-border text-foreground text-xs font-semibold hover:bg-surface-hover active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <span>View Public Ward Map</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </Link>

        <button
          type="button"
          onClick={onReset}
          className="w-full min-h-[40px] py-2 px-4 rounded-lg text-muted-foreground text-xs font-medium hover:text-foreground transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Report Another Issue</span>
        </button>
      </div>

      {/* AI Trace Inspector Modal (Phase 12) */}
      <AgentTraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        trace={traceData}
        allTraces={allTraces}
        complaintId={complaintId}
        initialTool="scoreSeverity"
      />
    </div>
  );
}
