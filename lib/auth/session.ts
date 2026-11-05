import { NextResponse } from 'next/server';
import {
  issueAccessToken,
  issueRefreshToken,
  REFRESH_COOKIE,
  SESSION_COOKIE,
} from '@/lib/auth/tokens';

export function issueSession(userId: string) {
  const access = issueAccessToken(userId);
  const refresh = issueRefreshToken(userId);
  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    expiresIn: access.expiresIn,
    tokenType: 'Bearer' as const,
  };
}

export function attachSessionCookies(
  res: NextResponse,
  session: ReturnType<typeof issueSession>,
): NextResponse {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(SESSION_COOKIE, session.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: session.expiresIn,
  });
  res.cookies.set(REFRESH_COOKIE, session.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}

export function clearSessionCookies(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
