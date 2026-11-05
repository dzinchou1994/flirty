import { ok, err } from '@/lib/api/respond';
import { likeRequestSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { getVisibleProfileForViewer } from '@/lib/dating/feed';
import { areUsersBlocked, loadPrivacyViewer, privacyWhereForViewer } from '@/lib/dating/privacy';
import { takeTapRateLimit } from '@/lib/dating/rate-limit';
import { buildDatingPushPayload } from '@/lib/dating/push-payload';
import { prisma } from '@/lib/prisma';
import { absoluteMediaUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

const TAP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Received taps — blocked / contact-excluded peers never appear (SQL). */
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const own = await prisma.datingProfile.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!own) return ok({ items: [] });

  const viewer = await loadPrivacyViewer(auth.user.id);
  const privacy = privacyWhereForViewer(viewer);

  const rows = await prisma.datingTap.findMany({
    where: {
      toProfileId: own.id,
      createdAt: { gte: new Date(Date.now() - TAP_WINDOW_MS) },
      fromUser: {
        datingProfile: { is: privacy },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      fromUser: {
        select: {
          id: true,
          username: true,
          datingProfile: {
            select: {
              id: true,
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

  return ok({
    items: rows.map((r) => ({
      tappedAt: r.createdAt.toISOString(),
      userId: r.fromUser.id,
      username: r.fromUser.username,
      profileId: r.fromUser.datingProfile?.id ?? null,
      name: r.fromUser.datingProfile?.name ?? null,
      photoUrl: absoluteMediaUrl(r.fromUser.datingProfile?.photos[0]?.url ?? null),
    })),
  });
}

/**
 * Lightweight tap. Does not create a match. Rate-limited; one per pair per 24h.
 * Never notifies with sender name — push payload is neutral + opaque id only.
 */
export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const rate = takeTapRateLimit(auth.user.id);
  if (!rate.ok) return err('RATE_LIMITED', 'Too many taps', { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = likeRequestSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'profileId required', { status: 400 });

  const visible = await getVisibleProfileForViewer({
    viewerId: auth.user.id,
    profileId: parsed.data.profileId,
    includePrivateAlbum: false,
  });
  if (!visible) return err('PROFILE_NOT_VISIBLE', 'Profile is not visible', { status: 404 });

  if (await areUsersBlocked(auth.user.id, visible.userId)) {
    return err('PROFILE_NOT_VISIBLE', 'Profile is not visible', { status: 404 });
  }

  const since = new Date(Date.now() - TAP_WINDOW_MS);
  const recent = await prisma.datingTap.findFirst({
    where: {
      fromUserId: auth.user.id,
      toProfileId: parsed.data.profileId,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (recent) return err('TAP_COOLDOWN', 'Already tapped in the last 24h', { status: 429 });

  const tap = await prisma.datingTap.create({
    data: { fromUserId: auth.user.id, toProfileId: parsed.data.profileId },
  });

  // Payload shape only — APNs not wired yet. Never includes name/text.
  const push = buildDatingPushPayload({ kind: 'tap', id: tap.id, ref: ownProfileRef(visible.id) });

  return ok({ tapped: true, push }, { status: 201 });
}

function ownProfileRef(profileId: string): string {
  return profileId;
}
