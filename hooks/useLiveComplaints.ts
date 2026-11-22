'use client';

import { useEffect, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useLiveComplaints(
  wardId: string | null | undefined,
  onUpdate: () => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!wardId) return;

    const supabase = createBrowserSupabaseClient();
    const channelName = `live-ward-complaints-${wardId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
          filter: `ward_id=eq.${wardId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [wardId, onUpdate]);
}
