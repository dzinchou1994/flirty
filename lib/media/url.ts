export function resolveMediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = (
    process.env.R2_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ''
  ).replace(/\/$/, '');
  if (!base) return url;
  return `${base}/${url.replace(/^\//, '')}`;
}
