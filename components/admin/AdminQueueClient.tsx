'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

export function AdminQueueClient() {
  const [data, setData] = useState<{
    slaHours: number;
    pendingPhotos: { id: string; url: string | null; username: string }[];
    reports: { id: string; reason: string; username: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await api<NonNullable<typeof data>>('/api/v1/admin/queue/');
      if (!res.ok) setError(res.error.code);
      else setData(res.data);
    })();
  }, []);

  if (error) return <p className="muted">{error}</p>;
  if (!data) return <p className="muted">იტვირთება…</p>;

  return (
    <div>
      <p className="muted">SLA: {data.slaHours}h</p>
      <h2>ფოტოები</h2>
      <ul>
        {data.pendingPhotos.map((p) => (
          <li key={p.id}>{p.username} — {p.url}</li>
        ))}
      </ul>
      <h2>რეპორტები</h2>
      <ul>
        {data.reports.map((r) => (
          <li key={r.id}>{r.username}: {r.reason}</li>
        ))}
      </ul>
    </div>
  );
}
