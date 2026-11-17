'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { DatingEmptyState } from './DatingEmptyState';
import type { Locale } from '@/lib/i18n/types';

export type LikesLabels = {
  title: string;
  received: string;
  sent: string;
  views: string;
  emptyReceived: string;
  emptySent: string;
  emptyViews: string;
  emptyCtaProfile: string;
  emptyCtaBrowse: string;
  openChat: string;
  loading: string;
  loadMore: string;
};

type Tab = 'received' | 'sent' | 'views';

type Row = {
  key: string;
  userId: string | null;
  username: string;
  name: string | null;
  photoUrl: string | null;
  at: string;
};

type LikeReceived = {
  likedAt: string;
  userId: string;
  username: string;
  profileId: string;
  photoUrl: string | null;
  name: string | null;
};

type LikeSent = {
  likedAt: string;
  profile: {
    id: string;
    userId: string;
    username: string;
    name: string | null;
    photos: { url: string }[];
  };
};

type ViewRow = {
  userId: string;
  username: string;
  name: string | null;
  photoUrl: string | null;
  viewedAt: string;
};

type Page<T> = { items: T[]; nextCursor: string | null };

export function LikesClient({
  locale,
  labels,
}: {
  locale: Locale;
  labels: LikesLabels;
}) {
  const [tab, setTab] = useState<Tab>('received');
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (which: Tab, after: string | null) => {
    setLoading(true);
    const qs = after ? `&cursor=${encodeURIComponent(after)}` : '';
    let next: Row[] = [];
    let nextCursor: string | null = null;

    if (which === 'views') {
      const res = await api<Page<ViewRow>>(`/api/v1/views/?_=1${qs}`);
      if (res.ok) {
        next = res.data.items.map((v) => ({
          key: `${v.userId}:${v.viewedAt}`,
          userId: v.userId,
          username: v.username,
          name: v.name,
          photoUrl: v.photoUrl,
          at: v.viewedAt,
        }));
        nextCursor = res.data.nextCursor;
      }
    } else if (which === 'sent') {
      const res = await api<Page<LikeSent>>(`/api/v1/likes?dir=sent${qs}`);
      if (res.ok) {
        next = res.data.items.map((l) => ({
          key: l.profile.id,
          userId: l.profile.userId,
          username: l.profile.username,
          name: l.profile.name,
          photoUrl: l.profile.photos?.[0]?.url ?? null,
          at: l.likedAt,
        }));
        nextCursor = res.data.nextCursor;
      }
    } else {
      const res = await api<Page<LikeReceived>>(`/api/v1/likes?dir=received${qs}`);
      if (res.ok) {
        next = res.data.items.map((l) => ({
          key: l.profileId,
          userId: l.userId,
          username: l.username,
          name: l.name,
          photoUrl: l.photoUrl,
          at: l.likedAt,
        }));
        nextCursor = res.data.nextCursor;
      }
    }

    setRows((prev) => (after ? [...prev, ...next] : next));
    setCursor(nextCursor);
    setLoading(false);
  }, []);

  useEffect(() => {
    setRows([]);
    setCursor(null);
    void load(tab, null);
  }, [tab, load]);

  const emptyText =
    tab === 'received'
      ? labels.emptyReceived
      : tab === 'sent'
        ? labels.emptySent
        : labels.emptyViews;

  return (
    <div className="dating-likes">
      <div className="dating-segmented" role="tablist" aria-label={labels.title}>
        {(['received', 'sent', 'views'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`dating-segmented__btn${tab === t ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {labels[t]}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <p className="dating-likes__status">{labels.loading}</p>
      ) : rows.length === 0 ? (
        <DatingEmptyState
          icon={tab === 'views' ? 'eye' : 'heart'}
          title={emptyText}
          // Nobody liked you / viewed you yet -> improve your profile.
          // You liked nobody yet -> go browse.
          ctaHref={tab === 'sent' ? `/${locale}/` : `/${locale}/user/dating/`}
          ctaLabel={tab === 'sent' ? labels.emptyCtaBrowse : labels.emptyCtaProfile}
        />
      ) : (
        <ul className="dating-likes__grid">
          {rows.map((row) => (
            <li key={row.key} className="dating-likes__item">
              <Link
                href={`/${locale}/gatsnoba/${row.username}/`}
                className="dating-likes__tile"
              >
                {row.photoUrl ? (
                  <img src={row.photoUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="dating-likes__nophoto" aria-hidden />
                )}
                <span className="dating-likes__name">{row.name || row.username}</span>
              </Link>
              {row.userId ? (
                <Link
                  href={`/${locale}/gatsnoba/messages/${row.userId}/`}
                  className="dating-likes__chat"
                >
                  {labels.openChat}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {cursor ? (
        <button
          type="button"
          className="dating-likes__more"
          onClick={() => void load(tab, cursor)}
          disabled={loading}
        >
          {loading ? labels.loading : labels.loadMore}
        </button>
      ) : null}
    </div>
  );
}
