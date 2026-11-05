import 'server-only';

import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';
import {
  SESSION_COOKIE,
  verifyAccessToken,
  type AccessClaims,
} from '@/lib/auth/tokens';

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

function extractToken(req: Request): { token: string; via: 'bearer' | 'cookie' } | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return { token, via: 'bearer' };
  }
  const cookie = readCookie(req, SESSION_COOKIE);
  if (cookie) return { token: cookie, via: 'cookie' };
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

/** Resolve identity from bearer token or httpOnly session cookie. */
export async function getAuth(req: Request): Promise<AuthContext | null> {
  const extracted = extractToken(req);
  if (!extracted) return null;
  const claims = verifyAccessToken(extracted.token);
  if (!claims) return null;
  if (!ensureDatabaseUrl()) return null;

  if (await isUserDeletionPending(claims.sub)) return null;

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
