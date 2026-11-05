import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weather',
  robots: { index: false, follow: false },
};

/**
 * Neutral decoy page for Quick Exit. No dating chrome, no back stack into the app
 * when reached via location.replace.
 */
export default function ByePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        margin: 0,
        padding: '2rem 1.25rem',
        fontFamily: 'Georgia, "Times New Roman", serif',
        background:
          'linear-gradient(165deg, #d7e4f0 0%, #eef3f7 45%, #f7f5f0 100%)',
        color: '#1c2a36',
      }}
    >
      <p style={{ opacity: 0.7, fontSize: '0.85rem', letterSpacing: '0.04em' }}>
        Local conditions
      </p>
      <h1 style={{ fontWeight: 500, fontSize: '2rem', margin: '0.4rem 0 0.75rem' }}>
        Partly cloudy
      </h1>
      <p style={{ maxWidth: '28rem', lineHeight: 1.5, fontSize: '1.05rem' }}>
        18° · Light breeze from the west. No alerts in your area.
      </p>
    </main>
  );
}
