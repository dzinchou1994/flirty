import { redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

/** Nearby map tab removed — discovery sorts by distance on /gatsnoba. */
export default async function NearbyRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'en';
  redirect(`/${locale}/gatsnoba/`);
}
