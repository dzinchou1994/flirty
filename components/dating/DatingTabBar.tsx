'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { datingHomePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

function canonPath(path: string): string {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

export type DatingTabBarLabels = {
  browse: string;
  likes: string;
  messages: string;
  profile: string;
  aria: string;
  ctaTitle?: string;
  ctaHint?: string;
};

type Tab = {
  key: 'browse' | 'likes' | 'messages' | 'profile';
  href: string;
  /** Also active for these path prefixes. */
  match: string[];
  icon: React.ReactNode;
};

function Icon({ d, extra }: { d: string; extra?: React.ReactNode }) {
  return (
    <svg
      className="dating-tabbar__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
      {extra}
    </svg>
  );
}

function buildTabs(base: string, locale: Locale): Tab[] {
  return [
    {
      key: 'browse',
      href: datingHomePath(locale),
      match: [`${base}/gatsnoba`],
      icon: (
        <Icon
          d="M4 5.5h6v6H4zM14 5.5h6v6h-6zM4 14.5h6v6H4zM14 14.5h6v6h-6z"
        />
      ),
    },
    {
      key: 'likes',
      href: `${base}/gatsnoba/likes/`,
      match: [`${base}/gatsnoba/likes`],
      icon: (
        <Icon d="M12 20.3 4.2 12.9a4.8 4.8 0 0 1 6.8-6.8l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8L12 20.3Z" />
      ),
    },
    {
      key: 'messages',
      href: `${base}/gatsnoba/messages/`,
      match: [`${base}/gatsnoba/messages`],
      icon: (
        <Icon d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.2V7.5A2.5 2.5 0 0 1 7.5 5h10A2.5 2.5 0 0 1 20 7.5v7Z" />
      ),
    },
    {
      key: 'profile',
      href: `${base}/user/dating/`,
      match: [`${base}/user`],
      icon: (
        <Icon
          d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"
          extra={<circle cx="12" cy="8" r="4" />}
        />
      ),
    },
  ];
}

const EXACT_SIBLINGS = ['/likes', '/messages'];

function isActive(pathname: string, prefixes: string[], key: string): boolean {
  if (key === 'browse') {
    const home = prefixes[0]?.replace(/\/gatsnoba$/, '') ?? '';
    if (pathname === '/' || pathname === home || pathname === `${home}/`) return true;
  }
  const hit = prefixes.some(
    (p) => pathname === p || pathname === `${p}/` || pathname.startsWith(`${p}/`),
  );
  if (!hit) return false;
  // /gatsnoba/likes and /gatsnoba/messages must not also light up Browse.
  if (key === 'browse') {
    return !EXACT_SIBLINGS.some((sib) => pathname.includes(`/gatsnoba${sib}`));
  }
  return true;
}

/**
 * Bottom navigation on phones; from 1024px the same markup is the left
 * sidebar, which also shows the brand and (for guests) a sign-up card.
 */
export function DatingTabBar({
  locale,
  labels,
  appName,
  cta,
}: {
  locale: Locale;
  labels: DatingTabBarLabels;
  appName: string;
  /** Guest sign-up card at the bottom of the desktop sidebar. */
  cta?: { href: string; label: string } | null;
}) {
  const pathname = usePathname() || '';
  const tabs = buildTabs(`/${locale}`, locale);
  const leaveTimer = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dating-nav-out');
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, [pathname]);

  // The browse grid is hundreds of photo tiles. Leaving it in a soft
  // navigation restyles every one of them before the next page can paint,
  // so the click feels frozen. Hide that stage immediately, and if the
  // client navigation never commits (the profile intercept can swallow
  // /likes and /messages), follow the link with a real load.
  function beginLeave(href: string) {
    document.documentElement.classList.add('dating-nav-out');
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    const target = canonPath(new URL(href, window.location.origin).pathname);
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = null;
      if (canonPath(window.location.pathname) === target) {
        document.documentElement.classList.remove('dating-nav-out');
        return;
      }
      window.location.assign(href);
    }, 2500);
  }

  return (
    <nav className="dating-tabbar" aria-label={labels.aria}>
      <Link href={datingHomePath(locale)} className="dating-tabbar__brand">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
          <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 8 3C20 16.1 12 21 12 21z" />
        </svg>
        <span>{appName}</span>
      </Link>
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.match, tab.key);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`dating-tabbar__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              beginLeave(tab.href);
            }}
          >
            {tab.icon}
            <span>{labels[tab.key]}</span>
          </Link>
        );
      })}
      {cta ? (
        <div className="dating-tabbar__cta">
          {labels.ctaTitle ? <p className="dating-tabbar__cta-title">{labels.ctaTitle}</p> : null}
          {labels.ctaHint ? <p className="dating-tabbar__cta-hint">{labels.ctaHint}</p> : null}
          <Link href={cta.href} className="dating-tabbar__cta-btn">
            {cta.label}
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
