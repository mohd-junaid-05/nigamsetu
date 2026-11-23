import { Suspense } from 'react';
import { Metadata } from 'next';
import { PublicMapContainer } from '@/components/map/PublicMapContainer';
import { MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Public Infrastructure Map | NigamSetu',
  description: 'Live interactive map of civic infrastructure complaints verified by AI vision and PostGIS geospatial clustering.',
};

export default function PublicMapPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Compact Gov-style page header + breadcrumb */}
      <div className="bg-[#071D49] dark:bg-black border-b border-[#FFB81D]/40 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <nav aria-label="breadcrumb" className="flex items-center gap-1 text-[11px] text-white/60">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3 text-white/40" />
              <span className="text-[#FFB81D] font-semibold">Public Map</span>
            </nav>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="text-xs font-bold text-white tracking-tight hidden sm:inline">
              Hyderabad Municipal Infrastructure Map (GHMC)
            </span>
          </div>
          <span className="text-[10px] text-white/60 font-mono hidden md:inline">
            Live GIS incident pins · Public read-only
          </span>
        </div>
      </div>

      {/* Full-screen map */}
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-surface text-muted-foreground animate-pulse text-sm min-h-[calc(100vh-180px)]">
            <div className="flex flex-col items-center gap-2">
              <MapPin className="w-8 h-8 opacity-30" />
              <span>Loading Public Map…</span>
            </div>
          </div>
        }
      >
        <div className="flex-1" style={{ minHeight: 'calc(100vh - 180px)' }}>
          <PublicMapContainer viewMode="fullscreen" />
        </div>
      </Suspense>
    </div>
  );
}
