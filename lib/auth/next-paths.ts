import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

export const DATING_CREATE_NEXT = '/user/dating/';

export function loginHrefWithNext(nextPath: string, locale: Locale): string {
  const next = encodeURIComponent(nextPath);
  return `${localePath(locale, '/shesvla/')}?next=${next}`;
}
