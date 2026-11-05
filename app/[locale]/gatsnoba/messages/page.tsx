import { notFound, redirect } from 'next/navigation';
import { DatingMobileChrome } from '@/components/dating/DatingMobileChrome';
import { MessagesClient } from '@/components/dating/MessagesClient';
import { getSessionUser } from '@/lib/auth/server';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';

export const dynamic = 'force-dynamic';

export default async function MessagesPage({
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
        labels={{ backHome: d.backToBrowse, title: d.messagesPage.title }}
      />
      <main className="container dating-page community-page">
        <h1 className="dating-page__title">{d.messagesPage.title}</h1>
        <MessagesClient
          locale={locale}
          labels={{
            empty: d.messagesPage.empty,
            emptyHint: d.messagesPage.emptyHint,
            loading: d.messagesPage.loading,
          }}
        />
      </main>
    </>
  );
}
