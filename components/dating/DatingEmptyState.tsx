import Link from 'next/link';
import type { ReactNode } from 'react';

const ICONS = {
  heart: (
    <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" />
  ),
  chat: <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3V6a1 1 0 0 1 1-1z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export function DatingEmptyState({
  icon,
  title,
  hint,
  ctaHref,
  ctaLabel,
}: {
  icon: keyof typeof ICONS;
  title: string;
  hint?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="dating-empty-state">
      <span className="dating-empty-state__icon" aria-hidden>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ICONS[icon]}
        </svg>
      </span>
      <p className="dating-empty-state__title">{title}</p>
      {hint && <p className="dating-empty-state__hint">{hint}</p>}
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="dating-empty-state__cta">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
