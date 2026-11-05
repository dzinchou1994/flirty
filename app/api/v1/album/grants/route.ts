import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { buildDatingPushPayload } from '@/lib/dating/push-payload';
import { areUsersBlocked } from '@/lib/dating/privacy';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const grantSchema = z.object({
  viewerUserId: z.string().min(1),
});

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const rows = await prisma.datingAlbumGrant.findMany({
    where: { ownerUserId: auth.user.id },
    orderBy: { grantedAt: 'desc' },
    select: {
      viewerUserId: true,
      grantedAt: true,
      viewer: {
        select: {
          username: true,
          avatar: true,
          datingProfile: { select: { name: true } },
        },
      },
    },
  });
  const { absoluteMediaUrl } = await import('@/lib/site');
  return ok({
    items: rows.map((r) => ({
      viewerUserId: r.viewerUserId,
      grantedAt: r.grantedAt.toISOString(),
      username: r.viewer.username,
      name: r.viewer.datingProfile?.name ?? null,
      avatar: absoluteMediaUrl(r.viewer.avatar),
    })),
  });
}

/** Grant a specific person access to private album photos. */
export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'viewerUserId required', { status: 400 });
  if (parsed.data.viewerUserId === auth.user.id) {
    return err('VALIDATION_ERROR', 'Cannot grant to self', { status: 400 });
  }
  if (await areUsersBlocked(auth.user.id, parsed.data.viewerUserId)) {
    return err('PROFILE_NOT_VISIBLE', 'User not available', { status: 404 });
  }
  const peer = await prisma.user.findUnique({
    where: { id: parsed.data.viewerUserId },
    select: { id: true },
  });
  if (!peer) return err('NOT_FOUND', 'User not found', { status: 404 });

  const grant = await prisma.datingAlbumGrant.upsert({
    where: {
      ownerUserId_viewerUserId: {
        ownerUserId: auth.user.id,
        viewerUserId: parsed.data.viewerUserId,
      },
    },
    create: {
      ownerUserId: auth.user.id,
      viewerUserId: parsed.data.viewerUserId,
    },
    update: { grantedAt: new Date() },
  });

  const push = buildDatingPushPayload({
    kind: 'album_grant',
    id: grant.id,
    ref: grant.id,
  });

  return ok({ granted: true, push }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const viewerUserId = new URL(req.url).searchParams.get('viewerUserId');
  if (!viewerUserId) return err('VALIDATION_ERROR', 'viewerUserId required', { status: 400 });
  await prisma.datingAlbumGrant.deleteMany({
    where: { ownerUserId: auth.user.id, viewerUserId },
  });
  return ok({ granted: false });
}
