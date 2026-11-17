import { NextRequest, NextResponse } from 'next/server';
import { isUserDeletionPending } from '@/lib/auth/getAuth';
import { verifyDatingSsoCode } from '@/lib/auth/intimgram-sso';
import { parseSafeDatingNext } from '@/lib/auth/safe-next';
import { attachSessionCookies, issueSession } from '@/lib/auth/session';
import { datingHomePath, localePath } from '@/lib/i18n/paths';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';
import { publicRedirect } from '@/lib/http/public-origin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!ensureDatabaseUrl()) {
    return NextResponse.redirect(
      publicRedirect(request, '/ka/shesvla/?error=SERVICE_UNAVAILABLE'),
    );
  }

  const code = request.nextUrl.searchParams.get('code');
  const localeRaw = request.nextUrl.searchParams.get('locale') || 'ka';
  const locale = (isLocale(localeRaw) ? localeRaw : 'ka') as Locale;
  const next = parseSafeDatingNext(request.nextUrl.searchParams.get('next'));

  const verified = code ? verifyDatingSsoCode(code) : null;
  if (!verified) {
    return NextResponse.redirect(
      publicRedirect(request, localePath(locale, '/shesvla/') + '?error=oauth'),
    );
  }

  // Existing Intimgram ids that were in the fork can sign in. This does not
  // create a user, and it does not pull accounts made on Intimgram later.
  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true },
  });
  if (!user || (await isUserDeletionPending(user.id))) {
    return NextResponse.redirect(
      publicRedirect(
        request,
        localePath(locale, '/shesvla/') + '?error=ACCOUNT_DELETED',
      ),
    );
  }

  const session = issueSession(user.id);
  // Intimgram "გაცნობა" should open Flirty's discovery home, not /gatsnoba marketing.
  const dest =
    !next || next === '/' || next === '/gatsnoba/'
      ? datingHomePath(locale)
      : localePath(locale, next);
  const res = NextResponse.redirect(publicRedirect(request, dest));
  return attachSessionCookies(res, session);
}
