import { ok, err } from '@/lib/api/respond';
import { likeRequestSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { getVisibleProfileForViewer } from '@/lib/dating/feed';
import {
  loadPrivacyViewer,
  privacyWhereForViewer,
  blockWhereForViewer,
  contactExclusionWhere,
} from '@/lib/dating/privacy';
import { prisma } from '@/lib/prisma';
import { decodeCursor, encodeCursor } from '@/lib/dating/cursor';
import { absoluteMediaUrl } from '@/lib/site';
import { buildDatingPushPayload } from '@/lib/dating/push-payload';
import { serializePublicProfile } from '@/lib/dating/serialize';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const url = new URL(req.url);
  const dir = url.searchParams.get('dir') || 'received';
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  const cursor = decodeCursor(url.searchParams.get('cursor'));

  const own = await prisma.datingProfile.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!own) return ok({ items: [], nextCursor: null });

  const viewer = await loadPrivacyViewer(auth.user.id);
  const privacy = privacyWhereForViewer(viewer);
  const block = blockWhereForViewer(auth.user.id);

  if (dir === 'sent') {
    const rows = await prisma.datingLike.findMany({
      where: {
        fromUserId: auth.user.id,
        toProfile: { AND: [privacy, block] },
        ...(cursor?.c ? { createdAt: { lt: new Date(cursor.c) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        toProfile: {
          include: {
            user: {
              select: { username: true, avatar: true, gender: true, lastActiveAt: true },
            },
            photos: {
              where: { status: 'approved', visibility: 'public' },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    const page = rows.slice(0, limit);
    const nextCursor =
      rows.length > limit
        ? encodeCursor({ c: page[page.length - 1].createdAt.toISOString() })
        : null;
    return ok({
      items: page.map((row) => ({
        likedAt: row.createdAt.toISOString(),
        profile: serializePublicProfile(row.toProfile, {
          viewerId: auth.user.id,
          includePrivateAlbum: false,
        }),
      })),
      nextCursor,
    });
  }

  // received — contact + block in SQL; do not apply mutual_only (like is the signal).
  const contact = contactExclusionWhere(viewer);

  const rows = await prisma.datingLike.findMany({
    where: {
      toProfileId: own.id,
      fromUser: {
        datingProfile: {
          is: { AND: [block, contact] },
        },
      },
      ...(cursor?.c ? { createdAt: { lt: new Date(cursor.c) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: {
      fromUser: {
        select: {
          id: true,
          username: true,
          datingProfile: {
            include: {
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

  const page = rows.slice(0, limit);
  const items = [];
  for (const row of page) {
    const profile = row.fromUser.datingProfile;
    if (!profile) continue;
    items.push({
      likedAt: row.createdAt.toISOString(),
      userId: row.fromUser.id,
      username: row.fromUser.username,
      profileId: profile.id,
      photoUrl: absoluteMediaUrl(profile.photos[0]?.url ?? null),
      name: profile.name,
    });
  }
  const nextCursor =
    rows.length > limit ? encodeCursor({ c: page[page.length - 1].createdAt.toISOString() }) : null;
  return ok({ items, nextCursor });
}

export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = likeRequestSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'profileId required', { status: 400 });

  const visible = await getVisibleProfileForViewer({
    viewerId: auth.user.id,
    profileId: parsed.data.profileId,
    includePrivateAlbum: false,
  });
  if (!visible) return err('PROFILE_NOT_VISIBLE', 'Profile is not visible', { status: 404 });

  const own = await prisma.datingProfile.findUnique({
    where: { userId: auth.user.id },
    include: { photos: { where: { status: 'approved' }, take: 1 } },
  });
  if (!own || !own.bio.trim() || own.photos.length === 0 || own.moderationStatus !== 'active') {
    return err('PROFILE_LOCKED', 'Your profile cannot like yet', { status: 403 });
  }

  // The like may target one photo or one prompt answer, never both.
  if (parsed.data.photoId && parsed.data.promptAnswerId) {
    return err('VALIDATION_ERROR', 'Like one element, not two', { status: 400 });
  }

  // Verify the target belongs to the profile being liked, so a crafted id
  // cannot attach a like to someone else's content.
  if (parsed.data.photoId) {
    const photo = await prisma.datingPhoto.findFirst({
      where: { id: parsed.data.photoId, profileId: parsed.data.profileId },
      select: { id: true },
    });
    if (!photo) return err('VALIDATION_ERROR', 'Unknown photo', { status: 400 });
  }
  if (parsed.data.promptAnswerId) {
    const answer = await prisma.datingPromptAnswer.findFirst({
      where: { id: parsed.data.promptAnswerId, profileId: parsed.data.profileId },
      select: { id: true },
    });
    if (!answer) return err('VALIDATION_ERROR', 'Unknown prompt answer', { status: 400 });
  }

  const target = {
    photoId: parsed.data.photoId ?? null,
    promptAnswerId: parsed.data.promptAnswerId ?? null,
    comment: parsed.data.comment?.trim() || null,
  };

  const like = await prisma.datingLike.upsert({
    where: {
      fromUserId_toProfileId: { fromUserId: auth.user.id, toProfileId: parsed.data.profileId },
    },
    create: { fromUserId: auth.user.id, toProfileId: parsed.data.profileId, ...target },
    update: target,
  });

  const reverse = await prisma.datingLike.findUnique({
    where: {
      fromUserId_toProfileId: { fromUserId: visible.userId, toProfileId: own.id },
    },
  });

  const push = buildDatingPushPayload({
    kind: reverse ? 'match' : 'like',
    id: like.id,
    ref: parsed.data.profileId,
  });

  return ok({
    liked: true,
    matched: Boolean(reverse),
    matchUsername: reverse ? visible.username : null,
    push,
  });
}

export async function DELETE(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const url = new URL(req.url);
  const profileId = url.searchParams.get('profileId');
  if (!profileId) return err('VALIDATION_ERROR', 'profileId required', { status: 400 });
  await prisma.datingLike.deleteMany({ where: { fromUserId: auth.user.id, toProfileId: profileId } });
  return ok({ liked: false });
}
