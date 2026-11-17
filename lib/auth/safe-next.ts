/**
 * Allow-listed post-login redirects. Rejects absolute URLs / open redirects.
 */
const ALLOWED = new Set([
  '/',
  '/gatsnoba/',
  '/gei-gatsnoba/',
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

  if (pathname !== '/' && !pathname.endsWith('/')) pathname += '/';

  // Exact allow-list, or a public profile under /gatsnoba/{username}/.
  if (ALLOWED.has(pathname)) return pathname;
  if (/^\/gatsnoba\/[a-zA-Z0-9_.-]+\/$/.test(pathname)) return pathname;
  return null;
}
