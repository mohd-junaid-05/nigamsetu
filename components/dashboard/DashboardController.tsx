'use client';

import React, { useState, useCallback } from 'react';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import { FacilityItem } from '@/app/api/facilities/route';
import PriorityQueueTable from './PriorityQueueTable';
import DashboardMap from './DashboardMap';
import ComplaintDetailPanel from './ComplaintDetailPanel';
import AssignmentModal from './AssignmentModal';
import ResolutionModal from '@/components/facility/ResolutionModal';
import { useLiveComplaints } from '@/hooks/useLiveComplaints';
import { Layers, Map, FileText, Wifi, RefreshCw } from 'lucide-react';

interface DashboardControllerProps {
  initialQueue: PriorityQueueItem[];
  facilities: FacilityItem[];
  wardId: string | null;
  wardName: string;
}

export default function DashboardController({
  initialQueue,
  facilities,
  wardId,
  wardName,
}: DashboardControllerProps) {
  const [queue, setQueue] = useState<PriorityQueueItem[]>(initialQueue);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialQueue.length > 0 ? initialQueue[0].id : null
  );
  const [assignTarget, setAssignTarget] = useState<PriorityQueueItem | null>(null);
  const [resolveTarget, setResolveTarget] = useState<PriorityQueueItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'map' | 'details'>('queue');

  // Reload queue from database
  const refreshQueue = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const url = wardId
        ? `/api/complaints/priority?wardId=${encodeURIComponent(wardId)}`
        : '/api/complaints/priority';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setQueue(data.items);
      }
    } catch (err) {
      console.warn('[DashboardController] Realtime refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [wardId]);

  // Subscribe to live Postgres changes on complaints in this ward
  useLiveComplaints(wardId, refreshQueue);

  // Selected complaint object
  const selectedComplaint = queue.find((i) => i.id === selectedId) || null;

  // Handle local assignment update immediately, then refresh
  const handleAssigned = (
    complaintId: string,
    facilityId: string,
    facilityName: string
  ) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === complaintId
          ? { ...item, status: 'assigned' as const }
          : item
      )
    );
    refreshQueue();
  };

  // Start work (mark in_progress)
  const handleStartWork = async (item: PriorityQueueItem) => {
    try {
      const res = await fetch(`/api/complaints/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          notes: 'Work started by municipal operations team',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'in_progress' as const } : q
          )
        );
        refreshQueue();
      }
    } catch (err) {
      console.error('[DashboardController] Failed to mark in progress:', err);
    }
  };

  // Handle resolution update
  const handleResolved = ({
    complaintId,
    resolutionImageUrl,
    resolvedAt,
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
    setQueue((prev) =>
      prev.map((item) =>
        item.id === complaintId
          ? {
              ...item,
              status: finalStatus,
              resolution_image_url: resolutionImageUrl,
              resolved_at: resolvedAt,
              verification_score: typeof verification?.score === 'number' ? verification.score : item.verification_score,
              verification_status: verification?.autoVerificationStatus || item.verification_status,
            }
          : item
      )
    );
    refreshQueue();
  };

  // Handle official verification action (Verify & Close, Reject & Reopen, Flag for Review)
  const handleVerifyAction = async (
    complaintId: string,
    action: 'verify' | 'reject' | 'flag',
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === complaintId
              ? {
                  ...item,
                  status: data.status as any,
                  verification_status: data.verification_status,
                }
              : item
          )
        );
        refreshQueue();
      }
    } catch (err) {
      console.error('[DashboardController] Failed to apply verification action:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full max-w-7xl mx-auto p-4 sm:p-6 gap-4">
      {/* Real-time Indicator & Responsive Tab Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Wifi className="w-3.5 h-3.5" />
            <span>Supabase Realtime Live</span>
          </span>
          <button
            type="button"
            onClick={refreshQueue}
            disabled={isRefreshing}
            className="p-1 rounded-lg border border-border hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors"
            title="Manual sync with database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Mobile / Tablet Tab Switcher (visible on lg:hidden) */}
        <div className="flex lg:hidden items-center bg-surface-card rounded-xl p-1 border border-border text-xs font-semibold">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Queue ({queue.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Ward Map</span>
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>
      </div>

      {/* 3-Panel Desktop Layout (25% Queue | 50% Map | 25% Details) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Panel 1: Priority Queue (25% -> 3 cols) */}
        <section
          className={`lg:col-span-3 flex flex-col rounded-2xl border border-border bg-surface-card overflow-hidden shadow-sm ${
            activeTab === 'queue' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface/40">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-foreground">Priority Queue</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 border border-blue-500/20 font-bold">
              {queue.length} Tickets
            </span>
          </div>

          <PriorityQueueTable
            items={queue}
            selectedId={selectedId}
            onSelect={(item) => {
              setSelectedId(item.id);
              setActiveTab('details');
            }}
            onOpenAssign={(item) => setAssignTarget(item)}
          />
        </section>

        {/* Panel 2: Ward Map (50% -> 6 cols) */}
        <section
          className={`lg:col-span-6 flex flex-col rounded-2xl border border-border bg-surface-card overflow-hidden shadow-sm min-h-[460px] ${
            activeTab === 'map' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface/40 z-10">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-foreground">
                {wardName} Geospatial Map
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {facilities.length} Facilities • {queue.length} Active Pins
            </span>
          </div>

          <div className="flex-1 w-full h-full relative">
            <DashboardMap
              items={queue}
              facilities={facilities}
              selectedId={selectedId}
              onSelectComplaint={(id) => {
                setSelectedId(id);
                setActiveTab('details');
              }}
            />
          </div>
        </section>

        {/* Panel 3: Details & Workflow (25% -> 3 cols) */}
        <section
          className={`lg:col-span-3 flex flex-col rounded-2xl border border-border bg-surface-card overflow-hidden shadow-sm ${
            activeTab === 'details' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface/40">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-foreground">Ticket Details</h2>
            </div>
            {selectedComplaint && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/20 border border-border font-bold">
                #{selectedComplaint.id.slice(0, 6)}
              </span>
            )}
          </div>

          <ComplaintDetailPanel
            complaint={selectedComplaint}
            onOpenAssign={(item) => setAssignTarget(item)}
            onOpenResolve={(item) => setResolveTarget(item)}
            onStartWork={handleStartWork}
            onVerifyAction={handleVerifyAction}
          />
        </section>
      </div>

      {/* Assignment Modal Dialog */}
      <AssignmentModal
        complaint={assignTarget}
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        onAssigned={handleAssigned}
        facilities={facilities}
      />

      {/* Resolution Upload Modal Dialog */}
      {resolveTarget && (
        <ResolutionModal
          complaintId={resolveTarget.id}
          complaintCategory={resolveTarget.category}
          complaintStatus={resolveTarget.status}
          defaultLat={typeof resolveTarget.location === 'object' && resolveTarget.location && 'lat' in resolveTarget.location ? (resolveTarget.location as any).lat : null}
          defaultLng={typeof resolveTarget.location === 'object' && resolveTarget.location && 'lng' in resolveTarget.location ? (resolveTarget.location as any).lng : null}
          isOpen={true}
          onClose={() => setResolveTarget(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}
