'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

type Props = {
  open: boolean;
  onClose: () => void;
  profileName: string;
  messageHref: string;
  labels: {
    title: string;
    body: string;
    cta: string;
    close: string;
  };
};

export function DatingMatchModal({
  open,
  onClose,
  profileName,
  messageHref,
  labels,
}: Props) {
  const panelId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="dating-match-layer" role="presentation">
      <button
        type="button"
        className="dating-match-layer__backdrop"
        aria-label={labels.close}
        onClick={onClose}
      />
      <div
        id={panelId}
        className="dating-match-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${panelId}-title`}
      >
        <div className="dating-match-modal__burst" aria-hidden>
          <span>✦</span>
          <span>♥</span>
          <span>✦</span>
        </div>
        <h2 id={`${panelId}-title`} className="dating-match-modal__title">
          {labels.title}
        </h2>
        <p className="dating-match-modal__body">
          {labels.body.replace('{name}', profileName)}
        </p>
        <div className="dating-match-modal__actions">
          <Link href={messageHref} className="btn btn--primary" onClick={onClose}>
            {labels.cta}
          </Link>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {labels.close}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
