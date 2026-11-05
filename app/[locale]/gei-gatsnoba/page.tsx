import { permanentRedirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

/** Old gay-dating entry → unified browse. */
export default async function GayDatingRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safe = isLocale(locale) ? locale : 'ka';
  permanentRedirect(`/${safe}/gatsnoba/`);
}
