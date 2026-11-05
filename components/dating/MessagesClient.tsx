'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Locale } from '@/lib/i18n/types';

export type InboxLabels = {
  empty: string;
  emptyHint: string;
  loading: string;
};

type Thread = {
  peerId: string;
  username: string;
  name: string | null;
  avatar: string | null;
  lastBody: string;
  lastAt: string;
};

export function MessagesClient({
  locale,
  labels,
}: {
  locale: Locale;
  labels: InboxLabels;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<{ items: Thread[] }>('/api/v1/messages').then((res) => {
      if (cancelled) return;
      if (res.ok) setThreads(res.data.items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="dating-inbox__status">{labels.loading}</p>;

  if (threads.length === 0) {
    return (
      <div className="dating-inbox__empty">
        <p className="dating-inbox__status">{labels.empty}</p>
        <p className="dating-inbox__hint">{labels.emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className="dating-inbox">
      {threads.map((t) => (
        <li key={t.peerId}>
          <Link
            href={`/${locale}/gatsnoba/messages/${t.peerId}/`}
            className="dating-inbox__row"
          >
            <span className="dating-inbox__avatar">
              {t.avatar ? <img src={t.avatar} alt="" loading="lazy" /> : null}
            </span>
            <span className="dating-inbox__text">
              <strong className="dating-inbox__name">{t.name || t.username}</strong>
              <span className="dating-inbox__preview">{t.lastBody}</span>
            </span>
            <time className="dating-inbox__time" dateTime={t.lastAt}>
              {new Date(t.lastAt).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
