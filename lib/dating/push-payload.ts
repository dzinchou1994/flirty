/**
 * Privacy-safe push notification shape.
 * Never include message text or sender display name — the client fetches
 * content after unlock. Built before APNs exists so the app cannot be
 * retrofitted into leaking.
 */

export type DatingPushKind =
  | 'message'
  | 'like'
  | 'match'
  | 'tap'
  | 'album_grant';

export type DatingPushPayload = {
  /** Neutral, non-identifying title only. */
  title: string;
  /** Opaque id the client uses to fetch content after unlock. */
  id: string;
  kind: DatingPushKind;
  /** Optional deep-link target id (conversation / profile) — never a name. */
  ref?: string;
};

const NEUTRAL_TITLES: Record<DatingPushKind, string> = {
  message: 'New message',
  like: 'New like',
  match: 'New match',
  tap: 'Someone tapped you',
  album_grant: 'Album update',
};

/**
 * Build a push payload. Rejects accidental inclusion of body/name fields.
 */
export function buildDatingPushPayload(input: {
  kind: DatingPushKind;
  id: string;
  ref?: string;
  /** @deprecated Ignored — never sent. */
  body?: string;
  /** @deprecated Ignored — never sent. */
  senderName?: string;
}): DatingPushPayload {
  const payload: DatingPushPayload = {
    title: NEUTRAL_TITLES[input.kind],
    id: input.id,
    kind: input.kind,
  };
  if (input.ref) payload.ref = input.ref;
  return payload;
}

/** Runtime guard used by any future APNs sender. */
export function assertPushPayloadSafe(payload: Record<string, unknown>): void {
  const forbidden = ['body', 'message', 'text', 'senderName', 'fromName', 'username', 'name'];
  for (const key of forbidden) {
    if (key in payload && payload[key] != null && payload[key] !== '') {
      throw new Error(`PUSH_PAYLOAD_LEAK:${key}`);
    }
  }
  if (typeof payload.title !== 'string' || !payload.title) {
    throw new Error('PUSH_PAYLOAD_TITLE_REQUIRED');
  }
  if (typeof payload.id !== 'string' || !payload.id) {
    throw new Error('PUSH_PAYLOAD_ID_REQUIRED');
  }
}
