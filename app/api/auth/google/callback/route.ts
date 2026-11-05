import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { decodeIdToken } from 'arctic';
import {
  createGoogleOAuthClient,
  findOAuthUser,
  findOrCreateOAuthUser,
} from '@/lib/auth/oauth';
import { isUserDeletionPending } from '@/lib/auth/getAuth';
import { attachSessionCookies, issueSession } from '@/lib/auth/session';
import { parseSafeDatingNext } from '@/lib/auth/safe-next';
import { localePath } from '@/lib/i18n/paths';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const jar = await cookies();
  const storedState = jar.get('oauth_google_state')?.value;
  const codeVerifier = jar.get('oauth_google_cv')?.value;
  const mode = jar.get('oauth_google_mode')?.value === 'register' ? 'register' : 'login';
  const locale = jar.get('oauth_google_locale')?.value === 'en' ? 'en' : 'ka';
  const next = parseSafeDatingNext(jar.get('oauth_google_next')?.value);

  jar.delete('oauth_google_state');
  jar.delete('oauth_google_cv');
  jar.delete('oauth_google_mode');
  jar.delete('oauth_google_locale');
  jar.delete('oauth_google_next');

  const failPath =
    mode === 'register'
      ? `/${locale}/shesvla/?tab=register&error=oauth`
      : `/${locale}/shesvla/?error=oauth`;

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return NextResponse.redirect(new URL(failPath, request.url));
  }

  try {
    const google = createGoogleOAuthClient();
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const claims = decodeIdToken(tokens.idToken()) as Record<string, unknown>;

    const info = {
      provider: 'google' as const,
      providerAccountId: String(claims.sub ?? ''),
      email: typeof claims.email === 'string' ? claims.email : null,
      name: typeof claims.name === 'string' ? claims.name : null,
    };

    if (!info.providerAccountId) {
      return NextResponse.redirect(new URL(failPath, request.url));
    }

    const user =
      mode === 'register'
        ? await findOrCreateOAuthUser(info)
        : await findOAuthUser(info);

    if (!user) {
      return NextResponse.redirect(
        new URL(`/${locale}/shesvla/?error=no_account`, request.url),
      );
    }

    if (await isUserDeletionPending(user.id)) {
      return NextResponse.redirect(
        new URL(`/${locale}/shesvla/?error=ACCOUNT_DELETED`, request.url),
      );
    }

    const session = issueSession(user.id);
    const dest = next
      ? localePath(locale, next)
      : localePath(locale, '/gatsnoba/');
    const res = NextResponse.redirect(new URL(dest, request.url));
    return attachSessionCookies(res, session);
  } catch (e) {
    console.error('[auth/google/callback]', e);
    return NextResponse.redirect(new URL(failPath, request.url));
  }
}
