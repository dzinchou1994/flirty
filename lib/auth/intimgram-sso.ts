import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

export {
  datingSsoCallbackUrl,
  getDatingPublicOrigin,
  getIntimgramOrigin,
} from '@/lib/auth/intimgram-sso-public';

function ssoSecret(): string {
  return (
    process.env.DATING_SSO_SECRET ||
    process.env.COMMUNITY_AUTH_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    ''
  );
}

type SsoPayload = {
  typ: 'dating_sso';
  sub: string;
  exp: number;
  nonce: string;
};

function sign(payload: string): string {
  return createHmac('sha256', ssoSecret()).update(payload).digest('base64url');
}

/** Verify a one-time SSO token minted by Intimgram. */
export function verifyDatingSsoCode(code: string): { userId: string } | null {
  if (!ssoSecret() || !code) return null;
  try {
    const [body, sig] = code.split('.');
    if (!body || !sig) return null;
    const expected = sign(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const json = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SsoPayload;
    if (json.typ !== 'dating_sso' || !json.sub) return null;
    if (Date.now() > json.exp) return null;
    return { userId: json.sub };
  } catch {
    return null;
  }
}
