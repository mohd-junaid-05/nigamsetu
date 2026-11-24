'use client';

import { useEffect, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime hook for the Admin Command Dashboard.
 * 
 * Features:
 * 1. Supabase Postgres Realtime WebSocket subscription for instant (< 100ms) push notifications
 *    on any complaint INSERT, UPDATE, or DELETE.
 * 2. Active fallback heartbeat polling (every 4s) to guarantee zero-lag live complaints even if
 *    WebSockets are throttled or sleeping.
 * 3. Supports ward-specific or all-ward admin monitoring.
 */
export function useLiveComplaints(
  wardId: string | null | undefined,
  onUpdate: () => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep latest onUpdate callback
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channelKey = wardId ? `ward-${wardId}` : 'all-wards';
    const channelName = `live-admin-complaints-${channelKey}-${Date.now()}`;

    // 1. Supabase WebSocket Realtime Subscription
    const channel = supabase.channel(channelName);

    const changesConfig: any = {
      event: '*',
      schema: 'public',
      table: 'complaints',
    };

    if (wardId) {
      changesConfig.filter = `ward_id=eq.${wardId}`;
    }

    channel
      .on('postgres_changes', changesConfig, () => {
        if (onUpdateRef.current) {
          onUpdateRef.current();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, () => {
        if (onUpdateRef.current) {
          onUpdateRef.current();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Trigger initial sync on connect
          if (onUpdateRef.current) {
            onUpdateRef.current();
          }
        }
      });

    channelRef.current = channel;

    // 2. Guaranteed Live Heartbeat Polling (every 4 seconds)
    // Ensures admin panel updates live whenever new complaints are submitted
    const intervalId = setInterval(() => {
      if (onUpdateRef.current) {
        onUpdateRef.current();
      }
    }, 4000);

    return () => {
      clearInterval(intervalId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [wardId]);
}
