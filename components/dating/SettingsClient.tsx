'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import type { DatingDict } from '@/lib/i18n/dating-dict';

type Labels = DatingDict['settingsPage'];

export function SettingsClient({ labels, byeHref }: { labels: Labels; byeHref: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await api('/api/v1/me/account/', {
      method: 'DELETE',
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      window.setTimeout(() => window.location.replace(byeHref), 1500);
    } else {
      setError(labels.failed);
    }
  }

  return (
    <section className="settings-card" aria-labelledby="settings-delete-title">
      <h2 id="settings-delete-title" className="settings-card__title">
        {labels.deleteTitle}
      </h2>
      <p className="settings-card__lead">{labels.deleteLead}</p>

      {done ? (
        <p className="settings-card__done" role="status">
          {labels.done}
        </p>
      ) : (
        <form className="auth-form" onSubmit={(e) => void deleteAccount(e)}>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="settings-username">
              {labels.username}
            </label>
            <input
              id="settings-username"
              className="auth-input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <span className="auth-field__hint">{labels.usernameHint}</span>
          </div>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="settings-password">
              {labels.password}
            </label>
            <input
              id="settings-password"
              className="auth-input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="settings-card__danger" type="submit" disabled={busy}>
            {busy ? labels.busy : labels.submit}
          </button>
        </form>
      )}
    </section>
  );
}
