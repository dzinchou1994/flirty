import crypto from 'crypto';

const DEFAULT_TTL_SEC = 5 * 60;

function signingSecret(): string {
  return (
    process.env.PRIVATE_MEDIA_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    'dev-private-media'
  );
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

export type PrivatePhotoTokenClaims = {
  photoId: string;
  viewerId: string;
  exp: number;
};

/** Short-lived HMAC token. Never embed the public R2 URL. */
export function signPrivatePhotoToken(
  claims: Omit<PrivatePhotoTokenClaims, 'exp'> & { ttlSec?: number },
  nowSec: number = Math.floor(Date.now() / 1000),
): string {
  const payload: PrivatePhotoTokenClaims = {
    photoId: claims.photoId,
    viewerId: claims.viewerId,
    exp: nowSec + (claims.ttlSec ?? DEFAULT_TTL_SEC),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64url(
    crypto.createHmac('sha256', signingSecret()).update(body).digest(),
  );
  return `${body}.${sig}`;
}

export function verifyPrivatePhotoToken(
  token: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): PrivatePhotoTokenClaims | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64url(
    crypto.createHmac('sha256', signingSecret()).update(body).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(fromB64url(body).toString('utf8')) as PrivatePhotoTokenClaims;
    if (!claims.photoId || !claims.viewerId || !claims.exp) return null;
    if (claims.exp < nowSec) return null;
    return claims;
  } catch {
    return null;
  }
}

export function privatePhotoAccessPath(token: string): string {
  // trailingSlash is on, so the unslashed path 308s. Keep the query on the
  // canonical path the route actually serves.
  return `/api/v1/media/private/?t=${encodeURIComponent(token)}`;
}

/**
 * Resolve what URL (if any) a viewer may receive for a photo.
 * Private photos never expose the public R2 URL.
 */
export function resolvePhotoUrlForViewer(input: {
  visibility: string;
  publicUrl: string;
  photoId: string;
  ownerUserId: string;
  viewerId: string | null | undefined;
  hasGrant: boolean;
}): string | null {
  if (input.visibility !== 'private') return input.publicUrl;
  if (!input.viewerId) return null;
  if (input.viewerId !== input.ownerUserId && !input.hasGrant) return null;
  const token = signPrivatePhotoToken({
    photoId: input.photoId,
    viewerId: input.viewerId,
  });
  return privatePhotoAccessPath(token);
}
