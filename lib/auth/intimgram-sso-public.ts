/** Client-safe helpers for Intimgram SSO links (no secrets). */

export function getIntimgramOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_INTIMGRAM_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  // Local Dating talks to local Intimgram; production defaults to the live site.
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3002';
  return 'https://www.intimgram.com';
}

export function getDatingPublicOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3003'
  );
}

export function datingSsoCallbackUrl(locale: string, next?: string | null): string {
  const base = `${getDatingPublicOrigin()}/api/v1/auth/intimgram/callback/`;
  const params = new URLSearchParams();
  params.set('locale', locale);
  if (next) params.set('next', next);
  return `${base}?${params.toString()}`;
}

/** Browser-ready Intimgram SSO start URL (callback host = current origin). */
export function intimgramSsoStartHref(locale: string, next?: string | null): string {
  const returnUrl = datingSsoCallbackUrl(locale, next);
  const params = new URLSearchParams();
  params.set('return', returnUrl);
  params.set('locale', locale);
  return `${getIntimgramOrigin()}/api/dating-sso/start/?${params.toString()}`;
}
