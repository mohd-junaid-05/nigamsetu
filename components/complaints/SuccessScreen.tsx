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
} from 'lucide-react';
import { SeverityPostResponse, SeverityGetResponse } from '@/app/api/agent/severity/route';

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
      return 'bg-severity-1/15 text-foreground border-severity-1/40';
    case 2:
      return 'bg-severity-2/15 text-severity-2 border-severity-2/40';
    case 3:
      return 'bg-severity-3/15 text-severity-3 border-severity-3/40 font-bold';
    case 4:
      return 'bg-severity-4/20 text-severity-4 border-severity-4/40 font-bold animate-pulse';
    default:
      return 'bg-severity-2/15 text-severity-2 border-severity-2/40';
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
    <div className="bg-surface-card border border-border rounded-2xl p-6 flex flex-col items-center text-center space-y-5 animate-in fade-in duration-300">
      {/* Success Badge */}
      <div className="w-16 h-16 rounded-full bg-status-verified/10 text-status-verified flex items-center justify-center shadow-inner">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div>
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-status-open/10 text-status-open font-semibold uppercase tracking-wider">
          Status: Open
        </span>
        <h2 className="text-xl font-bold text-foreground mt-2">
          Complaint Registered
        </h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Your report has landed in the municipal queue with postGIS boundary routing.
        </p>
      </div>

      {/* Submitted Image Thumbnail if provided */}
      {imageUrl && (
        <div className="w-full max-w-xs h-32 rounded-xl overflow-hidden border border-border bg-surface relative">
          <img
            src={imageUrl}
            alt="Submitted civic evidence"
            className="w-full h-full object-cover"
          />
          {category && (
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
              {category}
            </span>
          )}
        </div>
      )}

      {/* AI Agent Severity Assessment Card (Phase 05) */}
      <div className="w-full bg-surface border border-border rounded-xl p-4 text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            AI Severity Assessment
          </span>

          {isAnalyzing ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Analyzing photo...</span>
            </span>
          ) : (
            <span
              data-testid="severity-badge"
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${getSeverityBadgeClasses(severity)}`}
            >
              {getSeverityLabel(severity)}
            </span>
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
              <span className="flex items-center gap-1 text-accent font-semibold">
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

      {/* Ticket Details Box */}
      <div className="w-full bg-surface border border-border rounded-xl p-4 text-left space-y-3">
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
            <MapPin className="w-3.5 h-3.5 text-accent" />
            {wardName || 'Ward Assigned via Location'}
          </span>
        </div>

        {/* SLA Timeline */}
        <div className="flex items-start justify-between text-xs pt-1 border-t border-border/60">
          <span className="text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-status-assigned" />
            Expected Timeline:
          </span>
          <span className="font-semibold text-foreground text-right max-w-[200px]">
            {severity && severity >= 3 ? '24 to 48 hours (Priority Escalation)' : '48 to 72 hours under municipal service SLA'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-2 pt-2">
        <button
          type="button"
          onClick={onViewMyComplaints}
          className="w-full py-2.5 px-4 rounded-xl bg-accent text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View in "My Complaints"</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <Link
          href="/"
          className="w-full py-2.5 px-4 rounded-xl bg-surface border border-border text-foreground text-xs font-semibold hover:bg-surface-hover transition-colors flex items-center justify-center gap-2"
        >
          <span>View Public Ward Map</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </Link>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 px-4 rounded-xl text-muted-foreground text-xs font-medium hover:text-foreground transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Report Another Issue</span>
        </button>
      </div>
    </div>
  );
}
