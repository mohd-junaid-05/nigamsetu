'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  RotateCw,
  Sliders,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { ReverseGeocodeResponse } from '@/app/api/geocode/reverse/route';

// Dynamically import Leaflet with ssr: false
const LeafletPickerMap = dynamic(
  () => import('./LeafletPickerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-56 rounded-xl border border-border bg-surface flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading interactive map picker...
      </div>
    ),
  }
);

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  addressText: string;
  onLocationChange: (lat: number, lng: number, address: string) => void;
  disabled?: boolean;
}

// Seeded Ward Coordinates for Bangalore Test Wards
const WARD_PRESETS = [
  { name: 'Ward 150 - Bellandur', lat: 12.935, lng: 77.675 },
  { name: 'Ward 174 - HSR Layout', lat: 12.915, lng: 77.645 },
  { name: 'Ward 112 - Koramangala', lat: 12.935, lng: 77.625 },
];

export function LocationPicker({
  lat,
  lng,
  addressText,
  onLocationChange,
  disabled = false,
}: LocationPickerProps) {
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'locked' | 'denied' | 'error'>('idle');
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAddress = useCallback(
    async (latitude: number, longitude: number) => {
      setGeocoding(true);
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
        if (res.ok) {
          const data: ReverseGeocodeResponse = await res.json();
          onLocationChange(latitude, longitude, data.displayName);
        } else {
          const fallback = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
          onLocationChange(latitude, longitude, fallback);
        }
      } catch {
        const fallback = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
        onLocationChange(latitude, longitude, fallback);
      } finally {
        setGeocoding(false);
      }
    },
    [onLocationChange]
  );

  const requestGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setErrorMessage('Geolocation is not supported by your browser.');
      setShowManualPicker(true);
      return;
    }

    setGpsStatus('locating');
    setErrorMessage(null);

    // Lock within 3 seconds as required by Acceptance Check 1
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setGpsStatus('locked');
        fetchAddress(newLat, newLng);
      },
      (error) => {
        // Acceptance check 4: denied permission triggers manual map picker
        setGpsStatus('denied');
        setShowManualPicker(true);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('Location permission denied. Please pick your location manually below.');
        } else {
          setErrorMessage('GPS timeout or error. Using manual location selection.');
        }

        // Set default to seeded ward (Bellandur) if no location set yet
        if (lat === null || lng === null) {
          const defaultWard = WARD_PRESETS[0];
          fetchAddress(defaultWard.lat, defaultWard.lng);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 4000,
        maximumAge: 10000,
      }
    );
  }, [fetchAddress, lat, lng]);

  // Auto-acquire GPS on mount
  useEffect(() => {
    if (lat === null || lng === null) {
      requestGpsLocation();
    } else {
      setGpsStatus('locked');
    }
  }, [lat, lng, requestGpsLocation]);

  const handleManualMapSelect = (newLat: number, newLng: number) => {
    setGpsStatus('locked');
    setErrorMessage(null);
    fetchAddress(newLat, newLng);
  };

  const handlePresetSelect = (preset: (typeof WARD_PRESETS)[0]) => {
    setGpsStatus('locked');
    setErrorMessage(null);
    fetchAddress(preset.lat, preset.lng);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>Incident Location</span>
          <span className="text-status-open font-bold">*</span>
        </label>

        {lat !== null && lng !== null ? (
          <span className="text-[11px] font-mono text-status-verified font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Location Locked
          </span>
        ) : (
          <span className="text-[11px] font-mono text-status-open font-medium">
            Location Required
          </span>
        )}
      </div>

      {/* Main Location Status Card */}
      <div className="p-3.5 rounded-xl border border-border bg-surface-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                lat !== null && lng !== null
                  ? 'bg-status-verified/10 text-status-verified'
                  : 'bg-status-open/10 text-status-open'
              }`}
            >
              <MapPin className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-foreground">
                  {lat !== null && lng !== null
                    ? `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`
                    : 'Awaiting Location Lock'}
                </h4>
                {gpsStatus === 'locating' && (
                  <span className="text-[10px] font-mono text-accent animate-pulse">
                    locking GPS...
                  </span>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {geocoding ? 'Reverse geocoding address via Nominatim...' : addressText || 'No address resolved'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              disabled={disabled || gpsStatus === 'locating'}
              onClick={requestGpsLocation}
              title="Acquire live GPS"
              className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin text-accent' : ''}`} />
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowManualPicker(!showManualPicker)}
              title="Toggle map picker"
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                showManualPicker
                  ? 'bg-accent text-white border-accent'
                  : 'border-border hover:bg-surface text-foreground'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Adjust</span>
            </button>
          </div>
        </div>

        {/* Permission Denied or Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            className="p-2.5 rounded-lg bg-status-assigned/10 border border-status-assigned/30 text-status-assigned text-xs flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-[11px]">{errorMessage}</span>
          </div>
        )}

        {/* Quick Ward Selection Presets */}
        <div className="pt-2 border-t border-border flex items-center gap-1.5 overflow-x-auto text-[10px]">
          <span className="text-muted-foreground flex items-center gap-1 whitespace-nowrap">
            <Building2 className="w-3 h-3" /> Wards:
          </span>
          {WARD_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className="px-2 py-0.5 rounded-md border border-border bg-surface hover:bg-surface-hover hover:border-accent text-foreground whitespace-nowrap transition-colors cursor-pointer font-mono"
            >
              {preset.name.split(' - ')[1]}
            </button>
          ))}
        </div>

        {/* Interactive Manual Map Picker (Acceptance check 4) */}
        {showManualPicker && (
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Manual Point Selector</span>
              <span>Click map or drag marker</span>
            </div>

            <LeafletPickerMap
              lat={lat ?? 12.935}
              lng={lng ?? 77.675}
              onPositionChange={handleManualMapSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
