'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import { FacilityItem } from '@/app/api/facilities/route';
import PriorityQueueTable from './PriorityQueueTable';
import EscalationQueueTable from './EscalationQueueTable';
import DashboardMap from './DashboardMap';
import ComplaintDetailPanel from './ComplaintDetailPanel';
import ChatPanel, { ChatMessage } from './ChatPanel';
import AssignmentModal from './AssignmentModal';
import ResolutionModal from '@/components/facility/ResolutionModal';
import { useLiveComplaints } from '@/hooks/useLiveComplaints';
import { EscalationQueueItem } from '@/app/api/escalations/route';
import { EscalationStatus } from '@/lib/types/database';
import { Layers, Map, FileText, Wifi, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';

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
  const [queueView, setQueueView] = useState<'priority' | 'escalations'>('priority');
  const [panelView, setPanelView] = useState<'details' | 'chat'>('details');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [escalations, setEscalations] = useState<EscalationQueueItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Handle complaint citation selection from chat
  const handleSelectComplaintFromChat = (complaintId: string) => {
    setSelectedId(complaintId);
    setPanelView('details');
    setActiveTab('details');
  };

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

  // Fetch escalations from API
  const fetchEscalations = useCallback(async () => {
    try {
      const url = wardId
        ? `/api/escalations?wardId=${encodeURIComponent(wardId)}`
        : '/api/escalations';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.escalations)) {
        setEscalations(data.escalations);
      }
    } catch (err) {
      console.warn('[DashboardController] Failed to fetch escalations:', err);
    }
  }, [wardId]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  // Update escalation letter status
  const handleStatusChange = async (escalationId: string, newStatus: EscalationStatus) => {
    try {
      const res = await fetch(`/api/escalations/${escalationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setEscalations((prev) =>
          prev.map((e) => (e.id === escalationId ? { ...e, status: newStatus } : e))
        );
      }
    } catch (err) {
      console.error('[DashboardController] Status update error:', err);
    }
  };

  // Run autopilot cron scan
  const handleTriggerCronScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/agent/escalate/cron', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await Promise.all([refreshQueue(), fetchEscalations()]);
      }
    } catch (err) {
      console.error('[DashboardController] Cron scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Trigger manual escalation from detail panel
  const handleEscalateAction = async (item: PriorityQueueItem) => {
    try {
      const res = await fetch(`/api/complaints/${item.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([refreshQueue(), fetchEscalations()]);
      } else {
        alert(`Escalation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Escalation error: ${e.message}`);
    }
  };

  // Subscribe to live Postgres changes on complaints in this ward
  useLiveComplaints(wardId, () => {
    refreshQueue();
    fetchEscalations();
  });

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
    <div className="flex-1 flex flex-col w-full bg-background">
      {/* ── Dashboard Page Header (Utah.gov civic navy bar) ──────────────── */}
      <div className="bg-[#071D49] dark:bg-black border-b-2 border-[#FFB81D]/50 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-[#FFB81D] uppercase tracking-widest mb-0.5">
              Municipal Operations Centre
            </div>
            <h1 className="text-lg font-black text-white tracking-tight">
              {wardName} — Complaint Command Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/25">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5" />
              <span>Realtime Live</span>
            </span>
            <button
              type="button"
              onClick={refreshQueue}
              disabled={isRefreshing}
              className="p-1.5 rounded border border-white/20 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Manual sync with database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/admin/traces"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold border border-purple-500/25 transition-colors"
              title="Inspect AI Transparency and Audit Traces"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Audit Traces</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile Tab Switcher ───────────────────────────────────────────── */}
      <div className="flex lg:hidden items-center bg-surface border-b border-border px-4 py-2 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-2 rounded flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'queue'
              ? 'bg-[#071D49] dark:bg-[#1d70b8] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Queue ({queue.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2 rounded flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'map'
              ? 'bg-[#071D49] dark:bg-[#1d70b8] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Ward Map</span>
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2 rounded flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'details'
              ? 'bg-[#071D49] dark:bg-[#1d70b8] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>
      </div>

      {/* ── 3-Panel Desktop Grid ──────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-4 p-0 lg:p-4 max-w-7xl w-full mx-auto min-h-[600px]">
        {/* Panel 1: Priority / Escalation Queue (25% → 3 cols) */}
        <section
          className={`lg:col-span-3 flex flex-col border border-border bg-surface overflow-hidden rounded-none lg:rounded-lg shadow-sm ${
            activeTab === 'queue' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Panel sub-nav */}
          <div className="p-2 border-b border-border flex items-center gap-1 bg-surface-card">
            <button
              type="button"
              onClick={() => setQueueView('priority')}
              className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                queueView === 'priority'
                  ? 'bg-[#071D49] dark:bg-[#1d70b8] text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Priority ({queue.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setQueueView('escalations')}
              className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                queueView === 'escalations'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Escalated ({escalations.length})</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {queueView === 'priority' ? (
              <PriorityQueueTable
                items={queue}
                selectedId={selectedId}
                onSelect={(item) => {
                  setSelectedId(item.id);
                  setActiveTab('details');
                }}
                onOpenAssign={(item) => setAssignTarget(item)}
              />
            ) : (
              <EscalationQueueTable
                items={escalations}
                selectedId={selectedId}
                onSelect={(item) => {
                  setSelectedId(item.complaint_id);
                  setActiveTab('details');
                }}
                onStatusChange={handleStatusChange}
                onTriggerCronScan={handleTriggerCronScan}
                isScanning={isScanning}
              />
            )}
          </div>
        </section>

        {/* Panel 2: Ward Map (50% → 6 cols) */}
        <section
          className={`lg:col-span-6 flex flex-col border border-border bg-surface overflow-hidden rounded-none lg:rounded-lg shadow-sm min-h-[460px] ${
            activeTab === 'map' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3 border-b border-border flex items-center justify-between bg-surface-card z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#071D49] dark:bg-[#1d70b8] text-[#FFB81D] dark:text-white flex items-center justify-center">
                <Map className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-foreground">
                {wardName} — Geospatial Operations
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {facilities.length} Facilities · {queue.length} Incidents
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

        {/* Panel 3: Details & Chat (25% → 3 cols) */}
        <section
          className={`lg:col-span-3 flex flex-col border border-border bg-surface overflow-hidden rounded-none lg:rounded-lg shadow-sm ${
            activeTab === 'details' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-2 border-b border-border flex items-center gap-1 bg-surface-card">
            <button
              type="button"
              onClick={() => setPanelView('details')}
              className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                panelView === 'details'
                  ? 'bg-[#071D49] dark:bg-[#1d70b8] text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Details {selectedComplaint ? `(#${selectedComplaint.id.slice(0, 6)})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setPanelView('chat')}
              className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                panelView === 'chat'
                  ? 'bg-[#071D49] dark:bg-[#1d70b8] text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Copilot {chatMessages.length > 0 ? `(${chatMessages.length})` : ''}</span>
            </button>
          </div>

          {panelView === 'details' ? (
            <ComplaintDetailPanel
              complaint={selectedComplaint}
              onOpenAssign={(item) => setAssignTarget(item)}
              onOpenResolve={(item) => setResolveTarget(item)}
              onStartWork={handleStartWork}
              onVerifyAction={handleVerifyAction}
              onEscalateAction={handleEscalateAction}
            />
          ) : (
            <ChatPanel
              wardId={wardId}
              wardName={wardName}
              onSelectComplaint={handleSelectComplaintFromChat}
              messages={chatMessages}
              setMessages={setChatMessages}
            />
          )}
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
