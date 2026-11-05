import { notFound, redirect } from 'next/navigation';
import { DatingMobileChrome } from '@/components/dating/DatingMobileChrome';
import { LikesClient } from '@/components/dating/LikesClient';
import { getSessionUser } from '@/lib/auth/server';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';

export const dynamic = 'force-dynamic';

export default async function LikesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const d = getDatingDict(locale);

  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/shesvla/`);

  return (
    <>
      <DatingMobileChrome
        locale={locale}
        labels={{ backHome: d.backToBrowse, title: d.likesPage.title }}
      />
      <main className="container dating-page community-page">
        <h1 className="dating-page__title">{d.likesPage.title}</h1>
        <LikesClient locale={locale} labels={d.likesPage} />
      </main>
    </>
  );
}
