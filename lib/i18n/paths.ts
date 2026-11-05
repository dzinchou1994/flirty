import type { Locale } from './types';

export function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  let pathname = path;
  let search = '';
  let hash = '';
  const hashIndex = pathname.indexOf('#');
  if (hashIndex !== -1) {
    hash = pathname.slice(hashIndex);
    pathname = pathname.slice(0, hashIndex);
  }
  const searchIndex = pathname.indexOf('?');
  if (searchIndex !== -1) {
    search = pathname.slice(searchIndex);
    pathname = pathname.slice(0, searchIndex);
  }
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (pathname !== '/' && !pathname.endsWith('/')) pathname += '/';
  return pathname + search + hash;
}

/** Always include locale prefix (middleware requires it). */
export function localePath(locale: Locale, path: string = '/'): string {
  const p = normalizePath(path);
  return p === '/' ? `/${locale}/` : `/${locale}${p}`;
}
