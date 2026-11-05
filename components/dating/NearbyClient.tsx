'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

export function NearbyClient() {
  const [status, setStatus] = useState<string>('idle');
  const [members, setMembers] = useState<{ username: string; lat: number; lng: number; fuzzM: number }[]>([]);

  async function refresh() {
    const res = await api<{ members: typeof members; self: { sharing: boolean } }>('/api/v1/nearby/');
    if (!res.ok) {
      setStatus(res.error.code);
      return;
    }
    setMembers(res.data.members);
    setStatus(res.data.self.sharing ? 'sharing' : 'off');
  }

  useEffect(() => { void refresh(); }, []);

  function share() {
    if (!navigator.geolocation) {
      setStatus('NO_GEO');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const res = await api('/api/v1/nearby/', {
        method: 'POST',
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          fuzzM: 100,
        }),
      });
      setStatus(res.ok ? 'sharing' : res.error.code);
      void refresh();
    });
  }

  async function stop() {
    await api('/api/v1/nearby/', { method: 'POST', body: JSON.stringify({ stop: true }) });
    void refresh();
  }

  return (
    <div>
      <p className="muted">სტატუსი: {status}</p>
      <button type="button" className="btn" onClick={share}>გაზიარება</button>
      <button type="button" className="btn secondary" style={{ marginLeft: 8 }} onClick={() => void stop()}>გამორთვა</button>
      <ul>
        {members.map((m) => (
          <li key={m.username}>{m.username} · ±{m.fuzzM}მ</li>
        ))}
      </ul>
    </div>
  );
}
