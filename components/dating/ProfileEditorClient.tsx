'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

type Profile = {
  name: string | null;
  bio: string;
  age: number | null;
  city: string;
  genderBucket: string;
  showMe: string;
  isVisible: boolean;
  hideFromContacts: boolean;
  requireMutualInterest: boolean;
  photos: { id: string; url: string; status: string }[];
};

export function ProfileEditorClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const res = await api<Profile | null>('/api/v1/me/profile/');
    if (res.ok) setProfile(res.data ?? {
      name: '',
      bio: '',
      age: null,
      city: 'tbilisi',
      genderBucket: 'male',
      showMe: 'everyone',
      isVisible: false,
      hideFromContacts: false,
      requireMutualInterest: false,
      photos: [],
    });
  }

  useEffect(() => { void refresh(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const res = await api('/api/v1/me/profile/', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    setMsg(res.ok ? 'შენახულია' : res.error.code);
    if (res.ok) void refresh();
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/v1/me/photos/', { method: 'POST', body: fd, credentials: 'include' });
    const json = await res.json();
    setMsg(json.ok ? 'ფოტო ატვირთულია' : json.error?.code);
    void refresh();
  }

  if (!profile) return <p className="muted">იტვირთება…</p>;

  return (
    <form onSubmit={(e) => void save(e)}>
      <div className="field">
        <label>სახელი</label>
        <input value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
      </div>
      <div className="field">
        <label>ასაკი (18+)</label>
        <input
          type="number"
          min={18}
          max={99}
          value={profile.age ?? ''}
          onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : null })}
        />
      </div>
      <div className="field">
        <label>ბიო</label>
        <textarea rows={4} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
      </div>
      <div className="field">
        <label>ქალაქი</label>
        <select value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })}>
          {['tbilisi', 'batumi', 'kutaisi', 'gori', 'other'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <label className="field">
        <span><input type="checkbox" checked={profile.isVisible} onChange={(e) => setProfile({ ...profile, isVisible: e.target.checked })} /> ხილვადი</span>
      </label>
      <label className="field">
        <span><input type="checkbox" checked={profile.hideFromContacts} onChange={(e) => setProfile({ ...profile, hideFromContacts: e.target.checked })} /> დამალე კონტაქტებისგან</span>
      </label>
      <label className="field">
        <span><input type="checkbox" checked={profile.requireMutualInterest} onChange={(e) => setProfile({ ...profile, requireMutualInterest: e.target.checked })} /> მხოლოდ ორმხრივი ინტერესი</span>
      </label>
      <div className="field">
        <label>ფოტო</label>
        <input type="file" accept="image/*,.heic,.heif" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {profile.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" width={72} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />
          ))}
        </div>
      </div>
      {msg && <p className="muted">{msg}</p>}
      <button className="btn" type="submit">შენახვა</button>
    </form>
  );
}
