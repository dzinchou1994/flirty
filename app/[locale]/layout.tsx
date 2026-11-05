import { DatingHeader } from '@/components/dating/DatingHeader';
import { DatingTabBar } from '@/components/dating/DatingTabBar';
import { DATING_CREATE_NEXT, loginHrefWithNext } from '@/lib/auth/next-paths';
import { getAppName } from '@/lib/site';
import { getSessionUser } from '@/lib/auth/server';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : 'en') as Locale;
  const d = getDatingDict(locale);
  const user = await getSessionUser().catch(() => null);

  return (
    <>
      <DatingHeader
        locale={locale}
        appName={getAppName()}
        labels={d.menu}
        isLoggedIn={Boolean(user)}
        username={user?.username ?? null}
        intro={{
          open: d.howItWorks,
          title: d.introTitle,
          body: d.introBody,
          steps: [d.stepPhotos, d.stepDetails, d.stepBrowse],
          close: d.menu.close,
        }}
        profileAction={
          user
            ? { href: localePath(locale, DATING_CREATE_NEXT), label: d.editProfile }
            : { href: loginHrefWithNext(DATING_CREATE_NEXT, locale), label: d.heroCta }
        }
      />
      {children}
      <DatingTabBar locale={locale} labels={d.tabBar} />
    </>
  );
}
