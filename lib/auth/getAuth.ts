import 'server-only';

import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  verifyAccessToken,
  verifyRefreshToken,
  type AccessClaims,
} from '@/lib/auth/tokens';
import { touchLastActive } from '@/lib/auth/touch-last-active';

export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  avatar: string | null;
  gender: string | null;
  isAdmin: boolean;
  isPremium: boolean;
  premiumUntil: Date | null;
  stripeSubscriptionId: string | null;
  lastActiveAt: Date;
};

export type AuthContext = {
  user: AuthUser;
  claims: AccessClaims;
  via: 'bearer' | 'cookie';
};

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function extractToken(
  req: Request,
): { token: string; via: 'bearer' | 'cookie'; kind: 'access' | 'refresh' } | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return { token, via: 'bearer', kind: 'access' };
  }
  const access = readCookie(req, SESSION_COOKIE);
  if (access) return { token: access, via: 'cookie', kind: 'access' };
  const refresh = readCookie(req, REFRESH_COOKIE);
  if (refresh) return { token: refresh, via: 'cookie', kind: 'refresh' };
  return null;
}

export async function isUserDeletionPending(userId: string): Promise<boolean> {
  if (!ensureDatabaseUrl()) return false;
  const row = await prisma.userDeletionRequest.findFirst({
    where: {
      userId,
      status: { in: ['pending', 'processing'] },
    },
    select: { id: true },
  });
  return Boolean(row);
}

/** Resolve identity from bearer / access cookie, or long-lived refresh cookie. */
export async function getAuth(req: Request): Promise<AuthContext | null> {
  const extracted = extractToken(req);
  if (!extracted) return null;

  let claims: AccessClaims | null = null;
  if (extracted.kind === 'access') {
    claims = verifyAccessToken(extracted.token);
  }
  if (!claims && extracted.kind === 'refresh') {
    const refresh = verifyRefreshToken(extracted.token);
    if (refresh) {
      // Synthesize access-shaped claims so callers stay unchanged.
      claims = {
        sub: refresh.sub,
        exp: refresh.exp,
        ageGate: true,
        typ: 'access',
      };
    }
  }
  // Access cookie present but expired — try refresh cookie on the same request.
  if (!claims) {
    const refreshTok = readCookie(req, REFRESH_COOKIE);
    const refresh = verifyRefreshToken(refreshTok);
    if (refresh) {
      claims = {
        sub: refresh.sub,
        exp: refresh.exp,
        ageGate: true,
        typ: 'access',
      };
    }
  }
  if (!claims) return null;
  if (!ensureDatabaseUrl()) return null;

  if (await isUserDeletionPending(claims.sub)) return null;

  await touchLastActive(claims.sub);

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      gender: true,
      isAdmin: true,
      isPremium: true,
      premiumUntil: true,
      stripeSubscriptionId: true,
      lastActiveAt: true,
    },
  });
  if (!user) return null;

  return { user, claims, via: extracted.via };
}

export async function requireAuth(req: Request): Promise<AuthContext | null> {
  return getAuth(req);
}

export async function requireAdmin(req: Request): Promise<AuthContext | null> {
  const auth = await getAuth(req);
  if (!auth) return null;
  if (auth.user.isAdmin) return auth;
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  // Env admin uses separate cookie path via /api/v1/admin/login — isAdmin users ok.
  return null;
}
