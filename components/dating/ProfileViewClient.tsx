'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

export function ProfileViewClient({ username }: { username: string }) {
  const [data, setData] = useState<{
    name: string | null;
    age: number | null;
    bio: string;
    photos: { url: string }[];
    id: string;
    userId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await api<typeof data>(`/api/v1/profiles/${encodeURIComponent(username)}/`);
      if (!res.ok) setError(res.error.code);
      else setData(res.data);
    })();
  }, [username]);

  async function report() {
    if (!data) return;
    const res = await api('/api/v1/reports/', {
      method: 'POST',
      body: JSON.stringify({ profileId: data.id, reason: 'other' }),
    });
    setError(res.ok ? 'REPORTED' : res.error.code);
  }

  async function block() {
    if (!data) return;
    // need userId — fetch from profile response; add userId to serialize
    const res = await api('/api/v1/blocks/', {
      method: 'POST',
      body: JSON.stringify({ userId: data.userId }),
    });
    setError(res.ok ? 'BLOCKED' : res.error.code);
  }

  if (error && !data) return <p className="muted">{error}</p>;
  if (!data) return <p className="muted">იტვირთება…</p>;

  return (
    <div>
      <h1>{data.name || username}{data.age ? `, ${data.age}` : ''}</h1>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {data.photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p.url} alt="" height={240} style={{ borderRadius: 12 }} />
        ))}
      </div>
      <p>{data.bio}</p>
      <button type="button" className="btn secondary" onClick={() => void report()}>Report</button>
      <button type="button" className="btn secondary" style={{ marginLeft: 8 }} onClick={() => void block()}>Block</button>
      {error && <p className="muted">{error}</p>}
    </div>
  );
}
