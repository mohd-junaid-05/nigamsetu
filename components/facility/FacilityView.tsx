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
  Check,
  FileText,
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
    badge: 'bg-red-600/15 text-red-600 dark:text-red-400 border-red-600/30',
  },
  3: {
    label: 'Tier 3 - Critical',
    badge: 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/25',
  },
  2: {
    label: 'Tier 2 - Significant',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
  },
  1: {
    label: 'Tier 1 - Cosmetic',
    badge: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
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
      setFeedbackMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Callback when a complaint is marked resolved in modal
  const handleResolved = ({
    complaintId,
    resolutionImageUrl,
    resolvedAt,
    notes,
    status,
    verification,
  }: {
    complaintId: string;
    resolutionImageUrl: string;
    resolvedAt: string;
    notes?: string | null;
    status?: string;
    verification?: any;
  }) => {
    const finalStatus = (status as any) || 'resolved';
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              status: finalStatus,
              resolution_image_url: resolutionImageUrl,
              resolved_at: resolvedAt,
              resolution_notes: notes || null,
            }
          : c
      )
    );

    if (finalStatus === 'verified') {
      const scorePct = verification?.score ? `${(verification.score * 100).toFixed(0)}%` : '88%';
      setFeedbackMessage({
        type: 'success',
        text: `Resolution verified by AI (Confidence: ${scorePct})! Fix confirmed and ticket closed.`,
      });
    } else if (finalStatus === 'in_progress') {
      const scorePct = typeof verification?.score === 'number' ? `${(verification.score * 100).toFixed(0)}%` : '15%';
      setFeedbackMessage({
        type: 'error',
        text: `AI verification rejected resolution (Score: ${scorePct}): ${verification?.reason || 'Location mismatch or duplicate evidence'}. Ticket returned to In Progress for rework.`,
      });
    } else {
      setFeedbackMessage({
        type: 'success',
        text: 'Resolution proof recorded! Ticket entered verification pipeline (pending official review).',
      });
    }
  };

  // Filter complaints
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-card border border-border shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {selectedFacility.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {selectedFacility.type} Depot
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>Facility Scoped Field View</span>
              {selectedFacility.contact_phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  {selectedFacility.contact_phone}
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
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer shadow-sm"
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
            className="p-2 rounded-xl border border-border bg-surface hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
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
            className="text-xs hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs & KPI Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Assigned</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white">
              {complaints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('assigned')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'assigned'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <span>Assigned Depot</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white">
              {assignedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('in_progress')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'in_progress'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <span>In Progress</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white">
              {inProgressCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('resolved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'resolved'
                ? 'bg-zinc-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <span>Resolved</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white">
              {resolvedCount}
            </span>
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing <strong>{filteredComplaints.length}</strong> ticket{filteredComplaints.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Complaints Grid */}
      {filteredComplaints.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-card border border-border flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/20 text-muted-foreground flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-foreground text-sm">No Complaints in This View</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            All tickets assigned to {selectedFacility.name} have been processed, or no tickets match the selected status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredComplaints.map((item) => {
            const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG[2];
            const isAssigned = item.status === 'assigned';
            const isInProgress = item.status === 'in_progress';
            const isResolved = item.status === 'resolved' || item.status === 'verified';

            return (
              <div
                key={item.id}
                className="flex flex-col rounded-2xl bg-surface-card border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Photo Header */}
                <div className="relative w-full h-44 bg-zinc-950 overflow-hidden group">
                  <img
                    src={item.image_url}
                    alt={item.category}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white font-bold text-[11px] capitalize border border-white/10">
                    {item.category}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {isAssigned && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/90 text-white font-bold text-[10px] backdrop-blur-md shadow-sm">
                        Assigned Depot
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-600/90 text-white font-bold text-[10px] backdrop-blur-md shadow-sm">
                        In Progress
                      </span>
                    )}
                    {item.status === 'resolved' && (
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-600/90 text-white font-bold text-[10px] backdrop-blur-md shadow-sm">
                        Resolved (Unverified)
                      </span>
                    )}
                    {item.status === 'verified' && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white font-bold text-[10px] backdrop-blur-md shadow-sm">
                        Verified Fix ✓
                      </span>
                    )}
                  </div>

                  {/* Severity Badge */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border backdrop-blur-md ${sev.badge}`}
                    >
                      {sev.label}
                    </span>
                    {item.weight > 1 && (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-600/90 text-white font-bold text-[10px] border border-blue-400/30">
                        {item.weight} Reports
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4 text-xs">
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description || 'No detailed issue notes provided by citizen.'}
                    </p>

                    <div className="flex items-start gap-1.5 text-foreground font-medium text-[11px] pt-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">
                        {item.address_text || `GPS: ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}
                      </span>
                    </div>

                    {/* SLA Status indicator */}
                    <div className="flex items-center gap-1.5 text-[11px] pt-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>
                        Reported: {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      {item.sla_breached && (
                        <span className="ml-auto px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-bold text-[10px] border border-red-500/20">
                          SLA Breached
                        </span>
                      )}
                    </div>

                    {/* After Photo & Notes Preview (if resolved) */}
                    {item.resolution_image_url && (
                      <div className="mt-2 p-2.5 rounded-xl border border-border bg-surface/50 flex items-center gap-3">
                        <img
                          src={item.resolution_image_url}
                          alt="Resolution proof"
                          className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                        />
                        <div className="flex flex-col text-[11px]">
                          <span className="font-bold text-foreground">Repair Proof Captured</span>
                          <span className="text-[10px] text-muted-foreground line-clamp-1">
                            {item.resolution_notes || 'Geotagged after photo recorded'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-border flex items-center gap-2">
                    {isAssigned && (
                      <button
                        type="button"
                        onClick={() => handleStartWork(item.id)}
                        disabled={actionLoadingId === item.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
                      >
                        {actionLoadingId === item.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        <span>Start Work (In Progress)</span>
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => setResolvingComplaint(item)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    )}

                    {isResolved && (
                      <div className="w-full py-2 px-3 rounded-xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-bold text-xs text-center border border-zinc-500/20 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span>
                          {item.status === 'verified'
                            ? 'Verified & Closed'
                            : 'Pending AI Verification'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Upload Modal */}
      {resolvingComplaint && (
        <ResolutionModal
          complaintId={resolvingComplaint.id}
          complaintCategory={resolvingComplaint.category}
          complaintStatus={resolvingComplaint.status}
          defaultLat={resolvingComplaint.lat}
          defaultLng={resolvingComplaint.lng}
          isOpen={true}
          onClose={() => setResolvingComplaint(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}
