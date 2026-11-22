'use client';

import React from 'react';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import {
  ShieldAlert,
  MapPin,
  Clock,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Users,
  Camera,
  Play,
} from 'lucide-react';
import Link from 'next/link';

interface ComplaintDetailPanelProps {
  complaint: PriorityQueueItem | null;
  onOpenAssign: (item: PriorityQueueItem) => void;
  onOpenResolve?: (item: PriorityQueueItem) => void;
  onStartWork?: (item: PriorityQueueItem) => void;
  facilityName?: string | null;
}

const SEVERITY_CONFIG: Record<
  number,
  { label: string; badge: string; dot: string; desc: string }
> = {
  4: {
    label: 'Tier 4 - Emergency',
    badge: 'bg-red-600/15 text-red-600 dark:text-red-400 border-red-600/30',
    dot: 'bg-red-600',
    desc: 'Immediate public hazard requiring emergency municipal intervention',
  },
  3: {
    label: 'Tier 3 - Critical',
    badge: 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/25',
    dot: 'bg-red-500',
    desc: 'Severe infrastructure defect posing safety/traffic failure risk',
  },
  2: {
    label: 'Tier 2 - Significant',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    dot: 'bg-amber-500',
    desc: 'Standard municipal defect requiring scheduled maintenance',
  },
  1: {
    label: 'Tier 1 - Cosmetic',
    badge: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
    dot: 'bg-zinc-500',
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
  facilityName,
}: ComplaintDetailPanelProps) {
  if (!complaint) {
    return (
      <div className="p-8 flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-foreground text-sm">No Complaint Selected</h4>
        <p className="text-[11px] mt-1 max-w-[220px]">
          Click any ticket from the priority queue or a pin on the ward map to inspect evidence and route work.
        </p>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[complaint.severity] || SEVERITY_CONFIG[2];
  const weight = complaint.weight || 1;
  const isClustered = weight > 1;
  const isBreached = complaint.sla_breached;

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === complaint.status);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
      {/* Photo Evidence Hero */}
      <div className="relative w-full h-44 rounded-2xl bg-zinc-950 overflow-hidden border border-border shadow-sm group">
        <img
          src={complaint.image_url}
          alt={complaint.category}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Category tag */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white font-bold text-[11px] capitalize border border-white/10">
          {complaint.category}
        </div>

        {/* Full Inspector link */}
        <Link
          href={`/complaint/${complaint.id}`}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white hover:text-blue-400 transition-colors border border-white/10"
          title="Open Full Complaint View"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        {/* Severity Badge on Image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border backdrop-blur-md ${sev.badge}`}
          >
            {sev.label}
          </span>
          {isClustered && (
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-600/90 text-white backdrop-blur-md border border-blue-400/30 flex items-center gap-1 shadow-sm">
              <Users className="w-3 h-3" />
              {weight} Clustered Reports
            </span>
          )}
        </div>
      </div>

      {/* Description & Address */}
      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface border border-border">
        <h5 className="font-bold text-foreground text-xs">Issue Description</h5>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {complaint.description || 'No detailed voice or text transcript supplied by citizen.'}
        </p>
        <div className="flex items-start gap-1.5 text-[11px] text-foreground font-medium pt-2 border-t border-border/60">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <span>{complaint.address_text || 'GPS Coordinate Location Recorded'}</span>
        </div>
      </div>

      {/* SLA Breach / Countdown Box */}
      <div
        className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
          isBreached
            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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

      {/* Status History Timeline */}
      <div className="p-3 rounded-xl bg-surface border border-border flex flex-col gap-2.5">
        <h5 className="font-bold text-foreground text-xs">Resolution Workflow</h5>
        <div className="flex flex-col gap-2 relative pl-2">
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
                      ? 'font-bold text-blue-600'
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

      {/* After Photo & Notes Preview (if resolved) */}
      {complaint.resolution_image_url && (
        <div className="p-3 rounded-xl border border-border bg-surface/50 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Resolution Proof Recorded</span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {complaint.resolved_at ? new Date(complaint.resolved_at).toLocaleDateString('en-IN') : ''}
            </span>
          </div>
          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-black/40">
            <img
              src={complaint.resolution_image_url}
              alt="Resolution proof"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Action Buttons: Workflow transitions */}
      <div className="pt-1 flex flex-col gap-2">
        {complaint.status === 'in_progress' && onOpenResolve && (
          <button
            type="button"
            onClick={() => onOpenResolve(complaint)}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            <span>Mark Resolved (Upload Proof)</span>
          </button>
        )}

        {complaint.status === 'assigned' && onStartWork && (
          <button
            type="button"
            onClick={() => onStartWork(complaint)}
            className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4" />
            <span>Start Work (Mark In Progress)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenAssign(complaint)}
          className="w-full py-2 px-4 rounded-xl border border-border hover:bg-surface text-foreground font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>
            {complaint.status === 'assigned'
              ? 'Reassign Municipal Facility'
              : 'Assign to nearest facility'}
          </span>
        </button>
      </div>
    </div>
  );
}
