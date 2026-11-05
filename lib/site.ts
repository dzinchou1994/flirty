export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3003';
  return raw.replace(/\/$/, '');
}

export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Dating';
}

/** Make media URLs absolute for native clients. */
export function absoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Already absolute (https, data URIs stored in DB, blob)
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  // Local-driver paths are served by this app, never by the media host.
  const base = (
    url.startsWith('/uploads/')
      ? getSiteUrl()
      : process.env.R2_PUBLIC_BASE_URL || getSiteUrl()
  ).replace(/\/$/, '');
  return `${base}/${url.replace(/^\//, '')}`;
}
