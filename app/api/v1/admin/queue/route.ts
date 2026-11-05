import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { prisma } from '@/lib/prisma';
import { absoluteMediaUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

async function requireDatingAdmin(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return null;
  if (auth.user.isAdmin) return auth;
  return null;
}

/** Pending photos + hidden/reported profiles. 24h response target. */
export async function GET(req: Request) {
  const auth = await requireDatingAdmin(req);
  if (!auth) return err('UNAUTHORIZED', 'Admin only', { status: 401 });

  const [pendingPhotos, reports, restricted] = await Promise.all([
    prisma.datingPhoto.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        profile: { select: { id: true, userId: true, name: true, user: { select: { username: true } } } },
      },
    }),
    prisma.datingProfileReport.findMany({
      where: { resolvedAt: null },
      orderBy: { receivedAt: 'asc' },
      take: 50,
      include: {
        profile: { select: { id: true, name: true, user: { select: { username: true } } } },
        reporter: { select: { username: true } },
      },
    }),
    prisma.datingProfile.findMany({
      where: { moderationStatus: { in: ['hidden', 'pending'] } },
      orderBy: { updatedAt: 'asc' },
      take: 50,
      include: { user: { select: { username: true } } },
    }),
  ]);

  return ok({
    slaHours: 24,
    pendingPhotos: pendingPhotos.map((p) => ({
      id: p.id,
      url: absoluteMediaUrl(p.url),
      createdAt: p.createdAt.toISOString(),
      profileId: p.profile.id,
      username: p.profile.user.username,
    })),
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      receivedAt: r.receivedAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      ageHours: Math.round(
        (Date.now() - r.receivedAt.getTime()) / (60 * 60 * 1000) * 10,
      ) / 10,
      profileId: r.profileId,
      username: r.profile.user.username,
      reporter: r.reporter.username,
    })),
    restrictedProfiles: restricted.map((p) => ({
      id: p.id,
      username: p.user.username,
      moderationStatus: p.moderationStatus,
      moderationReason: p.moderationReason,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}
