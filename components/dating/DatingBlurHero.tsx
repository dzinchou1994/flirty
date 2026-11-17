import Link from 'next/link';
import { DATING_CREATE_NEXT, loginHrefWithNext } from '@/lib/auth/next-paths';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

type Labels = {
  title: string;
  meta: string;
  lead: string;
  cta: string;
};

type Props = {
  locale: Locale;
  isLoggedIn: boolean;
  profileCount: number;
  labels: Labels;
};

/** Compact discovery hero — desktop B (row), phone matches the mock screenshot. */
export function DatingBlurHero({ locale, isLoggedIn, profileCount, labels }: Props) {
  const ctaHref = isLoggedIn
    ? localePath(locale, DATING_CREATE_NEXT)
    : loginHrefWithNext(DATING_CREATE_NEXT, locale);
  const displayCount = Math.max(profileCount, 12);
  const meta = labels.meta.replace('{n}', String(displayCount));

  return (
    <section className="dating-hero dating-hero--compact" aria-labelledby="dating-hero-title">
      <div className="dating-hero__compact">
        <p className="dating-hero__meta">
          <span className="dating-hero__dot" aria-hidden />
          {meta}
        </p>
        <h1 id="dating-hero-title" className="dating-hero__title">
          {labels.title}
        </h1>
        <p className="dating-hero__lead">{labels.lead}</p>
        <Link href={ctaHref} className="dating-hero__cta">
          {labels.cta}
        </Link>
      </div>
    </section>
  );
}
