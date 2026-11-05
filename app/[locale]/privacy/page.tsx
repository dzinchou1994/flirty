import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { getPrivacy } from '@/lib/legal/documents';
import { getAppName } from '@/lib/site';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : 'en') as Locale;
  const doc = getPrivacy(locale, getAppName());
  return {
    title: `${doc.title} | ${getAppName()}`,
    description: doc.lead,
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : 'en') as Locale;
  return (
    <LegalDocument
      doc={getPrivacy(locale, getAppName())}
      updatedLabel={locale === 'en' ? 'Last updated' : 'ბოლო განახლება'}
    />
  );
}
