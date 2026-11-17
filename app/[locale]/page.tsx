import DatingBrowsePage from './dating-browse';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import { datingHomePath } from '@/lib/i18n/paths';
import { getSiteUrl } from '@/lib/site';
import type { Locale } from '@/lib/i18n/types';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const d = getDatingDict(locale);
  const base = getSiteUrl();

  return {
    title: d.metaTitle,
    description: d.metaDescription,
    keywords: d.metaKeywords,
    alternates: {
      canonical: `${base}${datingHomePath(locale)}`,
      languages: {
        'ka-GE': `${base}/`,
        en: `${base}/en/`,
        'x-default': `${base}/`,
      },
    },
  };
}

/** Discovery grid is the canonical locale homepage. */
export default function HomePage(props: Props) {
  return <DatingBrowsePage {...props} />;
}
