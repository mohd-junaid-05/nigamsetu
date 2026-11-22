'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

interface SuccessScreenProps {
  complaintId: string;
  wardName: string | null;
  imageUrl?: string;
  onReset: () => void;
  onViewMyComplaints: () => void;
}

export function SuccessScreen({
  complaintId,
  wardName,
  imageUrl,
  onReset,
  onViewMyComplaints,
}: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);

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
        <div className="w-full max-w-xs h-32 rounded-xl overflow-hidden border border-border bg-surface">
          <img
            src={imageUrl}
            alt="Submitted civic evidence"
            className="w-full h-full object-cover"
          />
        </div>
      )}

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
              className="p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
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
            48 to 72 hours under municipal service SLA
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
