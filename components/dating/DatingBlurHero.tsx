import Link from 'next/link';
import { DATING_CREATE_NEXT, loginHrefWithNext } from '@/lib/auth/next-paths';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

type Labels = {
  title: string;
  subtitle: string;
  cta: string;
  ctaLogin: string;
  featurePrivacy: string;
  featureLocal: string;
  featureFree: string;
  featureFast: string;
  statsProfiles: string;
  statsHint: string;
  lockHint: string;
};

type Props = {
  locale: Locale;
  isLoggedIn: boolean;
  profileCount: number;
  labels: Labels;
};

export function DatingBlurHero({ locale, isLoggedIn, profileCount, labels }: Props) {
  const ctaHref = isLoggedIn
    ? localePath(locale, DATING_CREATE_NEXT)
    : loginHrefWithNext(DATING_CREATE_NEXT, locale);
  const displayCount = Math.max(profileCount, 12);

  return (
    <section className="dating-hero" aria-labelledby="dating-hero-title">
      <div className="dating-hero__glow dating-hero__glow--a" aria-hidden />
      <div className="dating-hero__glow dating-hero__glow--b" aria-hidden />
      <div className="dating-hero__hearts" aria-hidden>
        <span className="dating-hero__heart dating-hero__heart--1">♥</span>
        <span className="dating-hero__heart dating-hero__heart--2">♥</span>
        <span className="dating-hero__heart dating-hero__heart--3">♥</span>
        <span className="dating-hero__heart dating-hero__heart--4">♥</span>
        <span className="dating-hero__heart dating-hero__heart--5">♥</span>
      </div>

      <div className="dating-hero__card">
        <p className="dating-hero__eyebrow">Dating</p>
        <h2 id="dating-hero-title" className="dating-hero__title">
          {labels.title}
        </h2>
        <p className="dating-hero__subtitle">{labels.subtitle}</p>

        <div className="dating-hero__features">
          <span className="dating-hero__pill">{labels.featurePrivacy}</span>
          <span className="dating-hero__pill">{labels.featureLocal}</span>
          <span className="dating-hero__pill">{labels.featureFree}</span>
          <span className="dating-hero__pill">{labels.featureFast}</span>
        </div>

        <div className="dating-hero__stats">
          <div className="dating-hero__stat">
            <strong>{displayCount}+</strong>
            <span>{labels.statsProfiles}</span>
          </div>
          <p className="dating-hero__stats-hint">{labels.statsHint}</p>
        </div>

        <Link href={ctaHref} className="btn btn--primary dating-hero__cta">
          {labels.cta}
        </Link>
        <p className="dating-hero__lock">{labels.lockHint}</p>
      </div>
    </section>
  );
}
