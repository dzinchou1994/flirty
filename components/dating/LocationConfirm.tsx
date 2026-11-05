'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

export const LOCATION_NEED_KEY = 'dating:needLocation';

export type LocationConfirmLabels = {
  title: string;
  body: string;
  allow: string;
  later: string;
  denied: string;
  working: string;
};

type Props = {
  /** When false the sheet never opens (guests). */
  enabled: boolean;
  /** Open even without a fresh-login flag (e.g. missing geohash). */
  missingLocation?: boolean;
  labels: LocationConfirmLabels;
};

/**
 * After login, ask for GPS once per session. Declining (or a GPS error)
 * falls back to a point near the centre of the user's dating city.
 */
export function LocationConfirm({ enabled, missingLocation = false, labels }: Props) {
  const router = useRouter();
  const panelId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled || !mounted) return;
    try {
      const afterLogin = sessionStorage.getItem(LOCATION_NEED_KEY) === '1';
      if (afterLogin || missingLocation) {
        setOpen(true);
      }
    } catch {
      if (missingLocation) setOpen(true);
    }
  }, [enabled, missingLocation, mounted]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function finish(ok: boolean) {
    try {
      sessionStorage.removeItem(LOCATION_NEED_KEY);
    } catch {
      /* ignore */
    }
    setOpen(false);
    setBusy(false);
    if (ok) router.refresh();
  }

  async function useCityFallback() {
    setBusy(true);
    setError(null);
    const res = await api('/api/v1/nearby/', {
      method: 'POST',
      body: JSON.stringify({ cityFallback: true }),
    });
    if (!res.ok) {
      setBusy(false);
      setError(labels.denied);
      return;
    }
    await finish(true);
  }

  async function allow() {
    if (busy) return;
    setBusy(true);
    setError(null);

    if (!navigator.geolocation) {
      await useCityFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await api('/api/v1/nearby/', {
          method: 'POST',
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            fuzzM: 100,
          }),
        });
        if (!res.ok) {
          await useCityFallback();
          return;
        }
        await finish(true);
      },
      async () => {
        setError(labels.denied);
        await useCityFallback();
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="online-presence-layer" role="presentation">
      <button
        type="button"
        className="online-presence-layer__backdrop"
        aria-label={labels.later}
        disabled={busy}
        onClick={() => void useCityFallback()}
      />
      <div
        id={panelId}
        className="online-presence__sheet dating-intro-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${panelId}-title`}
      >
        <div className="online-presence__sheet-handle" aria-hidden />
        <div className="online-presence__panel-head">
          <h2 id={`${panelId}-title`} className="dating-intro-sheet__title">
            {labels.title}
          </h2>
        </div>
        <div className="dating-intro-sheet__body">
          <p>{labels.body}</p>
          {error ? <p className="dating-location-confirm__error">{error}</p> : null}
        </div>
        <div className="dating-location-confirm__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => void allow()}
          >
            {busy ? labels.working : labels.allow}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy}
            onClick={() => void useCityFallback()}
          >
            {labels.later}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
