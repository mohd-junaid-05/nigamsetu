'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
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
    status?: string;
    verification?: any;
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
        throw new Error(data.error || 'Failed to submit resolution');
      }

      onResolved({
        complaintId,
        resolutionImageUrl: data.resolution_image_url,
        resolvedAt: data.resolved_at || new Date().toISOString(),
        notes: notes.trim() || null,
        status: data.status,
        verification: data.verification,
      });
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Submission error');
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-card">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Upload Resolution Proof
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Ticket #{complaintId.slice(0, 8)} &bull; {complaintCategory.toUpperCase()}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-md bg-status-open/10 border border-status-open/30 text-status-open text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Photo Intake */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Repair Proof Photo</span>
              <span className="text-status-open">*</span>
            </label>

            {previewUrl ? (
              <div className="relative rounded-md overflow-hidden border border-border bg-black/40 h-44">
                <img
                  src={previewUrl}
                  alt="Resolution Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 text-white hover:bg-black/90 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
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
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-md border border-dashed border-border bg-surface-card hover:bg-surface-hover hover:border-emerald-600 transition-colors cursor-pointer min-h-[90px]"
                >
                  <Camera className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-md border border-dashed border-border bg-surface-card hover:bg-surface-hover hover:border-emerald-600 transition-colors cursor-pointer min-h-[90px]"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">Upload File</span>
                </button>
              </div>
            )}
          </div>

          {/* GPS Coordinates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
                <span>Site GPS Coordinates</span>
                <span className="text-status-open">*</span>
              </label>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isLocating}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>Detect Live GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <input
                type="text"
                placeholder="Latitude (e.g. 17.415600)"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-surface-card text-foreground"
              />
              <input
                type="text"
                placeholder="Longitude (e.g. 78.435000)"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-surface-card text-foreground"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              GPS proximity is cross-verified against the original complaint coordinates (100m threshold).
            </p>
          </div>

          {/* Work Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Field Completion Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. Pothole filled with hot-mix bitumen, roller compacted..."
              className="w-full text-xs p-2.5 rounded-md border border-border bg-surface-card text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold text-foreground hover:bg-surface-hover cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting & Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Submit Proof</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
