import { Suspense } from 'react';
import { Metadata } from 'next';
import { PublicMapContainer } from '@/components/map/PublicMapContainer';

export const metadata: Metadata = {
  title: 'Public Infrastructure Map | NigamSetu',
  description: 'Live interactive map of civic infrastructure complaints verified by AI vision and PostGIS geospatial clustering.',
};

export default function PublicMapPage() {
  return (
    <main className="w-full flex-1 flex flex-col min-h-screen">
      <Suspense
        fallback={
          <div className="w-full h-[calc(100vh-65px)] flex items-center justify-center bg-surface text-muted-foreground animate-pulse text-sm">
            Loading Public Map...
          </div>
        }
      >
        <PublicMapContainer viewMode="fullscreen" />
      </Suspense>
    </main>
  );
}
