import Link from 'next/link';
import { FlirtyHomeActivity } from '@/components/dating/FlirtyHomeActivity';
import {
  fillHomeCopy,
  homeCardBackground,
  type HomeActivity,
} from '@/lib/dating/home';
import { intimgramSsoStartHref } from '@/lib/auth/intimgram-sso-public';
import { loginHrefWithNext } from '@/lib/auth/next-paths';
import { datingHomePath, localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';
import type { DatingCity } from '@/lib/dating/presets';
import type { DatingProfileView } from '@/lib/dating/shared';
import { resolveMediaSrc } from '@/lib/media/url';
import type { DatingDict } from '@/lib/i18n/dating-dict';

type Props = {
  locale: Locale;
  labels: DatingDict['home'];
  cityLabels: Record<DatingCity, string>;
  onlineNowLabel: string;
  profiles: DatingProfileView[];
  profileCount: number;
  onlineCount: number;
  newToday: number;
  activity: HomeActivity[];
  city: DatingCity | null;
  onlineOnly: boolean;
  ageMax: number | null;
  legalEmail: string;
};

function HeartIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 8 3C20 16.1 12 21 12 21z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <span className={className ?? 'fhome__brand'}>
      <span className="fhome__mark" aria-hidden>
        <HeartIcon size={18} />
      </span>
      flirty<span className="fhome__dot">.</span>
    </span>
  );
}

export function FlirtyHome({
  locale,
  labels,
  cityLabels,
  onlineNowLabel,
  profiles,
  profileCount,
  onlineCount,
  newToday,
  activity,
  city,
  onlineOnly,
  ageMax,
  legalEmail,
}: Props) {
  const home = datingHomePath(locale);
  const landing = localePath(locale, '/gatsnoba/');
  const login = localePath(locale, '/shesvla/');
  const join = `${login}?tab=register&next=${encodeURIComponent('/')}`;
  const seeAll = loginHrefWithNext('/', locale);
  const sso = intimgramSsoStartHref(locale, '/');
  const otherLocale: Locale = locale === 'ka' ? 'en' : 'ka';
  const otherLabel = locale === 'ka' ? 'EN' : 'ქარ';
  const moreCount = Math.max(0, profileCount - profiles.length);
  const year = new Date().getFullYear();
  const gridTitle = city
    ? fillHomeCopy(labels.gridTitleCity, { city: cityLabels[city] })
    : labels.gridTitle;
  const mailto = legalEmail.startsWith('TODO') ? null : `mailto:${legalEmail}`;

  function chipHref(next: {
    city?: DatingCity | null;
    online?: boolean;
    age?: boolean;
  }): string {
    const params = new URLSearchParams();
    const nextOnline = next.online ?? onlineOnly;
    const nextCity = next.city === undefined ? city : next.city;
    const nextAge = next.age ?? ageMax === 35;
    if (nextOnline) params.set('online', '1');
    if (nextCity) params.set('city', nextCity);
    if (nextAge) params.set('age', '18-35');
    const q = params.toString();
    return q ? `${landing}?${q}` : landing;
  }

  return (
    <div className="fhome">
      <header className="fhome__top">
        <Link href={home} className="fhome__brand-link" aria-label={labels.brand}>
          <Brand />
        </Link>
        <nav className="fhome__nav">
          <Link href={localePath(otherLocale, '/gatsnoba/')} className="fhome__lang">
            {otherLabel}
          </Link>
          <a href="#safety" className="fhome__nav-link">
            {labels.safetyNav}
          </a>
          <Link href={login} className="fhome__login">
            {labels.login}
          </Link>
        </nav>
      </header>

      <section className="fhome-hero">
        <div className="fhome-hero__copy">
          <p className="fhome-pill">
            <span className="fhome-dot" aria-hidden />
            {fillHomeCopy(labels.onlineNowPeople, { n: onlineCount })}
          </p>
          <h1 className="fhome-hero__title">
            {labels.heroTitleBefore}
            <br />
            <span>{labels.heroTitleAccent}</span>
          </h1>
          <p className="fhome-hero__lead fhome-hero__lead--desktop">{labels.heroLead}</p>
          <p className="fhome-hero__lead fhome-hero__lead--mobile">{labels.heroLeadMobile}</p>
          <div className="fhome-hero__actions">
            <Link href={join} className="fhome-btn fhome-btn--accent">
              {labels.startFree}
              <ArrowIcon />
            </Link>
            <a href={sso} className="fhome-btn fhome-btn--ghost fhome-btn--sso">
              <HeartIcon size={16} />
              {labels.intimgramLogin}
            </a>
          </div>
          <p className="fhome-hero__sso-inline">
            {labels.intimgramInline}{' '}
            <a href={sso}>{labels.intimgramInlineCta}</a>
          </p>
          <p className="fhome-hero__fine">{labels.finePrint}</p>
        </div>

        <aside className="fhome-live" aria-label={labels.liveOnline}>
          <div className="fhome-live__count">
            <strong>{onlineCount}</strong>
            <span>
              <span className="fhome-dot" aria-hidden />
              {labels.liveOnline}
            </span>
          </div>
          <FlirtyHomeActivity events={activity} />
          <p className="fhome-live__new">
            <strong>{fillHomeCopy(labels.newToday, { n: newToday })}</strong>{' '}
            {labels.newTodayHint}
          </p>
        </aside>
      </section>

      <section className="fhome-grid-wrap">
        <div className="fhome-grid__head">
          <div>
            <h2>{gridTitle}</h2>
            <p>{labels.gridLead}</p>
          </div>
          <div className="fhome-chips">
            <Link
              href={chipHref({ online: !onlineOnly })}
              className={`fhome-chip${onlineOnly ? ' is-on' : ''}`}
            >
              {labels.chipOnline}
            </Link>
            <Link
              href={chipHref({ city: city === 'tbilisi' ? null : 'tbilisi' })}
              className={`fhome-chip${city === 'tbilisi' ? ' is-on' : ''}`}
            >
              {cityLabels.tbilisi}
            </Link>
            <Link
              href={chipHref({ age: ageMax !== 35 })}
              className={`fhome-chip${ageMax === 35 ? ' is-on' : ''}`}
            >
              {labels.chipAge}
            </Link>
          </div>
        </div>

        <div className="fhome-grid-stage">
          <div className="fhome-grid">
            {profiles.map((profile) => {
              const cover = profile.photos[0]?.url
                ? resolveMediaSrc(profile.photos[0].url)
                : null;
              const name = profile.name || profile.username;
              const initial = (name.trim()[0] || '?').toUpperCase();
              const place = cityLabels[profile.city] ?? cityLabels.other;
              return (
                <Link
                  key={profile.id}
                  href={localePath(locale, `/gatsnoba/${profile.username}/`)}
                  className="fhome-card"
                  style={{
                    background: homeCardBackground(profile.username, Boolean(cover)),
                  }}
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="fhome-card__img" />
                  ) : (
                    <div className="fhome-card__empty">
                      <span className="fhome-card__initial">{initial}</span>
                      <span className="fhome-card__nophoto">{labels.noPhoto}</span>
                    </div>
                  )}
                  {profile.isOnline ? (
                    <span className="fhome-card__online">
                      <span className="fhome-dot fhome-dot--sm" aria-hidden />
                      {onlineNowLabel}
                    </span>
                  ) : null}
                  <span className="fhome-card__meta">
                    <strong>
                      {name}
                      {profile.age ? `, ${profile.age}` : ''}
                    </strong>
                    <em>{place}</em>
                  </span>
                </Link>
              );
            })}
          </div>

          {moreCount > 0 ? (
            <div className="fhome-gate">
              <p>{fillHomeCopy(labels.moreInCity, { n: moreCount })}</p>
              <Link href={seeAll} className="fhome-btn fhome-btn--accent">
                {labels.seeAll}
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section id="safety" className="fhome-safety">
        <div className="fhome-safety__inner">
          <div>
            <h2>
              {labels.safetyTitle}
              <br />
              {labels.safetyTitleLine2}
            </h2>
            <p className="fhome-safety__lead">{labels.safetyLead}</p>
            <p className="fhome-safety__reports">{labels.safetyReports}</p>
          </div>
          <div className="fhome-switches">
            <label className="fhome-switch">
              <span>
                <strong>{labels.incognitoTitle}</strong>
                <small>{labels.incognitoBody}</small>
              </span>
              <input type="checkbox" className="fhome-sw" />
              <span className="fhome-sw-track" aria-hidden>
                <span className="fhome-sw-knob" />
              </span>
            </label>
            <label className="fhome-switch">
              <span>
                <strong>{labels.mutualTitle}</strong>
                <small>{labels.mutualBody}</small>
              </span>
              <input type="checkbox" className="fhome-sw" defaultChecked />
              <span className="fhome-sw-track" aria-hidden>
                <span className="fhome-sw-knob" />
              </span>
            </label>
            <label className="fhome-switch">
              <span>
                <strong>{labels.albumTitle}</strong>
                <small>{labels.albumBody}</small>
              </span>
              <input type="checkbox" className="fhome-sw" defaultChecked />
              <span className="fhome-sw-track" aria-hidden>
                <span className="fhome-sw-knob" />
              </span>
            </label>
          </div>
        </div>
      </section>

      <section id="sso" className="fhome-sso">
        <div className="fhome-sso__card">
          <div>
            <h2>{labels.intimgramTitle}</h2>
            <p>{labels.intimgramBody}</p>
          </div>
          <a href={sso} className="fhome-btn fhome-btn--light">
            {labels.intimgramContinue}
            <ArrowIcon />
          </a>
        </div>
      </section>

      <footer className="fhome-foot">
        <div className="fhome-foot__brand">
          <Brand />
          <span>{fillHomeCopy(labels.footerMeta, { year })}</span>
        </div>
        <nav className="fhome-foot__nav">
          <Link href={localePath(locale, '/terms/')}>{labels.terms}</Link>
          <Link href={localePath(locale, '/privacy/')}>{labels.privacy}</Link>
          {mailto ? <a href={mailto}>{labels.abuse}</a> : <span>{labels.abuse}</span>}
          {mailto ? <a href={mailto}>{labels.contact}</a> : <span>{labels.contact}</span>}
        </nav>
      </footer>
    </div>
  );
}
