import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LOCALE_COOKIE, localeFromRequestHeaders } from '@/lib/i18n/geo-locale';

/** Safety net — middleware usually redirects `/` before this runs. */
export default async function RootPage() {
  const h = await headers();
  const jar = await cookies();
  const locale = localeFromRequestHeaders(h, jar.get(LOCALE_COOKIE)?.value);
  redirect(`/${locale}/gatsnoba/`);
}
