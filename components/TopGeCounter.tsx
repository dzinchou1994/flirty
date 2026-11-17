import Script from 'next/script';

/** top.ge visitor counter (site 119139). Rendered once, at the very bottom of every page. */
export function TopGeCounter() {
  return (
    <footer className="site-counter">
      <div id="top-ge-counter-container" data-site-id="119139" />
      <Script src="https://counter.top.ge/counter.js" strategy="afterInteractive" />
    </footer>
  );
}
