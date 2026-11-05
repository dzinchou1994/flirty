import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { prisma } from '@/lib/prisma';
import { absoluteMediaUrl } from '@/lib/site';
import {
  blockWhereForViewer,
  contactExclusionWhere,
  loadPrivacyViewer,
} from '@/lib/dating/privacy';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });

  const own = await prisma.datingProfile.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!own) return ok({ items: [], nextCursor: null });

  const viewer = await loadPrivacyViewer(auth.user.id);
  const block = blockWhereForViewer(auth.user.id);
  const contact = contactExclusionWhere(viewer);

  // Mutual likes with block + contact exclusion in SQL (not post-filter).
  const myLikes = await prisma.datingLike.findMany({
    where: {
      fromUserId: auth.user.id,
      toProfile: {
        AND: [
          block,
          contact,
          {
            user: {
              sentDatingLikes: { some: { toProfileId: own.id } },
            },
          },
        ],
      },
    },
    select: {
      createdAt: true,
      toProfile: {
        select: {
          id: true,
          userId: true,
          name: true,
          user: { select: { username: true, avatar: true } },
          photos: {
            where: { status: 'approved', visibility: 'public' },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
      },
    },
  });

  return ok({
    items: myLikes.map((like) => ({
      profileId: like.toProfile.id,
      userId: like.toProfile.userId,
      username: like.toProfile.user.username,
      name: like.toProfile.name,
      avatar: absoluteMediaUrl(like.toProfile.user.avatar),
      photoUrl: absoluteMediaUrl(like.toProfile.photos[0]?.url ?? null),
      matchedAt: like.createdAt.toISOString(),
    })),
    nextCursor: null,
  });
}
