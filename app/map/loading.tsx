import React from 'react';
import { Loader2, MapPin } from 'lucide-react';

export default function MapLoading() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-surface relative">
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm z-10">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-3">
          <MapPin className="w-6 h-6 animate-bounce" />
        </div>
        <p className="text-sm font-bold text-foreground">Loading Public City Infrastructure Map...</p>
        <p className="text-xs text-muted-foreground mt-1">Retrieving 30+ civic complaint pins and ward boundaries</p>
      </div>
    </div>
  );
}
