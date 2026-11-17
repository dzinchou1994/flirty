import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n/config';
import {
  LOCALE_COOKIE,
  localeFromRequestHeaders,
} from '@/lib/i18n/geo-locale';
import type { Locale } from '@/lib/i18n/types';

function withLocaleCookie(res: NextResponse, locale: Locale): NextResponse {
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return res;
}

/**
 * Locale routing:
 * - Explicit `/ka/...` or `/en/...` always wins (and sticky cookie).
 * - Bare paths (`/`, `/gatsnoba/`, …) redirect using geo:
 *   Georgia (CDN country) → `/ka`, everyone else → `/en`.
 * - `/` is the canonical discovery homepage; `/gatsnoba/` is the marketing landing.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const seg = pathname.split('/')[1] ?? '';
  if (isLocale(seg)) {
    if (seg === 'ka' && (pathname === '/ka' || pathname === '/ka/')) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return withLocaleCookie(NextResponse.redirect(url), seg);
    }
    const res = NextResponse.next();
    return withLocaleCookie(res, seg);
  }

  const detectedLocale = localeFromRequestHeaders(
    req.headers,
    req.cookies.get(LOCALE_COOKIE)?.value,
  );
  // The unprefixed homepage is always Georgian. English has its own
  // indexable canonical URL at /en/.
  const locale = pathname === '/' ? 'ka' : detectedLocale;

  const url = req.nextUrl.clone();
  if (pathname === '/') {
    url.pathname = `/${locale}/`;
    return withLocaleCookie(NextResponse.rewrite(url), locale);
  }
  const rest = pathname.endsWith('/') ? pathname : `${pathname}/`;
  url.pathname = `/${locale}${rest}`;
  return withLocaleCookie(NextResponse.redirect(url), locale);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
