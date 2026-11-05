'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  labels: {
    open: string;
    title: string;
    body: string;
    steps: string[];
    close: string;
  };
  /** When set, the parent owns open state and this component only renders the sheet. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function DatingIntroSheet({
  labels,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const panelId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) setUncontrolledOpen(next);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const overlay =
    mounted && open
      ? createPortal(
          <div className="online-presence-layer" role="presentation">
            <button
              type="button"
              className="online-presence-layer__backdrop"
              aria-label={labels.close}
              onClick={() => setOpen(false)}
            />
            <div
              id={panelId}
              className="online-presence__sheet dating-intro-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${panelId}-title`}
            >
              <div className="online-presence__sheet-handle" aria-hidden />
              <div className="online-presence__panel-head">
                <h2 id={`${panelId}-title`} className="dating-intro-sheet__title">
                  {labels.title}
                </h2>
                <button
                  type="button"
                  className="online-presence__icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label={labels.close}
                  title={labels.close}
                >
                  ✕
                </button>
              </div>
              <div className="dating-intro-sheet__body">
                <p>{labels.body}</p>
                <ol className="dating-intro-sheet__steps">
                  {labels.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          className="dating-how-btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
        >
          {labels.open}
        </button>
      )}
      {overlay}
    </>
  );
}
