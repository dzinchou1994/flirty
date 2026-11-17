/**
 * Public site origin for redirects behind Caddy/Docker.
 * `request.url` is often `http://0.0.0.0:3000/...` inside the container —
 * never use that as the Location base for auth callbacks.
 */

function isInternalHost(host: string): boolean {
  const h = host.toLowerCase().split(':')[0] ?? '';
  return (
    h === '0.0.0.0' ||
    h === '127.0.0.1' ||
    h === 'localhost' ||
    h === 'app' ||
    h.endsWith('.internal') ||
    h.endsWith('.local')
  );
}

export function publicRequestOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || '';

  const xfHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const xfProto =
    req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  if (xfHost && !isInternalHost(xfHost)) {
    return `${xfProto}://${xfHost}`;
  }

  const host = req.headers.get('host')?.split(',')[0]?.trim();
  if (host && !isInternalHost(host)) {
    const proto = host.includes('localhost') ? 'http' : xfProto;
    return `${proto}://${host}`;
  }

  if (env) return env;
  return 'https://flirty.ge';
}

/** Absolute redirect that never lands on the container's bind address. */
export function publicRedirect(req: Request, pathAndQuery: string): URL {
  const origin = publicRequestOrigin(req);
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  return new URL(path, `${origin}/`);
}
