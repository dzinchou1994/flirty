'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';

export function SettingsClient() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await api('/api/v1/me/account/', {
      method: 'DELETE',
      body: JSON.stringify({ username, password }),
    });
    setMsg(res.ok ? 'ანგარიში წაშლილია (User erasure რიგშია)' : res.error.code);
  }

  return (
    <form onSubmit={(e) => void deleteAccount(e)}>
      <h2>ანგარიშის წაშლა</h2>
      <p className="muted">დეითინგ მონაცემები იშლება დაუყოვნებლივ. შესვლა აღარ იმუშავებს.</p>
      <div className="field">
        <label>მომხმარებელი (დასადასტურებლად)</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="field">
        <label>პაროლი</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {msg && <p className="muted">{msg}</p>}
      <button className="btn" type="submit">წაშლა</button>
    </form>
  );
}
