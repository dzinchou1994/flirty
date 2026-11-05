'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/types';

export type DatingTabBarLabels = {
  browse: string;
  likes: string;
  messages: string;
  profile: string;
  aria: string;
};

type Tab = {
  key: keyof Omit<DatingTabBarLabels, 'aria'>;
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

function buildTabs(base: string): Tab[] {
  return [
    {
      key: 'browse',
      href: `${base}/gatsnoba/`,
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

/** Mobile bottom navigation. Hidden above 640px by CSS. */
export function DatingTabBar({
  locale,
  labels,
}: {
  locale: Locale;
  labels: DatingTabBarLabels;
}) {
  const pathname = usePathname() || '';
  const tabs = buildTabs(`/${locale}`);

  return (
    <nav className="dating-tabbar" aria-label={labels.aria}>
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.match, tab.key);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`dating-tabbar__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.icon}
            <span>{labels[tab.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
