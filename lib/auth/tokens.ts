import crypto from 'crypto';

/** Stay signed in across visits. 15m was logging people out constantly. */
const ACCESS_TTL_SEC = 30 * 24 * 60 * 60;
const REFRESH_TTL_SEC = 90 * 24 * 60 * 60;

function accessSecret(): string {
  return process.env.AUTH_SESSION_SECRET || 'dev-access-secret';
}

function refreshSecret(): string {
  return process.env.AUTH_REFRESH_SECRET || process.env.AUTH_SESSION_SECRET || 'dev-refresh-secret';
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export type AccessClaims = {
  sub: string;
  exp: number;
  ageGate: true;
  typ: 'access';
};

export type RefreshClaims = {
  sub: string;
  exp: number;
  typ: 'refresh';
  jti: string;
};

function encodeToken(claims: object, secret: string): string {
  const payload = b64url(JSON.stringify(claims));
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

function decodeToken<T extends { exp: number }>(token: string, secret: string): T | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    if (sign(payload, secret) !== sig) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as T;
    if (!claims.exp || Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}

export function issueAccessToken(userId: string): { token: string; expiresIn: number } {
  const expiresIn = ACCESS_TTL_SEC;
  const claims: AccessClaims = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    ageGate: true,
    typ: 'access',
  };
  return { token: encodeToken(claims, accessSecret()), expiresIn };
}

export function issueRefreshToken(userId: string): { token: string; expiresIn: number } {
  const expiresIn = REFRESH_TTL_SEC;
  const claims: RefreshClaims = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    typ: 'refresh',
    jti: crypto.randomBytes(16).toString('hex'),
  };
  return { token: encodeToken(claims, refreshSecret()), expiresIn };
}

export function verifyAccessToken(token: string | undefined): AccessClaims | null {
  if (!token) return null;
  const claims = decodeToken<AccessClaims>(token, accessSecret());
  if (!claims || claims.typ !== 'access' || !claims.ageGate) return null;
  return claims;
}

export function verifyRefreshToken(token: string | undefined): RefreshClaims | null {
  if (!token) return null;
  const claims = decodeToken<RefreshClaims>(token, refreshSecret());
  if (!claims || claims.typ !== 'refresh') return null;
  return claims;
}

export const SESSION_COOKIE = 'dating_session';
export const REFRESH_COOKIE = 'dating_refresh';
