'use client';

type Props = {
  label?: string;
  /** Absolute or relative URL of a neutral landing page. */
  href?: string;
};

/**
 * Immediate exit to a neutral page, clearing back history so the dating UI
 * cannot be reached with the browser Back button (web). Native: same control
 * should leave the app / open a decoy screen — see docs/UI-SPEC.md.
 */
export function QuickExit({ label = 'Exit', href = '/bye' }: Props) {
  function leave() {
    try {
      window.location.replace(href);
    } catch {
      window.location.href = href;
    }
  }

  return (
    <button
      type="button"
      className="dating-quick-exit"
      onClick={leave}
      aria-label={label}
    >
      {label}
    </button>
  );
}
