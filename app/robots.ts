import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

/**
 * Individual profiles are kept out of the index by per-page metadata
 * (see lib/seo-stub.ts), not here, so that the public landing pages can still
 * be crawled for acquisition. This file blocks the areas that should never be
 * reachable from a search engine at all.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const privateAreas = [
    '/api/',
    '/admin/',
    '/settings/',
    '/user/',
    '/shesvla/',
    '/bye/',
    '/axlomdebare/',
    '/gatsnoba/likes/',
    '/gatsnoba/messages/',
  ];
  // Locale-prefixed and bare, since middleware redirects rather than rewrites.
  const disallow = privateAreas.flatMap((p) => [p, `/ka${p}`, `/en${p}`]);

  return {
    rules: [{ userAgent: '*', allow: '/', disallow }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
