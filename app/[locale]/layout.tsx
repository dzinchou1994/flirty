import { DatingHeader } from '@/components/dating/DatingHeader';
import { DatingTabBar } from '@/components/dating/DatingTabBar';
import { SessionKeepalive } from '@/components/dating/SessionKeepalive';
import { DATING_CREATE_NEXT, loginHrefWithNext } from '@/lib/auth/next-paths';
import { getAppName } from '@/lib/site';
import { getSessionUser } from '@/lib/auth/server';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

export default async function LocaleLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  /** Parallel slot filled only by the intercepting profile route. */
  modal: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : 'en') as Locale;
  const d = getDatingDict(locale);
  const user = await getSessionUser().catch(() => null);

  return (
    <>
      <SessionKeepalive enabled={Boolean(user)} />
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
        quickFilters={{
          heading: d.filtersTitle,
          online: d.filtersOnlineOnly,
          all: d.filterAll,
          male: d.filterMale,
          female: d.filterFemale,
          trans: d.filterTrans,
        }}
      />
      {children}
      {modal}
      <DatingTabBar
        locale={locale}
        labels={d.tabBar}
        appName={getAppName()}
        cta={
          user
            ? null
            : { href: loginHrefWithNext(DATING_CREATE_NEXT, locale), label: d.heroCta }
        }
      />
    </>
  );
}
