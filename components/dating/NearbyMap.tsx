'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveMediaSrc } from '@/lib/media/url';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

type NearbyLabels = {
  emptyMap: string;
  fuzzLabel: string;
  fuzzValue: string;
  geoDenied: string;
  geoUnavailable: string;
  loadError: string;
  locating: string;
  mapLive: string;
  membersCount: string;
  openProfile: string;
  sharingOff: string;
  sharingOn: string;
  startSharing: string;
  stopSharing: string;
  you: string;
};

export type NearbyMapMember = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  profileIcon: string | null;
  isPremium: boolean;
  lat: number;
  lng: number;
  fuzzM: number;
};

type MeStatus = {
  sharing: boolean;
  fuzzM: number;
  updatedAt: string | null;
};

type Props = {
  locale: Locale;
  labels: NearbyLabels;
  username: string;
  avatar: string | null;
  initialMe: MeStatus;
};

const TBILISI = { lat: 41.7151, lng: 44.8271 };
const POLL_MS = 25_000;

function fuzzDisplay(labels: NearbyLabels, n: number) {
  return labels.fuzzValue.replace('{n}', String(n));
}

function membersCountLabel(labels: NearbyLabels, n: number) {
  return labels.membersCount.replace('{n}', String(n));
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markerHtml(opts: {
  label: string;
  avatar: string | null;
  isSelf?: boolean;
  isPremium?: boolean;
}) {
  const initial = escapeHtml((opts.label[0] ?? '?').toUpperCase());
  const img = opts.avatar
    ? `<img src="${escapeHtml(resolveMediaSrc(opts.avatar) || "")}" alt="" />`
    : `<span>${initial}</span>`;
  const classes = [
    'nearby-marker',
    opts.isSelf ? 'nearby-marker--self' : '',
    opts.isPremium ? 'nearby-marker--premium' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<div class="${classes}">${img}</div>`;
}

export function NearbyMap({
  locale,
  labels,
  username,
  avatar,
  initialMe,
}: Props) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const selfMarkerRef = useRef<LeafletMarker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const fuzzRef = useRef(initialMe.fuzzM);
  const sharingRef = useRef(initialMe.sharing);

  const [sharing, setSharing] = useState(initialMe.sharing);
  const [fuzzM, setFuzzM] = useState(initialMe.fuzzM);
  const [members, setMembers] = useState<NearbyMapMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfPos, setSelfPos] = useState<{ lat: number; lng: number } | null>(null);

  fuzzRef.current = fuzzM;
  sharingRef.current = sharing;

  const syncMarkers = useCallback(
    async (list: NearbyMapMember[]) => {
      const L = (await import('leaflet')).default;
      const group = markersRef.current;
      if (!group) return;
      group.clearLayers();

      for (const m of list) {
        const icon = L.divIcon({
          className: 'nearby-marker-wrap',
          html: markerHtml({
            label: m.displayName || m.username,
            avatar: m.avatar,
            isPremium: m.isPremium,
          }),
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        const marker = L.marker([m.lat, m.lng], { icon });
        const href = localePath(locale, `/u/${m.username}/`);
        marker.bindPopup(
          `<div class="nearby-popup">
            <strong>${escapeHtml(m.displayName || m.username)}</strong>
            <a href="${escapeHtml(href)}">${escapeHtml(labels.openProfile)}</a>
          </div>`,
        );
        group.addLayer(marker);
      }
    },
    [labels.openProfile, locale],
  );

  const placeSelfMarker = useCallback(
    async (lat: number, lng: number) => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current;
      if (!map) return;

      const icon = L.divIcon({
        className: 'nearby-marker-wrap',
        html: markerHtml({
          label: username,
          avatar,
          isSelf: true,
        }),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      if (selfMarkerRef.current) {
        selfMarkerRef.current.setLatLng([lat, lng]);
        selfMarkerRef.current.setIcon(icon);
      } else {
        selfMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
          .bindPopup(`<div class="nearby-popup"><strong>${escapeHtml(labels.you)}</strong></div>`)
          .addTo(map);
      }
      map.setView([lat, lng], Math.max(map.getZoom(), 13), { animate: true });
    },
    [avatar, labels.you, username],
  );

  const postLocation = useCallback(
    async (lat: number, lng: number, fuzz: number) => {
      const res = await fetch('/api/v1/nearby/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lat, lng, fuzzM: fuzz }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { self?: MeStatus; members?: NearbyMapMember[] };
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error('post_failed');
      }
      if (json.data.self) {
        setSharing(json.data.self.sharing);
        setFuzzM(json.data.self.fuzzM);
      }
      // POST returns self only — refresh members
      const listRes = await fetch('/api/v1/nearby/', { credentials: 'include', cache: 'no-store' });
      const listJson = (await listRes.json()) as {
        ok?: boolean;
        data?: { members?: NearbyMapMember[] };
      };
      const list = listJson.data?.members ?? [];
      setMembers(list);
      await syncMarkers(list);
      return json;
    },
    [syncMarkers],
  );

  const fetchMembers = useCallback(async () => {
    const res = await fetch('/api/v1/nearby/', { cache: 'no-store', credentials: 'include' });
    if (!res.ok) {
      if (res.status === 401) return;
      return;
    }
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { self?: MeStatus; members?: NearbyMapMember[] };
    };
    if (!json.ok || !json.data) return;
    if (json.data.self) {
      setSharing(json.data.self.sharing);
      setFuzzM(json.data.self.fuzzM);
    }
    const list = json.data.members ?? [];
    setMembers(list);
    await syncMarkers(list);
  }, [syncMarkers]);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapElRef.current || mapRef.current) return;

      map = L.map(mapElRef.current, {
        center: [TBILISI.lat, TBILISI.lng],
        zoom: 12,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      try {
        await fetchMembers();
      } catch {
        if (!cancelled) setError(labels.loadError);
      }

      // Resume GPS watch if sharing was already on (permission usually remembered).
      if (!cancelled && initialMe.sharing && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setSelfPos({ lat, lng });
            void postLocation(lat, lng, fuzzRef.current).catch(() => undefined);
            clearWatch();
            watchIdRef.current = navigator.geolocation.watchPosition(
              (next) => {
                const nLat = next.coords.latitude;
                const nLng = next.coords.longitude;
                setSelfPos({ lat: nLat, lng: nLng });
                if (!sharingRef.current) return;
                void postLocation(nLat, nLng, fuzzRef.current).catch(() => undefined);
              },
              () => undefined,
              { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
            );
          },
          () => undefined,
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
        );
      }
    })();

    return () => {
      cancelled = true;
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      selfMarkerRef.current = null;
      markersRef.current = null;
      if (map) {
        map.remove();
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  // Keep self marker in sync
  useEffect(() => {
    if (selfPos) {
      void placeSelfMarker(selfPos.lat, selfPos.lng);
    }
  }, [selfPos, placeSelfMarker]);

  // Poll while sharing
  useEffect(() => {
    if (!sharing) return;
    const id = window.setInterval(() => {
      void fetchMembers().catch(() => {
        /* ignore transient poll errors */
      });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [sharing, fetchMembers]);

  const startSharing = async () => {
    setError(null);
    if (!navigator.geolocation) {
      setError(labels.geoUnavailable);
      return;
    }
    setBusy(true);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelfPos({ lat, lng });
        setLocating(false);
        try {
          await postLocation(lat, lng, fuzzRef.current);
          clearWatch();
          watchIdRef.current = navigator.geolocation.watchPosition(
            (next) => {
              const nLat = next.coords.latitude;
              const nLng = next.coords.longitude;
              setSelfPos({ lat: nLat, lng: nLng });
              if (!sharingRef.current) return;
              void postLocation(nLat, nLng, fuzzRef.current).catch(() => {
                /* throttled / transient */
              });
            },
            () => {
              /* keep last known */
            },
            { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
          );
        } catch {
          setError(labels.loadError);
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setLocating(false);
        setBusy(false);
        setError(err.code === 1 ? labels.geoDenied : labels.geoUnavailable);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 },
    );
  };

  const stopSharing = async () => {
    setBusy(true);
    setError(null);
    clearWatch();
    try {
      const res = await fetch('/api/v1/nearby/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop: true }),
      });
      if (!res.ok) throw new Error('stop_failed');
      setSharing(false);
      setMembers([]);
      await syncMarkers([]);
    } catch {
      setError(labels.loadError);
    } finally {
      setBusy(false);
    }
  };

  const onFuzzChange = async (value: number) => {
    setFuzzM(value);
    fuzzRef.current = value;
    if (!sharing || !selfPos) return;
    try {
      await postLocation(selfPos.lat, selfPos.lng, value);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="nearby-app">
      <div className="nearby-app__toolbar">
        <div className="nearby-app__status">
          <span
            className={`nearby-app__live${sharing ? ' is-on' : ''}`}
            aria-hidden
          >
            {labels.mapLive}
          </span>
          <span className="nearby-app__status-text">
            {sharing ? labels.sharingOn : labels.sharingOff}
          </span>
          <span className="nearby-app__count">
            {membersCountLabel(labels, members.length)}
          </span>
        </div>

        <div className="nearby-app__fuzz">
          <label htmlFor="nearby-fuzz">
            {labels.fuzzLabel}: <strong>{fuzzDisplay(labels, fuzzM)}</strong>
          </label>
          <input
            id="nearby-fuzz"
            type="range"
            min={10}
            max={1000}
            step={10}
            value={fuzzM}
            disabled={busy}
            onChange={(e) => void onFuzzChange(Number(e.target.value))}
          />
        </div>

        <div className="nearby-app__actions">
          {sharing ? (
            <button
              type="button"
              className="btn btn--ghost"
              disabled={busy}
              onClick={() => void stopSharing()}
            >
              {labels.stopSharing}
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => void startSharing()}
            >
              {labels.startSharing}
            </button>
          )}
        </div>
      </div>

      {(locating || error) && (
        <p className={`nearby-app__hint${error ? ' nearby-app__hint--error' : ''}`}>
          {error ?? labels.locating}
        </p>
      )}

      {!sharing && !error && !locating && (
        <p className="nearby-app__hint">{labels.emptyMap}</p>
      )}

      <div className="nearby-app__map-shell">
        <div ref={mapElRef} className="nearby-app__map" role="presentation" />
      </div>
    </section>
  );
}
