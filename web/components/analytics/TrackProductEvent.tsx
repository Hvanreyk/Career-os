'use client';

import { useEffect, useRef } from 'react';

interface Props {
  eventName: 'resource_viewed' | 'lesson_viewed' | 'resume_workshop_opened';
  resourceSlug: string;
  properties?: Record<string, string | number | boolean | null>;
}

const STORAGE_KEY = 'trajectoryos_anonymous_id';

export function TrackProductEvent({ eventName, resourceSlug, properties = {} }: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    let anonymousId = window.localStorage.getItem(STORAGE_KEY);
    if (!anonymousId) {
      anonymousId = window.crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, anonymousId);
    }
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, resourceSlug, anonymousId, properties }),
      keepalive: true,
    }).catch(() => {
      // Analytics is deliberately non-blocking.
    });
  }, [eventName, properties, resourceSlug]);

  return null;
}
