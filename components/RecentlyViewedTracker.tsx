'use client';

import { useEffect } from 'react';
import { useRecentlyViewed, type RecentlyViewedItem } from '@/lib/useRecentlyViewed';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'mundotech:sid';
  let sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(KEY, sid);
  }
  return sid;
}

export default function RecentlyViewedTracker(props: Omit<RecentlyViewedItem, 'ts'>) {
  const { trackView } = useRecentlyViewed();

  useEffect(() => {
    // 1. Persistir en localStorage para "Recientemente vistos" en UI
    trackView(props);

    // 2. Enviar evento al servidor (fire-and-forget, no bloquea)
    const sessionId = getOrCreateSessionId();
    fetch('/api/events/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: props.id, sessionId }),
      keepalive: true, // sobrevive a navegaciones
    }).catch(() => {}); // silencioso ante fallo de red
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);

  return null;
}
