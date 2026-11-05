import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Noto_Sans_Georgian } from 'next/font/google';
import { getAppName } from '@/lib/site';
import { isLocale, defaultLocale } from '@/lib/i18n/config';
import { LOCALE_COOKIE } from '@/lib/i18n/geo-locale';
import './globals.css';

/** Mtavruli-capable Georgian — system fonts on macOS often look wrong for CAPS. */
const georgianFont = Noto_Sans_Georgian({
  weight: ['400', '500', '600', '700'],
  subsets: ['georgian', 'latin'],
  variable: '--font-georgian',
  display: 'swap',
});

export const metadata: Metadata = {
  title: getAppName(),
  description: 'Dating in Georgia · გაცნობა საქართველოში',
};

export const viewport: Viewport = {
  themeColor: '#08080c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  const lang = raw && isLocale(raw) ? raw : defaultLocale;

  return (
    <html lang={lang} className={georgianFont.variable}>
      <body>{children}</body>
    </html>
  );
}
