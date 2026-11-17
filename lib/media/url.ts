export function resolveMediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  // Signed private photos and the local disk driver are served by this app.
  // Prefixing them with the media host produces a URL that 404s.
  if (url.startsWith('/api/') || url.startsWith('/uploads/')) return url;
  const base = (
    process.env.R2_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ''
  ).replace(/\/$/, '');
  if (!base) return url;
  return `${base}/${url.replace(/^\//, '')}`;
}

/**
 * Grid-sized variant of a stored photo.
 *
 * Cards paint at ~200px but the stored image is up to 1200px, so the grid was
 * downloading roughly twenty times the pixels it displays. scripts/migrate-photos.mjs
 * writes a `-thumb.webp` beside every locally stored photo, so the swap is
 * safe for any `/uploads/` URL. Anything else — an R2 URL, a data URI, a
 * missing photo — is returned untouched.
 */
export function thumbSrc(url: string | null | undefined): string | null {
  const resolved = resolveMediaSrc(url);
  if (!resolved || !url) return resolved;
  if (!url.startsWith('/uploads/') || !/\.webp$/i.test(url)) return resolved;
  return resolveMediaSrc(url.replace(/\.webp$/i, '-thumb.webp'));
}
