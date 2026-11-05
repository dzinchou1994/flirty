'use client';

import { useId } from 'react';

type Props = {
  label: string;
  sublabel?: string;
};

/** Inline cover art for dating profiles without photos - no static asset fetch. */
export function DatingNoPhoto({ label, sublabel }: Props) {
  const gradId = useId().replace(/:/g, '');

  return (
    <div className="dating-card__no-photo" role="img" aria-label={label}>
      <div className="dating-card__no-photo-glow" aria-hidden />
      <svg className="dating-card__no-photo-mark" viewBox="0 0 120 120" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stopColor="#f3c76b" />
            <stop offset="100%" stopColor="#e87850" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(232,168,56,0.35)" strokeWidth="1.5" />
        <circle
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke="rgba(232,168,56,0.18)"
          strokeWidth="1"
          strokeDasharray="4 7"
        />
        <path
          d="M60 92 C48 80 28 64 28 46 C28 34 37 26 48 26 C54 26 58 29 60 34 C62 29 66 26 72 26 C83 26 92 34 92 46 C92 64 72 80 60 92 Z"
          fill={`url(#${gradId})`}
        />
      </svg>
      <span className="dating-card__no-photo-label">{label}</span>
      {sublabel ? (
        <span className="dating-card__no-photo-sub" aria-hidden>
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}
