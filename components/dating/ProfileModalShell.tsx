'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** A single dating profile, not the grid, likes, or a message thread. */
function isProfilePath(pathname: string): boolean {
  return /^(?:\/(?:ka|en))?\/gatsnoba\/(?!likes(?:\/|$)|messages(?:\/|$))[^/]+\/?$/.test(
    pathname,
  );
}

function browseHref(pathname: string): string {
  return pathname === '/en' || pathname.startsWith('/en/') ? '/en/' : '/';
}

/**
 * The panel the intercepted profile route renders into.
 *
 * The @modal slot stays mounted on client navigations that don't have their
 * own modal page (Back, Edit, a message thread). Hiding it as soon as the URL
 * leaves the profile is what makes those controls actually leave the panel.
 * Close prefers history so the grid keeps its scroll position, and falls back
 * to the browse URL when there is nothing to go back to.
 */
export function ProfileModalShell({
  children,
  closeLabel,
}: {
  children: React.ReactNode;
  closeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const open = isProfilePath(pathname);

  const close = useCallback(() => {
    const current = window.location.pathname;
    if (window.history.length > 1) {
      router.back();
      window.setTimeout(() => {
        if (window.location.pathname === current) router.push(browseHref(current));
      }, 300);
      return;
    }
    router.push(browseHref(current));
  }, [router]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    document.body.classList.add('pmodal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('pmodal-open');
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="pmodal" role="dialog" aria-modal="true" aria-label={closeLabel}>
      <button
        type="button"
        className="pmodal__backdrop"
        aria-label={closeLabel}
        onClick={close}
      />
      <div className="pmodal__panel">
        <button
          type="button"
          className="pmodal__close"
          aria-label={closeLabel}
          onClick={close}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="pmodal__scroll">{children}</div>
      </div>
    </div>
  );
}
