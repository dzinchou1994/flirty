'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';

type Item = {
  id: string;
  username: string;
  name: string | null;
  age: number | null;
  bio: string;
  photos: { url: string }[];
  city: string;
};

export function FeedClient({ bucket }: { bucket?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(next?: string | null) {
    setLoading(true);
    const qs = new URLSearchParams();
    if (bucket && bucket !== 'all') qs.set('bucket', bucket);
    if (next) qs.set('cursor', next);
    qs.set('limit', '12');
    const res = await api<{ items: Item[]; nextCursor: string | null }>(`/api/v1/feed/?${qs}`);
    setLoading(false);
    if (!res.ok) {
      setError(res.error.code);
      return;
    }
    setItems((prev) => (next ? [...prev, ...res.data.items] : res.data.items));
    setCursor(res.data.nextCursor);
    setError(null);
  }

  useEffect(() => {
    void load(null);
  }, [bucket]);

  async function like(profileId: string) {
    const res = await api<{ matched: boolean }>('/api/v1/likes/', {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    });
    if (!res.ok) setError(res.error.code);
    else if (res.data.matched) setError(null);
  }

  if (error === 'UNAUTHORIZED' || error === 'PROFILE_LOCKED') {
    return (
      <p className="muted">
        {error === 'UNAUTHORIZED' ? (
          <>შესვლა საჭიროა. <Link href="../shesvla/">შედი</Link></>
        ) : (
          <>ჯერ შექმენი პროფილი ფოტოთი და ბიოთი. <Link href="../user/dating/">პროფილი</Link></>
        )}
      </p>
    );
  }

  return (
    <div className="card-list">
      {error && <p className="muted">შეცდომა: {error}</p>}
      {items.map((p) => (
        <div className="profile-row" key={p.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photos[0]?.url || ''} alt="" />
          <div>
            <Link href={`./${p.username}/`}>
              <strong>{p.name || p.username}</strong>
              {p.age ? `, ${p.age}` : ''}
            </Link>
            <div className="muted">{p.city}</div>
            <p>{p.bio.slice(0, 140)}</p>
            <button type="button" className="btn" onClick={() => void like(p.id)}>
              Like
            </button>
          </div>
        </div>
      ))}
      {loading && <p className="muted">იტვირთება…</p>}
      {cursor && !loading && (
        <button type="button" className="btn secondary" onClick={() => void load(cursor)}>
          მეტი
        </button>
      )}
    </div>
  );
}
