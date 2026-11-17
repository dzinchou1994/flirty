import { notFound } from 'next/navigation';
import { FlirtyHome } from '@/components/dating/FlirtyHome';
import { loadHomeFeed } from '@/lib/dating/home';
import { parseDatingCity } from '@/lib/dating/presets';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/paths';
import { getSiteUrl } from '@/lib/site';
import type { Locale } from '@/lib/i18n/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const d = getDatingDict(locale);
  const base = getSiteUrl();
  const path = localePath(locale, '/gatsnoba/');

  return {
    title: d.home.metaTitle ?? d.metaTitle,
    description: d.home.metaDescription ?? d.metaDescription,
    alternates: {
      canonical: `${base}${path}`,
      languages: {
        'ka-GE': `${base}/ka/gatsnoba/`,
        en: `${base}/en/gatsnoba/`,
        'x-default': `${base}/ka/gatsnoba/`,
      },
    },
  };
}

/** Marketing landing at /gatsnoba — browse first, sign up after. */
export default async function GatsnobaLandingPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const rawParams = await searchParams;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const d = getDatingDict(locale);

  const city = parseDatingCity(firstParam(rawParams.city));
  const onlineOnly = firstParam(rawParams.online) === '1';
  const ageMax = firstParam(rawParams.age) === '18-35' ? 35 : null;

  const feed = await loadHomeFeed({
    city,
    onlineOnly,
    ageMax,
    labels: {
      joined: d.home.joined,
      newProfileIn: d.home.newProfileIn,
      justNow: d.home.justNow,
      minutesAgo: d.home.minutesAgo,
      cityLabels: d.cityLabels,
    },
  });

  const legalEmail =
    process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || 'TODO@example.com';

  return (
    <FlirtyHome
      locale={locale}
      labels={d.home}
      cityLabels={d.cityLabels}
      onlineNowLabel={d.onlineNow}
      profiles={feed.profiles}
      profileCount={feed.profileCount}
      onlineCount={feed.onlineCount}
      newToday={feed.newToday}
      activity={feed.activity}
      city={city}
      onlineOnly={onlineOnly}
      ageMax={ageMax}
      legalEmail={legalEmail}
    />
  );
}
