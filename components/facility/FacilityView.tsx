'use client';

import React, { useState } from 'react';
import { FacilityComplaintItem } from '@/app/api/facility/complaints/route';
import { FacilityItem } from '@/app/api/facilities/route';
import ResolutionModal from './ResolutionModal';
import {
  Building2,
  Clock,
  MapPin,
  CheckCircle2,
  Play,
  Camera,
  AlertTriangle,
  RefreshCw,
  Phone,
  Layers,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

interface FacilityViewProps {
  initialFacility: {
    id: string;
    name: string;
    type: string;
    ward_id: string;
    contact_phone: string | null;
  };
  initialComplaints: FacilityComplaintItem[];
  allFacilities: FacilityItem[];
}

const SEVERITY_CONFIG: Record<
  number,
  { label: string; badge: string }
> = {
  4: {
    label: 'Tier 4 - Emergency',
    badge: 'bg-red-600/15 text-red-700 dark:text-red-300 border-red-600/30',
  },
  3: {
    label: 'Tier 3 - Critical',
    badge: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
  },
  2: {
    label: 'Tier 2 - Significant',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
  },
  1: {
    label: 'Tier 1 - Cosmetic',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  },
};

export default function FacilityView({
  initialFacility,
  initialComplaints,
  allFacilities,
}: FacilityViewProps) {
  const [selectedFacility, setSelectedFacility] = useState(initialFacility);
  const [complaints, setComplaints] = useState<FacilityComplaintItem[]>(initialComplaints);
  const [activeFilter, setActiveFilter] = useState<'all' | 'assigned' | 'in_progress' | 'resolved'>('all');
  const [resolvingComplaint, setResolvingComplaint] = useState<FacilityComplaintItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Switch facility & fetch its complaints
  const handleFacilityChange = async (newFacilityId: string) => {
    const target = allFacilities.find((f) => f.id === newFacilityId);
    if (!target) return;

    setIsRefreshing(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/facility/complaints?facilityId=${encodeURIComponent(newFacilityId)}`);
      const data = await res.json();
      if (data.success) {
        setSelectedFacility(data.facility);
        setComplaints(data.complaints);
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Failed to switch facility.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reload current facility's complaints
  const refreshComplaints = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/facility/complaints?facilityId=${encodeURIComponent(selectedFacility.id)}`);
      const data = await res.json();
      if (data.success) {
        setComplaints(data.complaints);
      }
    } catch (err) {
      console.warn('[FacilityView] Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Action: Transition complaint to 'in_progress'
  const handleStartWork = async (complaintId: string) => {
    setActionLoadingId(complaintId);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          notes: `Work started by ${selectedFacility.name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update complaint status');
      }

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId ? { ...c, status: 'in_progress' as const } : c
        )
      );

      setFeedbackMessage({
        type: 'success',
        text: 'Work marked In Progress. Ready for field repair.',
      });
    } catch (err: unknown) {
      const error = err as Error;
      setFeedbackMessage({
        type: 'error',
        text: error.message || 'Failed to transition complaint status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolvedSuccess = (data: {
    complaintId: string;
    resolutionImageUrl: string;
    resolvedAt: string;
    notes?: string | null;
    status?: string;
    verification?: any;
  }) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === data.complaintId
          ? {
              ...c,
              status: (data.status as any) || 'resolved',
              resolution_image_url: data.resolutionImageUrl,
              resolved_at: data.resolvedAt,
              resolution_notes: data.notes || c.resolution_notes,
            }
          : c
      )
    );

    setResolvingComplaint(null);
    setFeedbackMessage({
      type: 'success',
      text: `Repair proof recorded for complaint #${data.complaintId.slice(0, 8)}. AI verification initiated.`,
    });
  };

  const filteredComplaints = complaints.filter((c) => {
    if (activeFilter === 'all') return true;
    return c.status === activeFilter;
  });

  const assignedCount = complaints.filter((c) => c.status === 'assigned').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved' || c.status === 'verified').length;

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-surface border border-border shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {selectedFacility.name}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-600/10 text-blue-700 dark:text-blue-400 border border-blue-600/20 font-mono">
                {selectedFacility.type} Depot
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>Field Repair Tasks & Depot Verification</span>
              {selectedFacility.contact_phone && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  Dispatch: +91 ••••• ••01
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Facility Selector Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="relative">
            <select
              value={selectedFacility.id}
              onChange={(e) => handleFacilityChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-md border border-border bg-surface-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer shadow-2xs"
            >
              {allFacilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.type})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={refreshComplaints}
            disabled={isRefreshing}
            className="p-1.5 rounded-md border border-border bg-surface-card hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          role="alert"
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs hover:opacity-75 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs & KPI Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#071D49] text-white dark:bg-[#1d70b8] shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface border border-border'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Assigned</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-black/20 text-white">
              {complaints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('assigned')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'assigned'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface border border-border'
            }`}
          >
            <span>Assigned Depot</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-black/20 text-white">
              {assignedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('in_progress')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'in_progress'
                ? 'bg-[#071D49] text-white dark:bg-[#1d70b8] shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface border border-border'
            }`}
          >
            <span>In Progress</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-black/20 text-white">
              {inProgressCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('resolved')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'resolved'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface border border-border'
            }`}
          >
            <span>Resolved / Verified</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-black/20 text-white">
              {resolvedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Task Cards Grid */}
      {filteredComplaints.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-surface flex flex-col items-center justify-center gap-2">
          <Layers className="w-8 h-8 opacity-40 text-blue-600" />
          <h3 className="font-bold text-foreground text-sm">No Tickets Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            No complaints currently match this filter state for {selectedFacility.name}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComplaints.map((c) => {
            const sev = SEVERITY_CONFIG[c.severity] || SEVERITY_CONFIG[2];
            const isAssigned = c.status === 'assigned';
            const isInProgress = c.status === 'in_progress';
            const isResolved = c.status === 'resolved' || c.status === 'verified';
            const isLoading = actionLoadingId === c.id;

            return (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="space-y-2.5">
                  {/* Card Header: Category & Severity */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">
                      #{c.id.slice(0, 8)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${sev.badge}`}>
                      {sev.label}
                    </span>
                  </div>

                  {/* Evidence Thumbnail */}
                  <div className="relative w-full h-36 rounded-md overflow-hidden border border-border bg-surface-card">
                    <img
                      src={c.image_url}
                      alt={c.category}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white font-mono text-[10px] font-bold capitalize">
                      {c.category}
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white font-mono text-[10px]">
                      {c.status.replace('_', ' ')}
                    </div>
                  </div>

                  {/* Description & Address */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground capitalize">
                      {c.category} Issue
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {c.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-foreground font-medium pt-1 border-t border-border">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">{c.address_text || 'GPS Coordinate Location'}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-border flex items-center gap-2">
                  {isAssigned && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleStartWork(c.id)}
                      className="flex-1 min-h-[38px] py-1.5 px-3 rounded-md bg-[#071D49] hover:bg-[#093692] dark:bg-[#1d70b8] dark:hover:bg-[#144e82] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>Start Work</span>
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => setResolvingComplaint(c)}
                      className="flex-1 min-h-[38px] py-1.5 px-3 rounded-md bg-[#00703c] hover:bg-[#005a30] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Proof & Resolve</span>
                    </button>
                  )}

                  {isResolved && (
                    <div className="flex-1 min-h-[38px] py-1.5 px-3 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="capitalize">{c.status}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Proof Upload Modal */}
      {resolvingComplaint && (
        <ResolutionModal
          complaintId={resolvingComplaint.id}
          complaintCategory={resolvingComplaint.category}
          complaintStatus={resolvingComplaint.status}
          defaultLat={resolvingComplaint.lat}
          defaultLng={resolvingComplaint.lng}
          isOpen={Boolean(resolvingComplaint)}
          onClose={() => setResolvingComplaint(null)}
          onResolved={handleResolvedSuccess}
        />
      )}
    </div>
  );
}
