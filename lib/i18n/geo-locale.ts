import type { Locale } from './types';
import { isLocale } from './config';

/** Cookie set when the user lands on (or picks) an explicit locale. */
export const LOCALE_COOKIE = 'dating_locale';

const GEORGIA = new Set(['GE', 'GEO']);

/**
 * Country headers used by common CDNs / hosts in front of this app.
 * Cloudflare (`CF-IPCountry`) is the primary production signal.
 */
export function countryFromHeaders(headers: Headers): string | null {
  const raw =
    headers.get('cf-ipcountry') ||
    headers.get('x-vercel-ip-country') ||
    headers.get('cloudfront-viewer-country') ||
    headers.get('x-country-code') ||
    headers.get('x-geo-country') ||
    '';
  const code = raw.trim().toUpperCase();
  if (!code || code === 'XX' || code === 'T1') return null; // unknown / tor
  return code;
}

export function isGeorgiaCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return GEORGIA.has(code.trim().toUpperCase());
}

/** True when Accept-Language clearly prefers Georgian. */
export function acceptLanguagePrefersKa(header: string | null | undefined): boolean {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.trim().toLowerCase());
  for (const part of parts) {
    const tag = part.split(';')[0]?.trim() ?? '';
    if (tag === 'ka' || tag.startsWith('ka-')) return true;
    // First *non*-wildcard tag that isn't ka → not a Georgian preference.
    if (tag && tag !== '*') return false;
  }
  return false;
}

/**
 * Pick the locale for a request that has no `/ka` or `/en` prefix.
 *
 * Order:
 * 1. Explicit cookie (user already chose / visited a locale URL)
 * 2. CDN country = Georgia → `ka`
 * 3. Country known and not Georgia → `en`
 * 4. Country unknown (local / no CDN) → Accept-Language `ka*` → `ka`, else `en`
 */
export function detectLocale(input: {
  cookie?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (input.cookie && isLocale(input.cookie)) return input.cookie;

  if (isGeorgiaCountry(input.country)) return 'ka';
  if (input.country) return 'en';

  return acceptLanguagePrefersKa(input.acceptLanguage) ? 'ka' : 'en';
}

export function localeFromRequestHeaders(
  headers: Headers,
  cookieValue?: string | null,
): Locale {
  return detectLocale({
    cookie: cookieValue,
    country: countryFromHeaders(headers),
    acceptLanguage: headers.get('accept-language'),
  });
}
