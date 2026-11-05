import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ThreadClient } from '@/components/dating/ThreadClient';
import { getSessionUser } from '@/lib/auth/server';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ locale: string; peerId: string }>;
}) {
  const { locale: raw, peerId } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const d = getDatingDict(locale);

  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/shesvla/`);

  // Header only. Every access rule is enforced by the API the client calls.
  let peerName = '';
  let peerUsername = '';
  if (ensureDatabaseUrl()) {
    const peer = await prisma.user.findUnique({
      where: { id: peerId },
      select: { username: true, datingProfile: { select: { name: true } } },
    });
    peerName = peer?.datingProfile?.name || peer?.username || '';
    peerUsername = peer?.username || '';
  }

  return (
    <main className="dating-thread-page">
      <header className="dating-thread-head">
        <Link
          href={`/${locale}/gatsnoba/messages/`}
          className="dating-thread-head__back"
          aria-label={d.messagesPage.back}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        {peerUsername ? (
          <Link
            href={`/${locale}/gatsnoba/${peerUsername}/`}
            className="dating-thread-head__title"
          >
            {peerName}
          </Link>
        ) : (
          <span className="dating-thread-head__title">{peerName}</span>
        )}
        <span className="dating-thread-head__spacer" aria-hidden />
      </header>

      <ThreadClient
        peerId={peerId}
        meId={user.id}
        labels={{
          placeholder: d.messagesPage.placeholder,
          send: d.messagesPage.send,
          loading: d.messagesPage.loading,
          failed: d.messagesPage.failed,
          denied: d.messagesPage.denied,
          limitReached: d.messagesPage.limitReached,
          remainingHint: d.messagesPage.remainingHint,
        }}
      />
    </main>
  );
}
