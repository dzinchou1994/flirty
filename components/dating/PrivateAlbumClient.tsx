'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { DATING_MAX_PHOTOS, DATING_PHOTO_MAX_BYTES } from '@/lib/dating/shared';
import { resolveMediaSrc } from '@/lib/media/url';
import type { Locale } from '@/lib/i18n/types';

export type AlbumLabels = {
  title: string;
  lead: string;
  privateBadge: string;
  publicBadge: string;
  makePrivate: string;
  makePublic: string;
  upload: string;
  uploading: string;
  uploadHint: string;
  empty: string;
  emptyHint: string;
  remove: string;
  shareTitle: string;
  shareLead: string;
  sharedWith: string;
  shareWith: string;
  revoke: string;
  noMatches: string;
  defaultPrivateNote: string;
  photoLimit: string;
  errors: {
    GENERIC: string;
    PHOTO_TOO_LARGE: string;
    PHOTO_LIMIT: string;
    PROFILE_REQUIRED: string;
    UNAUTHORIZED: string;
  };
};

type Photo = {
  id: string;
  url: string;
  sortOrder: number;
  status: string;
  visibility: 'public' | 'private';
};

type Peer = {
  userId: string;
  username: string;
  name: string | null;
  avatar: string | null;
  photoUrl: string | null;
};

type Grant = {
  viewerUserId: string;
  grantedAt: string;
  username?: string;
  name?: string | null;
  avatar?: string | null;
};

type Props = {
  locale: Locale;
  labels: AlbumLabels;
  initialPhotos: Photo[];
};

function LockIcon({ open = false }: { open?: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
        <path
          d="M8 11V8a4 4 0 0 1 7.5-2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="5"
          y="11"
          width="14"
          height="10"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function PrivateAlbumClient({ labels, initialPhotos }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Peer[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loadingShare, setLoadingShare] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const reloadShare = useCallback(async () => {
    setLoadingShare(true);
    const [m, g] = await Promise.all([
      api<{ items: Peer[] }>('/api/v1/matches/'),
      api<{ items: Grant[] }>('/api/v1/album/grants/'),
    ]);
    if (m.ok) setMatches(m.data.items);
    if (g.ok) setGrants(g.data.items);
    setLoadingShare(false);
  }, []);

  useEffect(() => {
    void reloadShare();
  }, [reloadShare]);

  function errText(code?: string) {
    if (!code) return labels.errors.GENERIC;
    return labels.errors[code as keyof typeof labels.errors] ?? labels.errors.GENERIC;
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length || uploading) return;
    if (photos.length >= DATING_MAX_PHOTOS) {
      setError(labels.photoLimit);
      return;
    }
    setError(null);
    setUploading(true);

    for (const file of Array.from(files)) {
      if (photos.length >= DATING_MAX_PHOTOS) break;
      if (file.size > DATING_PHOTO_MAX_BYTES) {
        setError(labels.errors.PHOTO_TOO_LARGE);
        continue;
      }
      const fd = new FormData();
      fd.set('file', file);
      fd.set('visibility', 'private');
      const res = await api<Photo>('/api/v1/me/photos/', { method: 'POST', body: fd });
      if (!res.ok) {
        setError(errText(res.error.code));
        break;
      }
      setPhotos((prev) => [...prev, res.data]);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  async function setVisibility(photoId: string, visibility: 'public' | 'private') {
    if (busyId) return;
    setBusyId(photoId);
    setError(null);
    const res = await api<{ id: string; visibility: 'public' | 'private' }>(
      '/api/v1/me/photos/',
      {
        method: 'PATCH',
        body: JSON.stringify({ photoId, visibility }),
      },
    );
    setBusyId(null);
    if (!res.ok) {
      setError(errText(res.error.code));
      return;
    }
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, visibility: res.data.visibility } : p)),
    );
    setActiveId(null);
    router.refresh();
  }

  async function removePhoto(photoId: string) {
    if (busyId) return;
    setBusyId(photoId);
    setError(null);
    const res = await api('/api/v1/me/photos/?photoId=' + encodeURIComponent(photoId), {
      method: 'DELETE',
    });
    setBusyId(null);
    if (!res.ok) {
      setError(errText(res.error.code));
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setActiveId(null);
    router.refresh();
  }

  async function grant(userId: string) {
    setBusyId(`grant:${userId}`);
    const res = await api('/api/v1/album/grants/', {
      method: 'POST',
      body: JSON.stringify({ viewerUserId: userId }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError(errText(res.error.code));
      return;
    }
    await reloadShare();
  }

  async function revoke(userId: string) {
    setBusyId(`revoke:${userId}`);
    const res = await api(
      '/api/v1/album/grants/?viewerUserId=' + encodeURIComponent(userId),
      { method: 'DELETE' },
    );
    setBusyId(null);
    if (!res.ok) {
      setError(errText(res.error.code));
      return;
    }
    await reloadShare();
  }

  const grantedIds = new Set(grants.map((g) => g.viewerUserId));
  const privateCount = photos.filter((p) => p.visibility === 'private').length;

  return (
    <div className="dating-album">
      <div className="dating-album__grid">
        {photos.map((photo) => {
          const src = resolveMediaSrc(photo.url) || photo.url;
          const isPrivate = photo.visibility === 'private';
          const acting = busyId === photo.id;
          const open = activeId === photo.id;
          return (
            <article
              key={photo.id}
              className={`dating-album__card${isPrivate ? ' is-private' : ' is-public'}${open ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="dating-album__thumb"
                onClick={() => setActiveId(open ? null : photo.id)}
                aria-expanded={open}
                aria-label={isPrivate ? labels.privateBadge : labels.publicBadge}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="dating-album__img" />
                <span className="dating-album__badge" aria-hidden>
                  <LockIcon open={!isPrivate} />
                </span>
              </button>

              {open ? (
                <div className="dating-album__actions">
                  <button
                    type="button"
                    className="dating-album__action"
                    disabled={acting}
                    onClick={() =>
                      void setVisibility(photo.id, isPrivate ? 'public' : 'private')
                    }
                  >
                    <LockIcon open={isPrivate} />
                    <span>{acting ? '…' : isPrivate ? labels.makePublic : labels.makePrivate}</span>
                  </button>
                  <button
                    type="button"
                    className="dating-album__action dating-album__action--danger"
                    disabled={acting}
                    onClick={() => void removePhoto(photo.id)}
                  >
                    {labels.remove}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}

        {photos.length < DATING_MAX_PHOTOS ? (
          <label className={`dating-album__add${uploading ? ' is-busy' : ''}`}>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => void onUpload(e.target.files)}
            />
            <span className="dating-album__add-plus" aria-hidden>
              +
            </span>
            <span>{uploading ? labels.uploading : labels.upload}</span>
          </label>
        ) : null}
      </div>

      {!photos.length ? (
        <div className="dating-album__empty">
          <p>{labels.empty}</p>
          <p>{labels.emptyHint}</p>
        </div>
      ) : (
        <p className="dating-album__meta">
          {labels.uploadHint
            .replace('{private}', String(privateCount))
            .replace('{total}', String(photos.length))}
        </p>
      )}

      <p className="dating-album__note">{labels.defaultPrivateNote}</p>

      {error ? <p className="dating-album__error">{error}</p> : null}

      <section className="dating-album__share" aria-labelledby="album-share-title">
        <div className="dating-album__share-head">
          <h2 id="album-share-title">{labels.shareTitle}</h2>
          <p>{labels.shareLead}</p>
        </div>

        {loadingShare ? (
          <p className="dating-album__loading">…</p>
        ) : (
          <>
            {grants.length > 0 ? (
              <div className="dating-album__peers">
                <h3 className="dating-album__subhead">{labels.sharedWith}</h3>
                <ul className="dating-album__peer-list">
                  {grants.map((g) => {
                    const peer =
                      matches.find((m) => m.userId === g.viewerUserId) || null;
                    const name =
                      g.name || peer?.name || g.username || peer?.username || g.viewerUserId;
                    const avatar = g.avatar || peer?.avatar || peer?.photoUrl;
                    return (
                      <li key={g.viewerUserId} className="dating-album__peer is-granted">
                        <span className="dating-album__peer-avatar" aria-hidden>
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveMediaSrc(avatar) || avatar} alt="" />
                          ) : (
                            String(name).slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <span className="dating-album__peer-name">{name}</span>
                        <button
                          type="button"
                          className="dating-album__peer-btn dating-album__peer-btn--ghost"
                          disabled={busyId === `revoke:${g.viewerUserId}`}
                          onClick={() => void revoke(g.viewerUserId)}
                        >
                          {labels.revoke}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="dating-album__peers">
              <h3 className="dating-album__subhead">{labels.shareWith}</h3>
              {!matches.length ? (
                <p className="dating-album__muted">{labels.noMatches}</p>
              ) : (
                <ul className="dating-album__peer-list">
                  {matches
                    .filter((m) => !grantedIds.has(m.userId))
                    .map((m) => (
                      <li key={m.userId} className="dating-album__peer">
                        <span className="dating-album__peer-avatar" aria-hidden>
                          {m.photoUrl || m.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                resolveMediaSrc(m.photoUrl || m.avatar || '') ||
                                m.photoUrl ||
                                m.avatar ||
                                ''
                              }
                              alt=""
                            />
                          ) : (
                            (m.name || m.username).slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <span className="dating-album__peer-name">
                          {m.name || m.username}
                        </span>
                        <button
                          type="button"
                          className="dating-album__peer-btn"
                          disabled={busyId === `grant:${m.userId}`}
                          onClick={() => void grant(m.userId)}
                        >
                          {labels.shareWith}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
