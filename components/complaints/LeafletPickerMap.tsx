'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletPickerMapProps {
  lat: number;
  lng: number;
  onPositionChange: (newLat: number, newLng: number) => void;
}

export default function LeafletPickerMap({
  lat,
  lng,
  onPositionChange,
}: LeafletPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Custom SVG Pin Icon
  const createPinIcon = () => {
    return L.divIcon({
      className: 'custom-leaflet-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; items-align: center; justify-content: center; cursor: grab;">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="#ef4444" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: createPinIcon(),
      }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onPositionChange(position.lat, position.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onPositionChange(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom(), { animate: true });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    return () => {
      // Optional: keep map instance or clean up on unmount
    };
  }, [lat, lng, onPositionChange]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-56 rounded-xl overflow-hidden border border-border shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 z-[1000] bg-surface-card/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border text-[10px] font-medium text-foreground shadow-sm">
        Tap map or drag pin to position
      </div>
    </div>
  );
}
