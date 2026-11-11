'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DatingIntroSheet } from '@/components/dating/DatingIntroSheet';
import { api } from '@/lib/api/client';
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
};

export function DatingHeader({
  locale,
  appName,
  labels,
  isLoggedIn,
  username,
  intro,
  profileAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const pathname = usePathname() || '';
  const router = useRouter();
  const base = `/${locale}`;

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
      href: `${base}/gatsnoba/`,
      label: labels.browse,
      active: pathname.startsWith(`${base}/gatsnoba`),
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

  function openHowItWorks() {
    setOpen(false);
    window.setTimeout(() => setHowOpen(true), 280);
  }

  async function logout() {
    await api('/api/v1/auth/logout/', { method: 'POST' });
    setOpen(false);
    router.push(`${base}/gatsnoba/`);
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

        <Link href={`${base}/gatsnoba/`} className="dating-header__brand">
          <span className="dating-header__mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M12 20.8 4.4 13.2a4.7 4.7 0 0 1 6.6-6.7l1 1 1-1a4.7 4.7 0 0 1 6.6 6.7L12 20.8Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="dating-header__name">{appName}</span>
        </Link>

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
          <button type="button" className="dating-drawer__link" onClick={openHowItWorks}>
            {intro.open}
          </button>

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
      <DatingIntroSheet
        labels={intro}
        open={howOpen}
        onOpenChange={setHowOpen}
        hideTrigger
      />
    </>
  );
}
