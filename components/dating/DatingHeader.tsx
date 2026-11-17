'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { datingHomePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

export type MenuLabels = {
  open: string;
  close: string;
  sectionBrowse: string;
  sectionAccount: string;
  sectionLegal: string;
  terms: string;
  privacy: string;
  browse: string;
  likes: string;
  messages: string;
  profile: string;
  album: string;
  settings: string;
  login: string;
  logout: string;
  register: string;
  guest: string;
  guestHint: string;
  language: string;
  langKa: string;
  langEn: string;
};

function swapLocalePath(pathname: string, next: Locale): string {
  const parts = pathname.split('/');
  // ['', 'ka', 'gatsnoba', ...]
  if (parts.length >= 2 && (parts[1] === 'ka' || parts[1] === 'en')) {
    parts[1] = next;
    const joined = parts.join('/');
    return joined.endsWith('/') ? joined : `${joined}/`;
  }
  return `/${next}/gatsnoba/`;
}

type IntroLabels = {
  open: string;
  title: string;
  body: string;
  steps: string[];
  close: string;
};

type Props = {
  locale: Locale;
  appName: string;
  labels: MenuLabels;
  isLoggedIn: boolean;
  username?: string | null;
  intro: IntroLabels;
  /** Dating-profile action moved out of the page header into this menu. */
  profileAction: { href: string; label: string };
  /** One-tap filters pinned into the desktop sidebar. */
  quickFilters: {
    heading: string;
    online: string;
    all: string;
    male: string;
    female: string;
    trans: string;
  };
};

export function DatingHeader({
  locale,
  appName,
  labels,
  isLoggedIn,
  username,
  intro,
  profileAction,
  quickFilters,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '';
  const search = useSearchParams();
  const router = useRouter();
  const base = `/${locale}`;
  const home = datingHomePath(locale);

  const quickLinks = [
    { key: 'online', label: quickFilters.online, qs: 'onlineOnly=1' },
    { key: 'all', label: quickFilters.all, qs: 'view=all' },
    { key: 'male', label: quickFilters.male, qs: 'bucket=male' },
    { key: 'female', label: quickFilters.female, qs: 'bucket=female' },
    { key: 'trans', label: quickFilters.trans, qs: 'bucket=trans' },
  ].map((f) => {
    const [k, v] = f.qs.split('=');
    return { ...f, href: `${home}?${f.qs}`, active: search?.get(k) === v };
  });

  // Close on route change, and on Escape.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const browseLinks = [
    {
      href: home,
      label: labels.browse,
      active:
        pathname === '/' ||
        pathname === base ||
        pathname === `${base}/` ||
        (pathname.startsWith(`${base}/gatsnoba/`) &&
          pathname !== `${base}/gatsnoba/` &&
          pathname !== `${base}/gatsnoba`),
    },
    ...(isLoggedIn
      ? [
          {
            href: `${base}/user/dating/album/`,
            label: labels.album,
            active: pathname.startsWith(`${base}/user/dating/album`),
          },
        ]
      : []),
  ];

  const accountLinks = isLoggedIn
    ? [
        { href: `${base}/gatsnoba/likes/`, label: labels.likes },
        { href: `${base}/gatsnoba/messages/`, label: labels.messages },
        { href: profileAction.href, label: profileAction.label },
        { href: `${base}/settings/`, label: labels.settings },
      ]
    : [
        { href: profileAction.href, label: profileAction.label },
        { href: `${base}/shesvla/`, label: labels.login },
      ];

  async function logout() {
    await api('/api/v1/auth/logout/', { method: 'POST' });
    setOpen(false);
    router.push(home);
    router.refresh();
  }

  function switchLocale(next: Locale) {
    if (next === locale) return;
    try {
      document.cookie = `dating_locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    } catch {
      /* ignore */
    }
    setOpen(false);
    router.push(swapLocalePath(pathname, next));
    router.refresh();
  }

  return (
    <>
      <header className="dating-header">
        <button
          type="button"
          className="dating-header__burger"
          aria-label={labels.open}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="dating-header__burger-bars" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>

        <Link href={home} className="dating-header__brand">
          <span className="dating-header__mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden>
              <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 8 3C20 16.1 12 21 12 21z" />
            </svg>
          </span>
          <span className="dating-header__name">{appName}</span>
        </Link>

        {/* Page-specific header actions portal in here — the browse filter
            button uses it, so filters cost no band of their own. */}
        <div id="dating-header-slot" className="dating-header__slot" />

        {isLoggedIn ? (
          <Link
            /* Opens your profile exactly as other people see it. The editor is
               one tap further in, via the Edit button on that page: there was
               previously no way to preview your own public profile at all. */
            href={username ? `${base}/gatsnoba/${username}/` : `${base}/user/dating/`}
            className="dating-header__avatar"
            aria-label={labels.profile}
          >
            {(username || '?').slice(0, 1).toUpperCase()}
          </Link>
        ) : (
          <Link href={`${base}/shesvla/`} className="dating-header__login">
            {labels.login}
          </Link>
        )}
      </header>

      <div
        className={`dating-drawer-backdrop${open ? ' is-open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={`dating-drawer${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        aria-label={labels.open}
      >
        <div className="dating-drawer__head">
          <span className="dating-drawer__who">
            <span className="dating-drawer__avatar" aria-hidden>
              {(isLoggedIn ? username || '?' : '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="dating-drawer__who-text">
              <strong>{isLoggedIn ? username : labels.guest}</strong>
              {!isLoggedIn ? <small>{labels.guestHint}</small> : null}
            </span>
          </span>
          <button
            type="button"
            className="dating-drawer__close"
            aria-label={labels.close}
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="dating-drawer__nav">
          <p className="dating-drawer__section">{labels.sectionBrowse}</p>
          {browseLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`dating-drawer__link${l.active ? ' is-active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={`${base}/gatsnoba/`}
            className="dating-drawer__link"
            onClick={() => setOpen(false)}
          >
            {intro.open}
          </Link>

          <p className="dating-drawer__section">{quickFilters.heading}</p>
          <div className="dating-drawer__quick">
            {quickLinks.map((f) => (
              <Link
                key={f.key}
                href={f.href}
                className={`dating-drawer__chip${f.active ? ' is-active' : ''}`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <p className="dating-drawer__section">{labels.sectionAccount}</p>
          {accountLinks.map((l) => (
            <Link key={l.href} href={l.href} className="dating-drawer__link">
              {l.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <button
              type="button"
              className="dating-drawer__link dating-drawer__link--danger"
              onClick={() => void logout()}
            >
              {labels.logout}
            </button>
          ) : (
            <Link href={`${base}/shesvla/`} className="dating-drawer__cta">
              {labels.register}
            </Link>
          )}

          <p className="dating-drawer__section">{labels.sectionLegal}</p>
          <Link href={`${base}/terms/`} className="dating-drawer__link">
            {labels.terms}
          </Link>
          <Link href={`${base}/privacy/`} className="dating-drawer__link">
            {labels.privacy}
          </Link>

          <p className="dating-drawer__section">{labels.language}</p>
          <div className="dating-lang-switch" role="group" aria-label={labels.language}>
            <button
              type="button"
              className={`dating-lang-switch__btn${locale === 'ka' ? ' is-active' : ''}`}
              aria-pressed={locale === 'ka'}
              onClick={() => switchLocale('ka')}
            >
              {labels.langKa}
            </button>
            <button
              type="button"
              className={`dating-lang-switch__btn${locale === 'en' ? ' is-active' : ''}`}
              aria-pressed={locale === 'en'}
              onClick={() => switchLocale('en')}
            >
              {labels.langEn}
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
