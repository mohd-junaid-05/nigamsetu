'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { PublicMapPin } from '@/app/api/map/public/route';
import { ComplaintPopupResponse } from '@/app/api/complaints/[id]/popup/route';
import { getValidReportImageUrl, CATEGORY_REPORT_IMAGES } from '@/lib/utils/reportImages';

interface PublicMapClientProps {
  pins: PublicMapPin[];
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

// Status to semantic hex color mapping
const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',        // red
  assigned: '#f59e0b',    // amber
  in_progress: '#3b82f6', // blue
  resolved: '#6b7280',    // grey (unverified)
  verified: '#22c55e',    // green
  escalated: '#a855f7',   // purple
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved (Unverified)',
  verified: 'Verified Fix',
  escalated: 'Escalated',
};

const CATEGORY_ICONS: Record<string, string> = {
  road: 'Roads & Potholes',
  garbage: 'Garbage & Waste',
  sewage: 'Drainage & Sewage',
  school: 'Schools',
  healthcenter: 'Health Clinics',
  other: 'Other Civic Defect',
};

const SEVERITY_INFO: Record<number, { label: string; scale: number; badgeColor: string }> = {
  1: { label: 'Tier 1 - Cosmetic', scale: 0.85, badgeColor: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
  2: { label: 'Tier 2 - Significant', scale: 1.0, badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  3: { label: 'Tier 3 - Critical', scale: 1.18, badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  4: { label: 'Tier 4 - Emergency', scale: 1.4, badgeColor: 'bg-red-600/10 text-red-700 dark:text-red-300 border-red-600/30' },
};

export default function PublicMapClient({
  pins,
  className = '',
  initialCenter = [17.4156, 78.4350],
  initialZoom = 13,
}: PublicMapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  // Helper to create pin icon with status color, severity CSS scale, and optional cluster report badge
  const createPinIcon = (status: string, severity: number, complaintCount: number = 1) => {
    const color = STATUS_COLORS[status] || '#ef4444';
    const severityData = SEVERITY_INFO[severity] || SEVERITY_INFO[2];
    const isEmergency = severity >= 4;
    const isClustered = complaintCount > 1;

    return L.divIcon({
      className: 'custom-complaint-pin',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transform: scale(${severityData.scale}); transform-origin: 50% 100%; transition: transform 0.2s ease;">
          ${
            isEmergency
              ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          ${
            isClustered
              ? `<div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap; pointer-events: none; letter-spacing: -0.2px;">${complaintCount} reports</div>`
              : ''
          }
          <svg viewBox="0 0 24 24" width="34" height="34" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3.2" fill="#ffffff"></circle>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32],
    });
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Lazy-load popup on marker click
  const handleMarkerClick = async (pin: PublicMapPin, marker: L.Marker) => {
    // Initial loading skeleton inside the popup
    const loadingHtml = `
      <div style="width: 270px; padding: 12px; font-family: system-ui, sans-serif;">
        <div style="width: 100%; height: 140px; border-radius: 8px; background: #e4e4e7; animation: pulse 1.5s infinite; margin-bottom: 10px;"></div>
        <div style="height: 14px; width: 60%; background: #e4e4e7; border-radius: 4px; margin-bottom: 8px; animation: pulse 1.5s infinite;"></div>
        <div style="height: 12px; width: 90%; background: #e4e4e7; border-radius: 4px; animation: pulse 1.5s infinite;"></div>
      </div>
    `;

    const popup = L.popup({
      closeButton: true,
      autoPan: true,
      className: 'custom-leaflet-popup',
    }).setContent(loadingHtml);

    marker.bindPopup(popup).openPopup();

    try {
      const res = await fetch(`/api/complaints/${pin.id}/popup`);
      const data: ComplaintPopupResponse = await res.json();

      if (data.success && data.complaint) {
        const c = data.complaint;
        const color = STATUS_COLORS[c.status] || '#ef4444';
        const statusLabel = STATUS_LABELS[c.status] || c.status;
        const categoryLabel = CATEGORY_ICONS[c.category] || c.category;
        const severityData = SEVERITY_INFO[c.severity] || SEVERITY_INFO[2];

        const isClustered = typeof c.complaint_count === 'number' && c.complaint_count > 1;
        const attestations = Array.isArray(c.attestations) ? c.attestations : [];

        const validImageUrl = getValidReportImageUrl(c.image_url, c.category);
        const fallbackImg = CATEGORY_REPORT_IMAGES[c.category] || '/images/reports/road_pothole_1.webp';

        const contentHtml = `
          <div style="width: 285px; font-family: system-ui, -apple-system, sans-serif; overflow: hidden;">
            <div style="position: relative; width: 100%; height: 145px; background: #18181b; overflow: hidden;">
              <img
                src="${validImageUrl}"
                alt="${categoryLabel}"
                style="width: 100%; height: 100%; object-fit: cover; display: block;"
                onerror="this.src='${fallbackImg}'; this.onerror=null;"
              />
              <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); color: #fff; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                ${categoryLabel}
              </div>
              ${
                isClustered
                  ? `<div style="position: absolute; top: 8px; right: 8px; background: #0f172a; color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                      ${c.complaint_count} Reports Clustered
                    </div>`
                  : ''
              }
            </div>
            <div style="padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
              ${
                isClustered
                  ? `<div style="display: flex; align-items: center; justify-content: space-between; background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #2563eb;">
                      <span>👥 Clustered Ticket</span>
                      <span>${c.complaint_count} verified reports</span>
                    </div>`
                  : ''
              }

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: ${color};">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                  ${statusLabel}
                </span>
                <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.1);">
                  ${severityData.label}
                </span>
              </div>

              <div style="font-size: 12px; color: inherit; line-height: 1.4; display: flex; align-items: flex-start; gap: 4px;">
                <span style="opacity: 0.6; shrink: 0;">📍</span>
                <span style="font-weight: 500;">${c.address_text || 'GPS Position Recorded'}</span>
              </div>

              ${
                isClustered && attestations.length > 0
                  ? `<div style="border-top: 1px dashed rgba(128,128,128,0.25); padding-top: 6px; margin-top: 2px; display: flex; flex-direction: column; gap: 4px;">
                      <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px;">
                        Citizen Attestations (${attestations.length})
                      </div>
                      <div style="max-height: 80px; overflow-y: auto; display: flex; flex-direction: column; gap: 3px;">
                        ${attestations
                          .map(
                            (a: any) => `
                          <div style="font-size: 10px; display: flex; align-items: center; justify-content: space-between; padding: 3px 6px; background: rgba(0,0,0,0.04); border-radius: 4px;">
                            <span style="truncate max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                              📍 ${a.address_text || 'Neighboring report'}
                            </span>
                            <span style="opacity: 0.6; font-size: 9px; shrink: 0;">
                              ${formatDate(a.created_at)}
                            </span>
                          </div>`
                          )
                          .join('')}
                      </div>
                    </div>`
                  : ''
              }

              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; opacity: 0.65; border-top: 1px solid rgba(128,128,128,0.2); padding-top: 8px; margin-top: 2px;">
                <span>Reported: ${formatDate(c.created_at)}</span>
                <a
                  href="/complaint/${c.id}"
                  style="color: #2563eb; font-weight: 600; text-decoration: underline;"
                >
                  Inspect →
                </a>
              </div>
            </div>
          </div>
        `;
        popup.setContent(contentHtml);
      } else {
        popup.setContent(`
          <div style="padding: 14px; font-size: 12px; color: #ef4444;">
            Failed to load complaint details.
          </div>
        `);
      }
    } catch {
      popup.setContent(`
        <div style="padding: 14px; font-size: 12px; color: #ef4444;">
          Unable to load preview data.
        </div>
      `);
    }
  };

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

      // Add OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Add Attribution in corner
      L.control
        .attribution({
          position: 'bottomright',
          prefix: '<span class="text-[10px] text-muted-foreground opacity-75">© OpenStreetMap contributors</span>',
        })
        .addTo(map);

      // Initialize Leaflet.markercluster with required zoom threshold
      // At zoom < 14, nearby complaints cluster into a single numbered marker.
      // At zoom >= 14, individual pins appear.
      const clusterGroup = L.markerClusterGroup({
        disableClusteringAtZoom: 14,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const childCount = cluster.getChildCount();
          return L.divIcon({
            html: `
              <div class="custom-marker-cluster">
                <div class="custom-marker-cluster-inner">
                  ${childCount}
                </div>
              </div>
            `,
            className: '',
            iconSize: L.point(40, 40),
          });
        },
      });

      map.addLayer(clusterGroup);

      mapInstanceRef.current = map;
      clusterGroupRef.current = clusterGroup;
    }

    return () => {
      // Map cleanup handled on unmount
    };
  }, [initialCenter, initialZoom]);

  // Update Markers whenever pins change
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    const map = mapInstanceRef.current;
    if (!clusterGroup || !map) return;

    clusterGroup.clearLayers();

    if (pins.length === 0) return;

    const markers: L.Marker[] = [];
    const latLngBounds: [number, number][] = [];

    pins.forEach((pin) => {
      if (typeof pin.location?.lat !== 'number' || typeof pin.location?.lng !== 'number') return;

      const marker = L.marker([pin.location.lat, pin.location.lng], {
        icon: createPinIcon(pin.status, pin.severity, pin.complaint_count),
      });

      marker.on('click', () => {
        handleMarkerClick(pin, marker);
      });

      markers.push(marker);
      latLngBounds.push([pin.location.lat, pin.location.lng]);
    });

    clusterGroup.addLayers(markers);

    // Auto-fit bounds if markers exist and bounds are valid
    if (latLngBounds.length > 0) {
      try {
        const bounds = L.latLngBounds(latLngBounds);
        // Only fit if bounds have valid area and this is first load or significant change
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 15,
          });
        }
      } catch {
        // Fallback keep default view
      }
    }
  }, [pins]);

  // Component cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterGroupRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
