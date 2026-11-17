import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  createGoogleOAuthClient,
  generateCodeVerifier,
  generateState,
} from '@/lib/auth/oauth';
import { parseSafeDatingNext } from '@/lib/auth/safe-next';
import { publicRedirect } from '@/lib/http/public-origin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  // Empty string in the process env overrides .env.local — treat as missing.
  if (!clientId || !clientSecret) {
    console.error('[auth/google] GOOGLE_CLIENT_ID/SECRET missing or empty');
    return NextResponse.redirect(publicRedirect(request, '/ka/shesvla/?error=oauth'));
  }

  const mode =
    request.nextUrl.searchParams.get('mode') === 'register' ? 'register' : 'login';
  const next = parseSafeDatingNext(request.nextUrl.searchParams.get('next'));

  const google = createGoogleOAuthClient();
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    'openid',
    'profile',
    'email',
  ]);

  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
    sameSite: 'lax' as const,
  };
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'ka';

  jar.set('oauth_google_state', state, cookieOpts);
  jar.set('oauth_google_cv', codeVerifier, cookieOpts);
  jar.set('oauth_google_mode', mode, cookieOpts);
  jar.set('oauth_google_locale', locale, cookieOpts);
  if (next) jar.set('oauth_google_next', next, cookieOpts);
  else jar.delete('oauth_google_next');

  return NextResponse.redirect(url);
}
