import { NextRequest, NextResponse } from 'next/server';
import { isUserDeletionPending } from '@/lib/auth/getAuth';
import { verifyDatingSsoCode } from '@/lib/auth/intimgram-sso';
import { parseSafeDatingNext } from '@/lib/auth/safe-next';
import { attachSessionCookies, issueSession } from '@/lib/auth/session';
import { localePath } from '@/lib/i18n/paths';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!ensureDatabaseUrl()) {
    return NextResponse.redirect(new URL('/ka/shesvla/?error=SERVICE_UNAVAILABLE', request.url));
  }

  const code = request.nextUrl.searchParams.get('code');
  const localeRaw = request.nextUrl.searchParams.get('locale') || 'ka';
  const locale = (isLocale(localeRaw) ? localeRaw : 'ka') as Locale;
  const next = parseSafeDatingNext(request.nextUrl.searchParams.get('next'));

  const verified = code ? verifyDatingSsoCode(code) : null;
  if (!verified) {
    return NextResponse.redirect(
      new URL(localePath(locale, '/shesvla/') + '?error=oauth', request.url),
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true },
  });
  if (!user || (await isUserDeletionPending(user.id))) {
    return NextResponse.redirect(
      new URL(localePath(locale, '/shesvla/') + '?error=ACCOUNT_DELETED', request.url),
    );
  }

  const session = issueSession(user.id);
  const dest = next
    ? localePath(locale, next)
    : localePath(locale, '/gatsnoba/');
  const res = NextResponse.redirect(new URL(dest, request.url));
  return attachSessionCookies(res, session);
}
