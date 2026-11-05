'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';

export type ThreadLabels = {
  placeholder: string;
  send: string;
  loading: string;
  failed: string;
  denied: string;
  limitReached: string;
  remainingHint: string;
};

type Message = {
  id: string;
  senderId: string;
  recipientId: string | null;
  body: string;
  createdAt: string;
};

const POLL_MS = 8000;

export function ThreadClient({
  peerId,
  meId,
  labels,
}: {
  peerId: string;
  meId: string;
  labels: ThreadLabels;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await api<{
      items: Message[];
      canSend?: boolean;
      remaining?: number;
    }>(`/api/v1/messages?peerId=${encodeURIComponent(peerId)}`);
    if (res.ok) {
      const sorted = [...res.data.items].sort((a, b) =>
        a.createdAt < b.createdAt ? -1 : 1,
      );
      setMessages(sorted);
      if (typeof res.data.canSend === 'boolean') setCanSend(res.data.canSend);
      if (typeof res.data.remaining === 'number') setRemaining(res.data.remaining);
      setError(null);
    } else if (res.error.code === 'MESSAGE_DENIED') {
      setError(labels.denied);
      setCanSend(false);
    }
    setLoading(false);
  }, [peerId, labels.denied]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !canSend) return;
    setSending(true);
    const res = await api<
      Message & { canSend?: boolean; remaining?: number }
    >('/api/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ peerId, body }),
    });
    if (res.ok) {
      setMessages((prev) => [...prev, res.data]);
      setDraft('');
      setError(null);
      if (typeof res.data.canSend === 'boolean') setCanSend(res.data.canSend);
      if (typeof res.data.remaining === 'number') setRemaining(res.data.remaining);
    } else if (res.error.code === 'MESSAGE_LIMIT') {
      setCanSend(false);
      setRemaining(0);
      setError(labels.limitReached);
    } else {
      setError(res.error.code === 'MESSAGE_DENIED' ? labels.denied : labels.failed);
    }
    setSending(false);
  }

  const hint =
    canSend && remaining != null && remaining <= 3 && remaining < 99
      ? labels.remainingHint.replace('{n}', String(remaining))
      : null;

  return (
    <div className="dating-thread">
      <div className="dating-thread__scroll">
        {loading ? (
          <p className="dating-thread__status">{labels.loading}</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`dating-bubble${m.senderId === meId ? ' dating-bubble--mine' : ''}`}
            >
              <p className="dating-bubble__body">{m.body}</p>
              <time className="dating-bubble__time" dateTime={m.createdAt}>
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error ? <p className="dating-thread__error">{error}</p> : null}
      {!error && hint ? <p className="dating-thread__hint">{hint}</p> : null}
      {!canSend && !error ? (
        <p className="dating-thread__error">{labels.limitReached}</p>
      ) : null}

      <form className="dating-composer" onSubmit={send}>
        <input
          className="dating-composer__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={labels.placeholder}
          maxLength={2000}
          autoComplete="off"
          disabled={!canSend}
        />
        <button
          className="dating-composer__send"
          type="submit"
          disabled={sending || !draft.trim() || !canSend}
          aria-label={labels.send}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
            <path
              d="M4 12 20 4l-8 16-2-6-6-2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
