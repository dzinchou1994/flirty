import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AuthClient } from '@/components/dating/AuthClient';
import { getAppName } from '@/lib/site';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import { datingHomePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const d = getDatingDict(locale);

  return (
    <main className="auth-page">
      <div className="auth-page__glow" aria-hidden />
      <div className="auth-page__inner">
        <Link
          href={datingHomePath(locale)}
          className="auth-brand"
          aria-label={getAppName()}
        >
          <span className="auth-brand__mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path
                d="M12 20.8 4.4 13.2a4.7 4.7 0 0 1 6.6-6.7l1 1 1-1a4.7 4.7 0 0 1 6.6 6.7L12 20.8Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="auth-brand__name">{getAppName()}</span>
        </Link>
        <p className="auth-brand__tagline">{d.auth.brandTagline}</p>

        <Suspense fallback={null}>
          <AuthClient locale={locale} labels={d.auth} />
        </Suspense>

        <p className="auth-page__age">18+</p>
      </div>
    </main>
  );
}
