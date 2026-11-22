'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PriorityQueueItem } from '@/app/api/complaints/priority/route';
import { FacilityItem } from '@/app/api/facilities/route';

interface DashboardMapProps {
  items: PriorityQueueItem[];
  facilities: FacilityItem[];
  selectedId: string | null;
  onSelectComplaint: (id: string) => void;
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  assigned: '#f59e0b',
  in_progress: '#3b82f6',
  resolved: '#6b7280',
  verified: '#22c55e',
};

const SEVERITY_SCALES: Record<number, number> = {
  1: 0.85,
  2: 1.0,
  3: 1.2,
  4: 1.45,
};

export default function DashboardMap({
  items,
  facilities,
  selectedId,
  onSelectComplaint,
  className = '',
  initialCenter = [12.935, 77.65],
  initialZoom = 13,
}: DashboardMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: false,
        maxZoom: 19,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control
        .attribution({
          position: 'bottomright',
          prefix: '<span class="text-[10px] text-muted-foreground opacity-75">© OpenStreetMap</span>',
        })
        .addTo(map);

      const layerGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = layerGroup;
    }

    return () => {
      // Cleanup on unmount
    };
  }, [initialCenter, initialZoom]);

  // Update Markers when items or facilities change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds: [number, number][] = [];

    // 1. Render Municipal Facility Markers
    facilities.forEach((fac) => {
      if (typeof fac.lat !== 'number' || typeof fac.lng !== 'number') return;

      const facIcon = L.divIcon({
        className: 'custom-facility-pin',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.35); border: 2px solid #ffffff;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
                <path d="M8 6h.01"></path>
                <path d="M16 6h.01"></path>
                <path d="M8 10h.01"></path>
                <path d="M16 10h.01"></path>
                <path d="M8 14h.01"></path>
                <path d="M16 14h.01"></path>
              </svg>
            </div>
            <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 9px; font-weight: 700; background: rgba(15,23,42,0.85); color: #fff; padding: 1px 4px; border-radius: 4px; pointer-events: none;">
              ${fac.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([fac.lat, fac.lng], { icon: facIcon });
      marker.bindTooltip(
        `<strong>${fac.name}</strong><br/><span style="opacity:0.8; text-transform:capitalize;">Dept: ${fac.type}</span>`,
        { direction: 'top', offset: [0, -16] }
      );
      layerGroup.addLayer(marker);
      bounds.push([fac.lat, fac.lng]);
    });

    // 2. Render Complaint Pins
    items.forEach((item) => {
      // Parse coordinates from location string or GeoJSON
      let lat = 12.935;
      let lng = 77.65;
      if (typeof item.location === 'string') {
        const match = item.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      } else if (
        item.location &&
        typeof item.location === 'object' &&
        'coordinates' in (item.location as any)
      ) {
        const coords = (item.location as any).coordinates;
        lng = coords[0];
        lat = coords[1];
      }

      const isSelected = item.id === selectedId;
      const color = STATUS_COLORS[item.status] || '#ef4444';
      const scale = SEVERITY_SCALES[item.severity] || 1.0;
      const isClustered = item.weight > 1;

      const pinIcon = L.divIcon({
        className: 'custom-dashboard-complaint-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transform: scale(${
            isSelected ? scale * 1.3 : scale
          }); transform-origin: 50% 100%; transition: transform 0.2s ease;">
            ${
              isSelected
                ? `<div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: #3b82f6; opacity: 0.4; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                : ''
            }
            ${
              isClustered
                ? `<div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 9999px; border: 1.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.5); white-space: nowrap; pointer-events: none;">${item.weight} reports</div>`
                : ''
            }
            <svg viewBox="0 0 24 24" width="34" height="34" fill="${color}" stroke="${
          isSelected ? '#3b82f6' : '#ffffff'
        }" stroke-width="${isSelected ? 3 : 2}" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3.2" fill="#ffffff"></circle>
            </svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker([lat, lng], { icon: pinIcon });
      marker.on('click', () => {
        onSelectComplaint(item.id);
      });

      layerGroup.addLayer(marker);
      bounds.push([lat, lng]);
    });

    // Auto-fit if markers exist
    if (bounds.length > 0) {
      try {
        const latLngBounds = L.latLngBounds(bounds);
        if (latLngBounds.isValid()) {
          map.fitBounds(latLngBounds, { padding: [35, 35], maxZoom: 15 });
        }
      } catch {
        // Fallback keep default view
      }
    }
  }, [items, facilities, selectedId, onSelectComplaint]);

  // Center on selected complaint
  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current) return;
    const selectedItem = items.find((i) => i.id === selectedId);
    if (!selectedItem) return;

    let lat = 12.935;
    let lng = 77.65;
    if (typeof selectedItem.location === 'string') {
      const match = selectedItem.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    }
    mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
  }, [selectedId, items]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
