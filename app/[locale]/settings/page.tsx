import { notFound, redirect } from 'next/navigation';
import { DatingMobileChrome } from '@/components/dating/DatingMobileChrome';
import { SettingsClient } from '@/components/dating/SettingsClient';
import { getSessionUser } from '@/lib/auth/server';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const d = getDatingDict(locale);

  // Account deletion only makes sense for a signed-in user.
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/shesvla/`);

  return (
    <>
      <DatingMobileChrome
        locale={locale}
        labels={{ backHome: d.backToBrowse, title: d.settingsPage.title }}
      />
      <main className="container dating-page community-page settings-page">
        <h1 className="dating-page__title">{d.settingsPage.title}</h1>
        <SettingsClient labels={d.settingsPage} byeHref={`/${locale}/bye/`} />
      </main>
    </>
  );
}
