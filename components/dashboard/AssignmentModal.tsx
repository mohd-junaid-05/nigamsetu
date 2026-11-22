'use client';

import React, { useState, useEffect } from 'react';
import { FacilityItem } from '@/app/api/facilities/route';
import { NearestFacilityItem } from '@/app/api/facilities/nearest/route';
import { X, Building2, CheckCircle2, AlertCircle, Loader2, Navigation } from 'lucide-react';

interface AssignmentModalProps {
  complaint: {
    id: string;
    category: string;
    severity: number;
    description: string | null;
    address_text: string | null;
    facility_id?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: (complaintId: string, facilityId: string, facilityName: string) => void;
  facilities: FacilityItem[];
}

const CATEGORY_TO_FACILITY_TYPE: Record<string, string> = {
  road: 'road',
  garbage: 'sanitation',
  sewage: 'sewage',
  school: 'education',
  healthcenter: 'health',
  other: '',
};

function formatDistance(meters?: number): string {
  if (meters === undefined || meters === null || isNaN(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export default function AssignmentModal({
  complaint,
  isOpen,
  onClose,
  onAssigned,
  facilities,
}: AssignmentModalProps) {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [nearestFacilities, setNearestFacilities] = useState<NearestFacilityItem[]>([]);
  const [isLoadingNearest, setIsLoadingNearest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllFacilities, setShowAllFacilities] = useState(false);

  useEffect(() => {
    if (!complaint || !isOpen) return;

    setError(null);
    setIsLoadingNearest(true);

    // Fetch top 3 nearest facilities via PostGIS KNN
    fetch(`/api/facilities/nearest?complaintId=${encodeURIComponent(complaint.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.facilities) && data.facilities.length > 0) {
          setNearestFacilities(data.facilities);
          setSelectedFacilityId(data.facilities[0].id);
        } else {
          // Fallback to ward facilities
          const preferredType = CATEGORY_TO_FACILITY_TYPE[complaint.category] || '';
          const matching = facilities.filter(
            (f) => !preferredType || f.type.toLowerCase().includes(preferredType.toLowerCase())
          );
          if (matching.length > 0) {
            setSelectedFacilityId(matching[0].id);
          } else if (facilities.length > 0) {
            setSelectedFacilityId(facilities[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Nearest facilities lookup fallback:', err);
      })
      .finally(() => {
        setIsLoadingNearest(false);
      });
  }, [complaint, isOpen, facilities]);

  if (!isOpen || !complaint) return null;

  const preferredType = CATEGORY_TO_FACILITY_TYPE[complaint.category] || '';
  const matchingFacilities = facilities.filter(
    (f) => !preferredType || f.type.toLowerCase().includes(preferredType.toLowerCase())
  );

  // If nearest facilities found and not showing all, show the top nearest facilities
  const displayedFacilities =
    !showAllFacilities && nearestFacilities.length > 0
      ? nearestFacilities
      : showAllFacilities || matchingFacilities.length === 0
      ? facilities
      : matchingFacilities;

  const handleAssign = async () => {
    if (!selectedFacilityId) {
      setError('Please select a facility');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/complaints/${complaint.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: selectedFacilityId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign facility');
      }

      const assignedFac =
        nearestFacilities.find((f) => f.id === selectedFacilityId) ||
        facilities.find((f) => f.id === selectedFacilityId);

      onAssigned(
        complaint.id,
        selectedFacilityId,
        assignedFac?.name || 'Assigned Facility'
      );
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to assign complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-surface-card rounded-2xl border border-border shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm">Assign Municipal Facility</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Target Complaint Summary */}
          <div className="p-3 rounded-xl bg-surface border border-border flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold capitalize text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                {complaint.category} Ticket
              </span>
              <span className="font-mono text-muted-foreground">
                ID: #{complaint.id.slice(0, 8)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {complaint.description || complaint.address_text || 'No description provided'}
            </p>
          </div>

          {/* Facility Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {!showAllFacilities && nearestFacilities.length > 0
                    ? 'Top Nearest Matching Depots (PostGIS KNN):'
                    : 'Select Department Depot / Facility:'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowAllFacilities(!showAllFacilities)}
                className="text-[10px] text-blue-600 hover:underline font-semibold"
              >
                {showAllFacilities
                  ? 'Show Nearest (Top 3)'
                  : `Show All (${facilities.length})`}
              </button>
            </div>

            {isLoadingNearest ? (
              <div className="p-4 rounded-xl border border-border bg-surface flex items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Calculating nearest facility routes via PostGIS...</span>
              </div>
            ) : displayedFacilities.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-border text-center text-muted-foreground text-xs">
                No facilities registered in this ward.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {displayedFacilities.map((fac, idx) => {
                  const isSelected = fac.id === selectedFacilityId;
                  const isNearest = !showAllFacilities && nearestFacilities.length > 0 && idx === 0;
                  const distStr = 'distance_meters' in fac ? formatDistance((fac as NearestFacilityItem).distance_meters) : '';

                  return (
                    <div
                      key={fac.id}
                      onClick={() => setSelectedFacilityId(fac.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600/10 ring-1 ring-blue-600'
                          : 'border-border bg-surface hover:border-blue-500/40'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-foreground">{fac.name}</span>
                          {isNearest && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-600 text-white">
                              Nearest
                            </span>
                          )}
                          {distStr && (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-blue-600/15 text-blue-600 border border-blue-500/20">
                              {distStr}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          Type: {fac.type} {fac.contact_phone ? `• Tel: ${fac.contact_phone}` : ''}
                        </span>
                      </div>
                      <div className="pt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action note */}
          <p className="text-[11px] text-muted-foreground">
            Assigning will transition ticket status from <strong className="text-status-open">Open</strong> to{' '}
            <strong className="text-status-assigned">Assigned</strong> atomically.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-surface/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted/20 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isSubmitting || !selectedFacilityId}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm Assignment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
