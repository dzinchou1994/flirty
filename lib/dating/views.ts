import 'server-only';

import { prisma } from '@/lib/prisma';
import { absoluteMediaUrl } from '@/lib/site';
import { loadPrivacyViewer, privacyWhereForViewer } from '@/lib/dating/privacy';

/** Record (or refresh) that `viewerId` opened `profileUserId`'s dating profile. */
export async function recordProfileView(input: {
  viewerId: string;
  profileUserId: string;
}): Promise<void> {
  if (!input.viewerId || !input.profileUserId) return;
  if (input.viewerId === input.profileUserId) return;

  const profile = await prisma.datingProfile.findUnique({
    where: { userId: input.profileUserId },
    select: { id: true },
  });
  if (!profile) return;

  const blocked = await prisma.datingBlock.findFirst({
    where: {
      OR: [
        { blockerId: input.viewerId, blockedUserId: input.profileUserId },
        { blockerId: input.profileUserId, blockedUserId: input.viewerId },
      ],
    },
    select: { id: true },
  });
  if (blocked) return;

  await prisma.datingProfileView.upsert({
    where: {
      viewerId_profileId: {
        viewerId: input.viewerId,
        profileId: profile.id,
      },
    },
    create: {
      viewerId: input.viewerId,
      profileId: profile.id,
    },
    update: { viewedAt: new Date() },
  });
}

/** People who viewed the caller's dating profile (Grindr "Viewed Me"). */
export async function listProfileViewsOfMe(input: {
  userId: string;
  cursor?: string | null;
  limit: number;
}): Promise<{
  items: {
    userId: string;
    username: string;
    name: string | null;
    photoUrl: string | null;
    viewedAt: string;
  }[];
  nextCursor: string | null;
}> {
  const own = await prisma.datingProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!own) return { items: [], nextCursor: null };

  const limit = Math.min(40, Math.max(1, input.limit));
  const viewer = await loadPrivacyViewer(input.userId);
  const privacy = privacyWhereForViewer(viewer);

  const rows = await prisma.datingProfileView.findMany({
    where: {
      profileId: own.id,
      ...(input.cursor ? { viewedAt: { lt: new Date(input.cursor) } } : {}),
      viewer: {
        datingProfile: {
          is: {
            AND: [
              { isVisible: true, moderationStatus: 'active' },
              privacy,
            ],
          },
        },
      },
    },
    orderBy: { viewedAt: 'desc' },
    take: limit + 1,
    select: {
      viewedAt: true,
      viewer: {
        select: {
          id: true,
          username: true,
          avatar: true,
          datingProfile: {
            select: {
              name: true,
              photos: {
                where: { status: 'approved', visibility: 'public' },
                orderBy: { sortOrder: 'asc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map((r) => ({
      userId: r.viewer.id,
      username: r.viewer.username,
      name: r.viewer.datingProfile?.name ?? null,
      photoUrl:
        absoluteMediaUrl(r.viewer.datingProfile?.photos[0]?.url ?? null) ||
        absoluteMediaUrl(r.viewer.avatar),
      viewedAt: r.viewedAt.toISOString(),
    })),
    nextCursor: hasMore && last ? last.viewedAt.toISOString() : null,
  };
}
