'use client';

/**
 * Leaving a thread for the inbox is a parent-route navigation. With the
 * profile slot mounted beside every page, the client router updates the
 * address and then keeps the thread on screen, so a second tap does nothing.
 * A full load is the navigation that actually shows the inbox.
 */
export function ThreadBack({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="dating-thread-head__back"
      aria-label={label}
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
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
        <path
          d="M15 18l-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
