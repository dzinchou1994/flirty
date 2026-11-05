import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';
import { locales } from '@/lib/i18n/config';

/** Public, crawlable pages only. Never individual profiles. */
const PUBLIC_PATHS = ['/gatsnoba/', '/gei-gatsnoba/', '/terms/', '/privacy/'];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return locales.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: path === '/gatsnoba/' ? 1 : 0.5,
    })),
  );
}
