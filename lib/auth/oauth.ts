import 'server-only';

import { Google, generateState, generateCodeVerifier } from 'arctic';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { normalizeUsername } from '@/lib/auth/password';
import { getSiteUrl } from '@/lib/site';

export type OAuthUserInfo = {
  provider: 'google' | 'apple';
  providerAccountId: string;
  email: string | null;
  name: string | null;
};

export { generateState, generateCodeVerifier };

/** OAuth redirect base — must match Google Console authorized redirect URIs. */
function getOAuthBaseUrl(): string {
  if (process.env.OAUTH_BASE_URL) {
    return process.env.OAUTH_BASE_URL.replace(/\/$/, '');
  }
  return getSiteUrl().replace(/\/$/, '');
}

/** Arctic Google client for the browser redirect (code) flow. */
export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  const redirectUri = `${getOAuthBaseUrl()}/api/auth/google/callback`;
  return new Google(clientId, clientSecret, redirectUri);
}

const googleJWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export function createGoogleProvider() {
  return {
    async verifyIdToken(idToken: string): Promise<OAuthUserInfo> {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error('GOOGLE_CLIENT_ID missing');
      const { payload } = await jwtVerify(idToken, googleJWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: clientId,
      });
      return {
        provider: 'google',
        providerAccountId: String(payload.sub),
        email: typeof payload.email === 'string' ? payload.email : null,
        name: typeof payload.name === 'string' ? payload.name : null,
      };
    },
  };
}

export async function verifyAppleIdToken(idToken: string): Promise<OAuthUserInfo> {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new Error('APPLE_CLIENT_ID missing');
  const { payload } = await jwtVerify(idToken, appleJWKS, {
    issuer: 'https://appleid.apple.com',
    audience: clientId,
  });
  return {
    provider: 'apple',
    providerAccountId: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email : null,
    name: null,
  };
}

async function buildUniqueUsername(base: string): Promise<string> {
  const normalized = normalizeUsername(base.replace(/\s+/g, '_'));
  const candidate = normalized.length >= 3 ? normalized : `user_${normalized || 'x'}`;
  const existing = await prisma.user.findUnique({ where: { username: candidate } });
  if (!existing) return candidate;
  for (let i = 2; i <= 99; i++) {
    const suffixed = `${candidate}${i}`.slice(0, 24);
    const taken = await prisma.user.findUnique({ where: { username: suffixed } });
    if (!taken) return suffixed;
  }
  return `${candidate}_${Date.now().toString(36)}`.slice(0, 24);
}

/** Find existing OAuth/email user; does not create. */
export async function findOAuthUser(info: OAuthUserInfo) {
  const existing = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: info.provider,
        providerAccountId: info.providerAccountId,
      },
    },
    include: { user: true },
  });
  if (existing) return existing.user;

  if (info.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: info.email } });
    if (byEmail) {
      await prisma.oAuthAccount.create({
        data: {
          userId: byEmail.id,
          provider: info.provider,
          providerAccountId: info.providerAccountId,
        },
      });
      return byEmail;
    }
  }

  return null;
}

export async function findOrCreateOAuthUser(info: OAuthUserInfo) {
  const found = await findOAuthUser(info);
  if (found) return found;

  const username = await buildUniqueUsername(info.name ?? info.email?.split('@')[0] ?? 'user');
  return prisma.user.create({
    data: {
      username,
      email: info.email,
      emailVerifiedAt: info.email ? new Date() : null,
      oauthAccounts: {
        create: { provider: info.provider, providerAccountId: info.providerAccountId },
      },
    },
  });
}
