import type { Locale } from './types';

export const locales: Locale[] = ['ka', 'en'];

/**
 * Fallback when country / cookie / Accept-Language are all unknown.
 * Production traffic without a locale prefix is routed by geo in middleware
 * (Georgia → ka, elsewhere → en); this is only a last resort.
 */
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}
