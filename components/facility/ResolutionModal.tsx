'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  FileText,
  Navigation,
} from 'lucide-react';

interface ResolutionModalProps {
  complaintId: string;
  complaintCategory: string;
  complaintStatus: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved: (data: {
    complaintId: string;
    resolutionImageUrl: string;
    resolvedAt: string;
    notes?: string | null;
  }) => void;
}

export default function ResolutionModal({
  complaintId,
  complaintCategory,
  complaintStatus,
  defaultLat,
  defaultLng,
  isOpen,
  onClose,
  onResolved,
}: ResolutionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lat, setLat] = useState<string>(
    typeof defaultLat === 'number' && !isNaN(defaultLat) ? defaultLat.toFixed(6) : ''
  );
  const [lng, setLng] = useState<string>(
    typeof defaultLng === 'number' && !isNaN(defaultLng) ? defaultLng.toFixed(6) : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Image exceeds maximum 10MB limit.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        // If GPS permission denied or failed, keep existing or prompt manual
        setErrorMessage(`GPS detection error: ${err.message}. Please enter coordinates manually.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Frontend pre-validations
    if (!selectedFile) {
      setErrorMessage('Resolution photo proof is required.');
      return;
    }

    if (!lat.trim() || !lng.trim()) {
      setErrorMessage('Location required for verification.');
      return;
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setErrorMessage('Location required for verification.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('lat', lat);
      formData.append('lng', lng);
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      const res = await fetch(`/api/complaints/${complaintId}/resolve`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark complaint resolved.');
      }

      onResolved({
        complaintId,
        resolutionImageUrl: data.resolution_image_url,
        resolvedAt: data.resolved_at,
        notes: data.notes,
      });
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLocation = Boolean(lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolution-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-surface-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 id="resolution-modal-title" className="text-sm sm:text-base font-bold text-foreground">
                Mark Complaint Resolved
              </h3>
              <p className="text-[11px] text-muted-foreground capitalize">
                {complaintCategory} Ticket • Current status: <span className="font-mono font-semibold">{complaintStatus}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-start gap-2 text-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Photo Evidence Capture */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-foreground flex items-center justify-between text-xs">
              <span>Resolution Photo Evidence *</span>
              <span className="text-[10px] text-muted-foreground">Max 10MB</span>
            </label>

            {previewUrl ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-border bg-black/50 group">
                <img
                  src={previewUrl}
                  alt="Resolution proof preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black transition-colors"
                  title="Remove and retake photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 bg-surface/30 hover:bg-blue-500/5 transition-all text-muted-foreground hover:text-foreground"
                >
                  <Camera className="w-6 h-6 text-blue-600" />
                  <span className="font-bold text-xs">Take Photo</span>
                  <span className="text-[10px] text-muted-foreground">Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 bg-surface/30 hover:bg-blue-500/5 transition-all text-muted-foreground hover:text-foreground"
                >
                  <Upload className="w-6 h-6 text-emerald-600" />
                  <span className="font-bold text-xs">Upload File</span>
                  <span className="text-[10px] text-muted-foreground">Gallery / Files</span>
                </button>
              </div>
            )}

            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* GPS Coordinates Section */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border bg-surface/40">
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Repair Site GPS Coordinates *</span>
              </label>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isLocating}
                className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 font-semibold text-[11px] flex items-center gap-1 transition-colors"
              >
                <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Detecting...' : 'Auto-Detect GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Latitude</span>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 12.935200"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Longitude</span>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. 77.675000"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {!hasLocation ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Location required for verification.</span>
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>GPS coordinates ready for verification pipeline.</span>
              </p>
            )}
          </div>

          {/* Work Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Contractor / Worker Repair Notes (Optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Filled 2x1.5m pothole with WMM base and cold bituminous asphalt compaction."
              className="w-full p-2.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-border mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile || !hasLocation}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Fix...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Submit Resolution Proof</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
