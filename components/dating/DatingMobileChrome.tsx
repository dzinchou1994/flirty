'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';
import { QuickExit } from '@/components/dating/QuickExit';

type Props = {
  locale: Locale;
  labels: {
    backHome: string;
    title: string;
    quickExit?: string;
  };
};

function isDatingChromePath(pathname: string, locale: Locale): boolean {
  const dating = localePath(locale, '/gatsnoba');
  const userDating = localePath(locale, '/user/dating');
  return (
    pathname.startsWith(dating) ||
    pathname.startsWith(userDating) ||
    pathname.startsWith(localePath(locale, '/user/dating/album'))
  );
}

function isBrowseRoot(pathname: string, root: string): boolean {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return normalized === root || normalized === root.replace(/\/$/, '') + '/';
}

/** Step back inside dating, or leave dating from browse roots. */
function datingBackHref(pathname: string, locale: Locale): string {
  const dating = localePath(locale, '/gatsnoba/');
  const home = localePath(locale, '/');

  if (isBrowseRoot(pathname, dating)) {
    return home;
  }
  return dating;
}

/** Mobile-only top chrome to step back within dating or leave to the main site. */
export function DatingMobileChrome({ locale, labels }: Props) {
  const pathname = usePathname();
  if (!isDatingChromePath(pathname, locale)) return null;

  const backHref = datingBackHref(pathname, locale);

  const byeHref = localePath(locale, '/bye');

  return (
    <header className="dating-exit-bar" aria-label={labels.title}>
      <Link href={backHref} className="dating-exit-bar__back">
        <span className="dating-exit-bar__chevron" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="dating-exit-bar__back-label">{labels.backHome}</span>
      </Link>
      <p className="dating-exit-bar__title">{labels.title}</p>
      <QuickExit label={labels.quickExit || 'Exit'} href={byeHref} />
    </header>
  );
}
