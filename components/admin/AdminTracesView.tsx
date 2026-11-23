'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Cpu,
  FileText,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import AgentTraceModal from '@/components/dashboard/AgentTraceModal';
import { AgentTraceItem } from '@/app/api/complaints/[id]/trace/route';

interface AdminTracesViewProps {
  initialTool?: string;
  initialComplaintId?: string;
  userRole?: string;
}

const TOOL_OPTIONS = [
  { value: 'all', label: 'All Tools (Complete Audit)' },
  { value: 'verifyResolution', label: 'verifyResolution (Photo Fix Comparison)' },
  { value: 'scoreSeverity', label: 'scoreSeverity (Vision Severity Triage)' },
  { value: 'checkDuplicate', label: 'checkDuplicate (pHash + Proximity)' },
  { value: 'generateEscalation', label: 'generateEscalation (RTI/Appeal Autopilot)' },
  { value: 'answerChat', label: 'answerChat (Official Ward NL-to-SQL)' },
];

const MODEL_OPTIONS = [
  { value: 'all', label: 'All Models' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { value: 'algorithm:phash+dbscan', label: 'DBSCAN + pHash' },
  { value: 'algorithm:geospatial-reject', label: 'GPS Reject Gate' },
  { value: 'algorithm:phash-fake-detector', label: 'pHash Fake Detector' },
  { value: 'template-fallback', label: 'Template Adapter' },
];

export default function AdminTracesView({
  initialTool = 'all',
  initialComplaintId = '',
  userRole = 'admin',
}: AdminTracesViewProps) {
  const [traces, setTraces] = useState<AgentTraceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedTool, setSelectedTool] = useState(initialTool);
  const [selectedModel, setSelectedModel] = useState('all');
  const [complaintSearch, setComplaintSearch] = useState(initialComplaintId);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 25;

  // Selected Trace for Modal Inspection
  const [inspectingTrace, setInspectingTrace] = useState<AgentTraceItem | null>(null);

  // Fetch filtered traces
  const fetchTraces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTool && selectedTool !== 'all') params.set('tool', selectedTool);
      if (selectedModel && selectedModel !== 'all') params.set('model', selectedModel);
      if (complaintSearch.trim()) params.set('complaintId', complaintSearch.trim());

      // Compute date boundaries
      if (dateFilter !== 'all') {
        const now = new Date();
        if (dateFilter === 'today') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          params.set('fromDate', start.toISOString());
        } else if (dateFilter === '7days') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          params.set('fromDate', d.toISOString());
        } else if (dateFilter === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          params.set('fromDate', d.toISOString());
        }
      }

      params.set('limit', String(limit));
      params.set('offset', String((page - 1) * limit));

      const res = await fetch(`/api/admin/traces?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load traces (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setTraces(data.traces || []);
        setTotalCount(data.totalCount || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch agent traces');
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Error querying agent traces');
      setTraces([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTool, selectedModel, complaintSearch, dateFilter, page]);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  const handleResetFilters = () => {
    setSelectedTool('all');
    setSelectedModel('all');
    setComplaintSearch('');
    setDateFilter('all');
    setPage(1);
  };

  // Helper summary formatter for table row
  const getTraceSummary = (t: AgentTraceItem) => {
    const out = t.output_summary || {};
    if (['scoreSeverity', 'severity_score'].includes(t.tool_name)) {
      return `Severity: ${out.severity ?? 'N/A'} - ${(out.reason as string)?.slice(0, 50) || 'Analyzed'}`;
    }
    if (['verifyResolution', 'verify_resolution'].includes(t.tool_name)) {
      const score = typeof out.score === 'number' ? `${(out.score * 100).toFixed(0)}%` : 'N/A';
      const verdict = (out.verdict as string) || (out.verified ? 'passed' : 'failed');
      return `Verdict: ${verdict} (${score})`;
    }
    if (['checkDuplicate', 'duplicate_check'].includes(t.tool_name)) {
      return out.isDuplicate ? `Duplicate of #${(out.matchedComplaintId as string)?.slice(0, 8)}` : 'Unique (No match)';
    }
    if (['generateEscalation', 'generate_escalation'].includes(t.tool_name)) {
      return `Dispatched to ${out.authority || 'Commissioner'}`;
    }
    if (['answerChat', 'chat_answer'].includes(t.tool_name)) {
      return `Answered (${out.resultCount || 0} cited)`;
    }
    return 'Decision executed';
  };

  const getToolBadgeColor = (tool: string) => {
    if (['scoreSeverity', 'severity_score'].includes(tool)) return 'bg-purple-600/10 text-purple-600 border-purple-500/30';
    if (['verifyResolution', 'verify_resolution'].includes(tool)) return 'bg-emerald-600/10 text-emerald-600 border-emerald-500/30';
    if (['checkDuplicate', 'duplicate_check'].includes(tool)) return 'bg-blue-600/10 text-blue-600 border-blue-500/30';
    if (['generateEscalation', 'generate_escalation'].includes(tool)) return 'bg-red-600/10 text-red-600 border-red-500/30';
    return 'bg-amber-600/10 text-amber-600 border-amber-500/30';
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-6 text-foreground">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-foreground">AI Transparency & Audit Traces</h1>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-600/10 text-blue-600 border border-blue-500/20 capitalize">
                  Auditor: {userRole}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every AI decision is auditable. Inspect raw prompts, vision evidence, perceptual hashes, and latency metrics.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchTraces}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-border bg-surface-card hover:bg-surface text-foreground text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          <span>Refresh Traces</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-surface-card flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            Total Filtered Traces
          </span>
          <span data-testid="kpi-total-traces" className="text-2xl font-black text-foreground font-mono">
            {totalCount}
          </span>
          <span className="text-[10px] text-muted-foreground">Logged across all 5 agent tools</span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-surface-card flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Average Execution Latency
          </span>
          <span className="text-2xl font-black text-foreground font-mono">
            {traces.length > 0
              ? `${Math.round(traces.reduce((acc, t) => acc + (t.latency_ms || 0), 0) / traces.length)} ms`
              : '0 ms'}
          </span>
          <span className="text-[10px] text-muted-foreground">Across visible execution logs</span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-surface-card flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Active AI Models
          </span>
          <span className="text-2xl font-black text-foreground font-mono">
            {new Set(traces.map((t) => t.model_used)).size}
          </span>
          <span className="text-[10px] text-muted-foreground">Cascaded multimodal vision models</span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-surface-card flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
            Audit Integrity
          </span>
          <span className="text-2xl font-black text-emerald-600 font-mono">
            100%
          </span>
          <span className="text-[10px] text-muted-foreground">Zero image bytes & zero PII in traces</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl border border-border bg-surface-card shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-purple-600" />
            Trace Query Filters
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Tool Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-tool-filter" className="font-semibold text-muted-foreground text-[11px]">
              Agent Tool Name
            </label>
            <select
              id="admin-tool-filter"
              data-testid="admin-tool-filter"
              value={selectedTool}
              onChange={(e) => {
                setSelectedTool(e.target.value);
                setPage(1);
              }}
              className="py-2 px-3 rounded-xl border border-border bg-surface text-foreground font-medium focus:ring-2 focus:ring-purple-500/20 outline-none"
            >
              {TOOL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-model-filter" className="font-semibold text-muted-foreground text-[11px]">
              Model / Pipeline Architecture
            </label>
            <select
              id="admin-model-filter"
              data-testid="admin-model-filter"
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setPage(1);
              }}
              className="py-2 px-3 rounded-xl border border-border bg-surface text-foreground font-medium focus:ring-2 focus:ring-purple-500/20 outline-none"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-date-filter" className="font-semibold text-muted-foreground text-[11px]">
              Audit Time Range
            </label>
            <select
              id="admin-date-filter"
              data-testid="admin-date-filter"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as any);
                setPage(1);
              }}
              className="py-2 px-3 rounded-xl border border-border bg-surface text-foreground font-medium focus:ring-2 focus:ring-purple-500/20 outline-none"
            >
              <option value="all">All Available Records</option>
              <option value="today">Today (Last 24 Hours)</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Complaint ID Search */}
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-complaint-search" className="font-semibold text-muted-foreground text-[11px]">
              Complaint ID Filter
            </label>
            <div className="relative">
              <input
                id="admin-complaint-search"
                data-testid="admin-complaint-search"
                type="text"
                placeholder="Paste Complaint UUID..."
                value={complaintSearch}
                onChange={(e) => {
                  setComplaintSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 pl-8 pr-3 rounded-xl border border-border bg-surface text-foreground font-mono text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Traces Table Section */}
      <div className="rounded-2xl border border-border bg-surface-card overflow-hidden shadow-sm flex flex-col">
        {loading && (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
            <span>Loading agent execution traces from audit log...</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 text-center text-xs text-red-600 bg-red-500/10 border-b border-red-500/20">
            {error}
          </div>
        )}

        {!loading && !error && traces.length === 0 && (
          <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Layers className="w-8 h-8 text-muted-foreground/40" />
            <h4 className="font-bold text-foreground text-sm">No Traces Found</h4>
            <p className="max-w-sm text-[11px]">
              No agent traces matched your filter criteria. Try choosing a different tool or clearing the search query.
            </p>
          </div>
        )}

        {!loading && !error && traces.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Tool Name</th>
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Model Used</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Summary Decision</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {traces.map((t) => (
                  <tr
                    key={t.id}
                    data-testid={`trace-row-${t.id}`}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* Tool Name Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        data-testid="table-tool-name"
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${getToolBadgeColor(
                          t.tool_name
                        )}`}
                      >
                        {t.tool_name}
                      </span>
                    </td>

                    {/* Complaint Reference ID */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      {t.complaint_id ? (
                        <span data-testid="table-complaint-id" className="text-blue-600 font-semibold" title={t.complaint_id}>
                          #{t.complaint_id.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">system / general</span>
                      )}
                    </td>

                    {/* Model Used */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-foreground">
                      {t.model_used}
                    </td>

                    {/* Latency */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      <span
                        className={
                          (t.latency_ms || 0) < 500
                            ? 'text-emerald-600 font-bold'
                            : (t.latency_ms || 0) < 2000
                            ? 'text-blue-600 font-bold'
                            : 'text-amber-600 font-bold'
                        }
                      >
                        {t.latency_ms ? `${t.latency_ms} ms` : 'N/A'}
                      </span>
                    </td>

                    {/* Decision Summary */}
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-muted-foreground">
                      {getTraceSummary(t)}
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        data-testid={`inspect-trace-${t.id}`}
                        onClick={() => setInspectingTrace(t)}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="p-3 px-4 border-t border-border bg-surface/30 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} traces
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono font-bold text-foreground">Page {page}</span>
              <button
                type="button"
                disabled={page * limit >= totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Audit Inspector Modal */}
      <AgentTraceModal
        isOpen={Boolean(inspectingTrace)}
        onClose={() => setInspectingTrace(null)}
        trace={inspectingTrace}
        complaintId={inspectingTrace?.complaint_id || undefined}
        initialTool={inspectingTrace?.tool_name}
      />
    </div>
  );
}
