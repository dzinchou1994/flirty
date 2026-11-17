'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DatingProfileCard } from '@/components/dating/DatingProfileCard';
import type { DatingProfileView } from '@/lib/dating/shared';
import { hydrateDatingProfile, type DatingProfilePayload } from '@/lib/dating/shared';
import type { DatingCity, DatingGenderBucket, DatingShowMe } from '@/lib/dating/presets';
import type { Locale } from '@/lib/i18n/types';

type CardMessages = {
  genderLabels: Record<DatingGenderBucket, string>;
  showMeLabels: Record<DatingShowMe, string>;
  cityLabels: Record<DatingCity, string>;
  distanceBuckets?: Record<'<1km' | '1-3km' | '3-10km' | '10km+', string>;
  viewProfile: string;
  noPhoto: string;
  datingSublabel?: string;
  onlineNow?: string;
  like?: string;
  unlike?: string;
  liked?: string;
  matchTitle?: string;
  matchBody?: string;
  matchCta?: string;
  matchClose?: string;
};

type Props = {
  locale: Locale;
  initialProfiles: DatingProfileView[];
  initialHasMore: boolean;
  /** Cursor after the server-rendered first page. Without it the first
      scroll re-requests page one and appends nothing. */
  initialCursor?: string | null;
  pageSize: number;
  bucket: DatingGenderBucket | null;
  city: DatingCity | null;
  viewAll: boolean;
  /** Full discovery query string (without leading ?). Prefer over bucket/city. */
  feedQuery?: string;
  likedProfileIds: string[];
  locked: boolean;
  loadMoreLabel: string;
  empty: ReactNode;
  messages: CardMessages;
};

export function DatingInfiniteGrid({
  locale,
  initialProfiles,
  initialHasMore,
  initialCursor = null,
  pageSize,
  bucket,
  city,
  viewAll,
  feedQuery = '',
  likedProfileIds,
  locked,
  loadMoreLabel,
  empty,
  messages,
}: Props) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlight = useRef(false);
  const pageRef = useRef(1);
  const cursorRef = useRef<string | null>(initialCursor);
  const hasMoreRef = useRef(initialHasMore);
  /** Consecutive pages that added nothing; guards against an endless loop. */
  const emptyRunsRef = useRef(0);
  /** Consecutive rate-limited pages; retried with a pause, then given up. */
  const rateWaitsRef = useRef(0);
  const loadMoreRef = useRef<(() => Promise<void>) | null>(null);
  hasMoreRef.current = hasMore;

  useEffect(() => {
    setProfiles(initialProfiles);
    pageRef.current = 1;
    cursorRef.current = initialCursor;
    emptyRunsRef.current = 0;
    rateWaitsRef.current = 0;
    setHasMore(initialHasMore);
  }, [initialProfiles, initialHasMore, initialCursor]);

  const likedSet = new Set(likedProfileIds);

  const loadMore = useCallback(async () => {
    if (locked || !hasMoreRef.current || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams(feedQuery);
      params.set('limit', String(pageSize));
      if (!feedQuery) {
        if (viewAll) params.set('view', 'all');
        else if (bucket) params.set('bucket', bucket);
        if (city) params.set('city', city);
      }
      if (cursorRef.current) params.set('cursor', cursorRef.current);

      const res = await fetch(`/api/v1/feed/?${params.toString()}`, { credentials: 'include' });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: { code?: string };
        data?: { items?: DatingProfilePayload[]; nextCursor?: string | null };
      };

      // Discovery allows 60 requests a minute. Hitting that used to look
      // identical to "there is nothing left": hasMore went false, the
      // sentinel unmounted and the grid was dead for the rest of the page
      // view, stranding the user a few hundred profiles early. It is a
      // pause, not an end — wait out the window and carry on.
      if (res.status === 429 || data.error?.code === 'RATE_LIMITED') {
        rateWaitsRef.current += 1;
        if (rateWaitsRef.current <= 3) {
          inFlight.current = false;
          setLoading(false);
          window.setTimeout(() => void loadMoreRef.current?.(), 2500);
          return;
        }
        setHasMore(false);
        return;
      }
      rateWaitsRef.current = 0;

      if (!res.ok || !data.ok || !Array.isArray(data.data?.items)) {
        setHasMore(false);
        return;
      }

      const incoming = data.data.items.map(hydrateDatingProfile);
      let appended = 0;
      setProfiles((prev) => {
        const seen = new Set(prev.map((profile) => profile.id));
        const extra = incoming.filter((profile) => !seen.has(profile.id));
        appended = extra.length;
        return extra.length ? [...prev, ...extra] : prev;
      });
      cursorRef.current = data.data.nextCursor ?? null;
      setHasMore(Boolean(data.data.nextCursor) && incoming.length > 0);

      // If a page appended nothing (every row already on screen) the list
      // length does not change, so IntersectionObserver never fires again —
      // the sentinel is still intersecting and only reports transitions.
      // Pull the next page ourselves rather than stalling for good.
      if (appended === 0 && cursorRef.current) {
        emptyRunsRef.current += 1;
        if (emptyRunsRef.current <= 5) {
          inFlight.current = false;
          setLoading(false);
          void loadMoreRef.current?.();
          return;
        }
        setHasMore(false);
      } else {
        emptyRunsRef.current = 0;
      }
    } catch {
      setHasMore(false);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [bucket, city, feedQuery, locked, pageSize, viewAll]);

  loadMoreRef.current = loadMore;

  useEffect(() => {
    if (locked || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, locked, profiles.length]);

  if (profiles.length === 0) return <>{empty}</>;

  return (
    <>
      <div className={`dating-grid${locked ? ' dating-grid--blurred' : ''}`}>
        {profiles.map((profile, index) => (
          <div
            key={profile.id}
            className="dating-grid__item"
            style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
          >
            <DatingProfileCard
              profile={profile}
              locale={locale}
              liked={likedSet.has(profile.id)}
              showLike={!locked}
              blurred={locked && !(profile.isOnline && profile.photos.length === 0)}
              messages={messages}
            />
          </div>
        ))}
      </div>
      {!locked && hasMore ? (
        <div ref={sentinelRef} className="dating-feed-sentinel" aria-hidden>
          {loading ? <p className="dating-feed-sentinel__status">{loadMoreLabel}</p> : null}
        </div>
      ) : null}
    </>
  );
}
