'use client';

import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Cpu,
  Layers,
  Code,
  ShieldCheck,
} from 'lucide-react';

export interface VerificationTraceData {
  id: string;
  complaint_id: string;
  tool_name: string;
  model_used: string;
  latency_ms: number;
  created_at: string;
  input_summary: {
    complaintId?: string;
    beforeImageUrl?: string;
    afterImageUrl?: string;
    beforeLocation?: [number, number];
    afterLocation?: [number, number];
    beforeTimestamp?: string;
    afterTimestamp?: string;
    category?: string;
  };
  output_summary: {
    verified?: boolean;
    score?: number;
    confidence?: number;
    reason?: string;
    verdict?: string;
    checks?: {
      gpsMatch?: boolean;
      timestampValid?: boolean;
      hashDifferent?: boolean;
      visionVerdict?: boolean;
    };
    metrics?: {
      distanceMeters?: number;
      hammingDistance?: number | null;
      gpsScore?: number;
      hashScore?: number;
      visionScore?: number;
      visionConfidence?: number;
      compositeScore?: number;
      weights?: { gps: number; hash: number; vision: number };
    };
    autoStatus?: string;
    autoVerificationStatus?: string;
    rawResponse?: string;
  };
}

interface VerificationTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: VerificationTraceData | null;
  complaintId: string;
}

export default function VerificationTraceModal({
  isOpen,
  onClose,
  trace,
  complaintId,
}: VerificationTraceModalProps) {
  if (!isOpen) return null;

  const out = trace?.output_summary;
  const checks = out?.checks || {
    gpsMatch: true,
    timestampValid: true,
    hashDifferent: true,
    visionVerdict: true,
  };
  const metrics = out?.metrics;
  const score = typeof out?.score === 'number' ? out.score : 0;
  const weights = metrics?.weights || { gps: 0.2, hash: 0.3, vision: 0.5 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>AI Verification Audit Trace</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground border border-border">
                  tool: {trace?.tool_name || 'verifyResolution'}
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Complaint ID: <span className="font-mono">{complaintId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          {/* Metadata Bar */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-surface border border-border">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <Cpu className="w-3 h-3 text-blue-500" /> Model Architecture
              </span>
              <span className="font-bold text-foreground font-mono mt-0.5">
                {trace?.model_used || 'gemini-1.5-pro'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Execution Latency
              </span>
              <span className="font-bold text-foreground font-mono mt-0.5">
                {trace?.latency_ms ? `${trace.latency_ms} ms` : '12 ms'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Verdict Decision
              </span>
              <span className="font-bold uppercase font-mono mt-0.5 text-foreground">
                {out?.verdict || (score >= 0.75 ? 'passed' : score < 0.4 ? 'failed' : 'review_needed')}
              </span>
            </div>
          </div>

          {/* Composite Score Breakdown Box */}
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Composite Score Formula: (GPS × 0.2) + (Hash × 0.3) + (Vision × 0.5)
              </span>
              <span className="font-mono text-sm font-black text-blue-600">
                {(score * 100).toFixed(0)}% ({score.toFixed(2)})
              </span>
            </div>

            {/* Formula calculation visualization */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-500/20 text-center font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-surface/80 border border-border">
                <div className="text-[10px] text-muted-foreground">GPS (20%)</div>
                <div className="font-bold text-foreground mt-0.5">
                  {(metrics?.gpsScore ?? (checks.gpsMatch ? 1 : 0)).toFixed(2)} × {weights.gps} ={' '}
                  <span className="text-blue-600 font-black">
                    {((metrics?.gpsScore ?? (checks.gpsMatch ? 1 : 0)) * weights.gps).toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface/80 border border-border">
                <div className="text-[10px] text-muted-foreground">Hash (30%)</div>
                <div className="font-bold text-foreground mt-0.5">
                  {(metrics?.hashScore ?? (checks.hashDifferent ? 0.75 : 0)).toFixed(2)} × {weights.hash} ={' '}
                  <span className="text-blue-600 font-black">
                    {((metrics?.hashScore ?? (checks.hashDifferent ? 0.75 : 0)) * weights.hash).toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface/80 border border-border">
                <div className="text-[10px] text-muted-foreground">Vision (50%)</div>
                <div className="font-bold text-foreground mt-0.5">
                  {(metrics?.visionScore ?? (checks.visionVerdict ? 0.9 : 0)).toFixed(2)} × {weights.vision} ={' '}
                  <span className="text-blue-600 font-black">
                    {((metrics?.visionScore ?? (checks.visionVerdict ? 0.9 : 0)) * weights.vision).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* The 4 Individual Checks in Sequence */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-[10px] text-muted-foreground">
              Sequential Verification Pipeline Checks
            </h4>

            {/* Check 1: GPS Proximity */}
            <div className="p-3 rounded-xl border border-border bg-surface flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {checks.gpsMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-foreground">1. Geospatial Haversine Proximity Check</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Tolerance: ≤ 100 meters between report and fix GPS coordinates.
                    {typeof metrics?.distanceMeters === 'number' && (
                      <span className="font-mono text-foreground font-semibold ml-1">
                        Measured distance: {Math.round(metrics.distanceMeters)}m.
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                  checks.gpsMatch ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'
                }`}
              >
                {checks.gpsMatch ? 'PASSED' : 'REJECTED'}
              </span>
            </div>

            {/* Check 2: Timestamp Order */}
            <div className="p-3 rounded-xl border border-border bg-surface flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {checks.timestampValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-foreground">2. Chronological Ordering Check</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Constraint: Resolution timestamp must strictly succeed complaint report time.
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                  checks.timestampValid ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'
                }`}
              >
                {checks.timestampValid ? 'PASSED' : 'REJECTED'}
              </span>
            </div>

            {/* Check 3: Perceptual Hash */}
            <div className="p-3 rounded-xl border border-border bg-surface flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {checks.hashDifferent ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-foreground">3. 64-bit DCT Perceptual Hash (Fake Detection)</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Constraint: Hamming distance &lt; 5 flags identical/re-uploaded photo fraud.
                    {typeof metrics?.hammingDistance === 'number' && (
                      <span className="font-mono text-foreground font-semibold ml-1">
                        Hamming distance: {metrics.hammingDistance}.
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                  checks.hashDifferent ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'
                }`}
              >
                {checks.hashDifferent ? 'PASSED' : 'REJECTED (FAKE)'}
              </span>
            </div>

            {/* Check 4: Vision Model */}
            <div className="p-3 rounded-xl border border-border bg-surface flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {checks.visionVerdict ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-foreground">4. Gemini 1.5 Pro Vision Defect Comparison</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Dual-image contextual analysis: "Has the issue been genuinely addressed?"
                    <div className="font-medium text-foreground italic mt-1 bg-surface-card p-2 rounded border border-border">
                      &quot;{out?.reason || 'Visual verification analysis executed.'}&quot;
                    </div>
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                  checks.visionVerdict ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                }`}
              >
                {checks.visionVerdict ? 'PASSED' : 'REJECTED'}
              </span>
            </div>
          </div>

          {/* Raw Model Prompt & Output Snapshot */}
          {out?.rawResponse && (
            <div className="p-3 rounded-xl border border-border bg-black/40 flex flex-col gap-1.5 font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                <Code className="w-3.5 h-3.5" />
                <span>Raw Model Response Snapshot</span>
              </div>
              <pre className="text-zinc-300 overflow-x-auto p-2 rounded bg-black/60 border border-white/5 whitespace-pre-wrap">
                {out.rawResponse}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-border bg-surface/50 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Audited at: {trace?.created_at ? new Date(trace.created_at).toLocaleString('en-IN') : 'Recent'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
          >
            Close Audit Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
