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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-lg flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-card">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Assign Municipal Facility
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Ticket #{complaint.id.slice(0, 8)} &bull; {complaint.category.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-md bg-status-open/10 border border-status-open/30 text-status-open text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {isLoadingNearest ? 'Finding nearest facilities...' : 'Recommended Municipal Depots'}
            </span>
            <button
              type="button"
              onClick={() => setShowAllFacilities(!showAllFacilities)}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
            >
              {showAllFacilities ? 'Show Nearest (KNN)' : 'Show All Facilities'}
            </button>
          </div>

          {isLoadingNearest ? (
            <div className="p-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Calculating nearest depots via PostGIS...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {displayedFacilities.map((fac) => {
                const isSelected = selectedFacilityId === fac.id;
                const distanceStr = 'distance_meters' in fac ? formatDistance((fac as any).distance_meters) : '';

                return (
                  <label
                    key={fac.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                        : 'border-border bg-surface hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="facility"
                      value={fac.id}
                      checked={isSelected}
                      onChange={() => setSelectedFacilityId(fac.id)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-foreground truncate">
                          {fac.name}
                        </span>
                        {distanceStr && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-400 font-bold shrink-0">
                            {distanceStr}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="capitalize">{fac.type} Depot</span>
                        {fac.contact_phone && (
                          <span className="font-mono text-[10px] text-muted-foreground/80">&bull; Dispatch: +91 ••••• ••01</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-surface-card flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !selectedFacilityId}
            onClick={handleAssign}
            className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Routing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Assignment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
