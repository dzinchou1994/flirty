'use client';

import { useEffect } from 'react';

/**
 * Quietly renew session cookies while the tab is open so people are not
 * bounced to login mid-browse when the access cookie ages out.
 */
export function SessionKeepalive({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function ping() {
      if (cancelled || document.visibilityState === 'hidden') return;
      try {
        await fetch('/api/v1/auth/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: '{}',
        });
      } catch {
        /* offline / transient — next tick retries */
      }
    }

    void ping();
    const id = window.setInterval(() => void ping(), 6 * 60 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void ping();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return null;
}
