import { redirect } from 'next/navigation';
import { PrivateAlbumClient } from '@/components/dating/PrivateAlbumClient';
import { DatingMobileChrome } from '@/components/dating/DatingMobileChrome';
import { getSessionUser } from '@/lib/auth/server';
import { loginHrefWithNext } from '@/lib/auth/next-paths';
import { buildOwnerPrivateUrl } from '@/lib/media/private-url';
import { absoluteMediaUrl } from '@/lib/site';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export default async function PrivateAlbumPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const locale = raw as Locale;
  const d = getDatingDict(locale);
  const user = await getSessionUser();
  if (!user) redirect(loginHrefWithNext('/user/dating/album/', locale));

  let photos: {
    id: string;
    url: string;
    sortOrder: number;
    status: string;
    visibility: 'public' | 'private';
  }[] = [];

  if (ensureDatabaseUrl()) {
    const profile = await prisma.datingProfile.findUnique({
      where: { userId: user.id },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });
    if (profile) {
      photos = profile.photos.map((p) => ({
        id: p.id,
        url:
          p.visibility === 'private'
            ? buildOwnerPrivateUrl(p.id, user.id)
            : absoluteMediaUrl(p.url) || p.url,
        sortOrder: p.sortOrder,
        status: p.status,
        visibility: p.visibility === 'private' ? 'private' : 'public',
      }));
    }
  }

  const a = d.album;

  return (
    <>
      <DatingMobileChrome
        locale={locale}
        labels={{ backHome: d.backToBrowse, title: a.title }}
      />
      <main className="container community-page dating-page dating-page--album">
        <header className="dating-album__header">
          <h1 className="dating-album__title">{a.title}</h1>
          <p className="dating-album__lead">{a.lead}</p>
        </header>
        <PrivateAlbumClient
          locale={locale}
          initialPhotos={photos}
          labels={{
            title: a.title,
            lead: a.lead,
            privateBadge: a.privateBadge,
            publicBadge: a.publicBadge,
            makePrivate: a.makePrivate,
            makePublic: a.makePublic,
            upload: a.upload,
            uploading: a.uploading,
            uploadHint: a.uploadHint,
            empty: a.empty,
            emptyHint: a.emptyHint,
            remove: a.remove,
            shareTitle: a.shareTitle,
            shareLead: a.shareLead,
            sharedWith: a.sharedWith,
            shareWith: a.shareWith,
            revoke: a.revoke,
            noMatches: a.noMatches,
            defaultPrivateNote: a.defaultPrivateNote,
            photoLimit: a.photoLimit,
            errors: {
              GENERIC: d.auth.errors.GENERIC,
              PHOTO_TOO_LARGE: d.errorPhotoTooLarge,
              PHOTO_LIMIT: a.photoLimit,
              PROFILE_REQUIRED: a.profileRequired,
              UNAUTHORIZED: d.auth.errors.GENERIC,
            },
          }}
        />
      </main>
    </>
  );
}
