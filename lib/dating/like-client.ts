export type DatingLikeActionState = {
  error?: string;
  success?: string;
  matched?: boolean;
  matchUsername?: string;
  liked?: boolean;
} | null;

export async function likeDatingProfile(profileId: string): Promise<DatingLikeActionState> {
  const res = await fetch('/api/v1/likes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ profileId }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.ok) {
    return { error: json?.error?.code || 'serviceUnavailable' };
  }
  return {
    success: 'liked',
    liked: true,
    matched: Boolean(json.data.matched),
    matchUsername: json.data.matchUsername ?? undefined,
  };
}

export async function unlikeDatingProfile(profileId: string): Promise<DatingLikeActionState> {
  const res = await fetch(`/api/v1/likes/?profileId=${encodeURIComponent(profileId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json().catch(() => null);
  if (!json?.ok) return { error: json?.error?.code || 'serviceUnavailable' };
  return { success: 'unliked', liked: false, matched: false };
}
