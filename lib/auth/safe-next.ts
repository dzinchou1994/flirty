/**
 * Allow-listed post-login redirects. Rejects absolute URLs / open redirects.
 */
const ALLOWED = new Set([
  '/gatsnoba/',
  '/user/dating/',
  '/user/dating/album/',
  '/likes/',
  '/messages/',
]);

export function parseSafeDatingNext(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return null;
  }

  let pathname = trimmed;
  const q = pathname.indexOf('?');
  if (q !== -1) pathname = pathname.slice(0, q);
  const h = pathname.indexOf('#');
  if (h !== -1) pathname = pathname.slice(0, h);

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    pathname = pathname.slice(3) || '/';
  }
  if (pathname === '/ka' || pathname.startsWith('/ka/')) {
    pathname = pathname.slice(3) || '/';
  }

  if (!pathname.endsWith('/')) pathname += '/';
  return ALLOWED.has(pathname) ? pathname : null;
}
