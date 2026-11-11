import 'server-only';

import { prisma } from '@/lib/prisma';
import { loadPrivacyViewer, privacyWhereForViewer } from '@/lib/dating/privacy';
import { decodeCursor, encodeCursor } from '@/lib/dating/cursor';
import { serializePublicProfile } from '@/lib/dating/serialize';
import {
  bucketRank,
  distanceBucketBetweenCells,
  type DistanceBucket,
} from '@/lib/dating/geohash';
import { presenceFromLastActive, onlineSince } from '@/lib/dating/presence';
import {
  parseDatingCity,
  parseDatingGenderBucket,
  type DatingCity,
  type DatingGenderBucket,
} from '@/lib/dating/presets';
import { takeDiscoveryRateLimit } from '@/lib/dating/rate-limit';

const approvedPublicPhotos = {
  where: { status: 'approved' as const, visibility: 'public' as const },
  orderBy: { sortOrder: 'asc' as const },
};

function visibleBase() {
  return {
    isVisible: true,
    moderationStatus: 'active',
    bio: { not: '' },
    // Same rule as the discovery feed: no public photo is fine while online.
    OR: [
      { photos: { some: { status: 'approved', visibility: 'public' } } },
      { user: { lastActiveAt: { gte: onlineSince() } } },
    ],
  };
}

/**
 * Cursor-paginated nearby grid ordered by distance bucket then lastActiveAt.
 * Distance is a bucket label only — never metres, coords, or bearing.
 */
export async function listNearbyGrid(input: {
  viewerId: string;
  bucket?: string | null;
  city?: string | null;
  cursor?: string | null;
  limit: number;
}): Promise<
  | { ok: true; items: unknown[]; nextCursor: string | null }
  | { ok: false; code: 'RATE_LIMITED' | 'LOCATION_REQUIRED' }
> {
  const rate = takeDiscoveryRateLimit(input.viewerId);
  if (!rate.ok) return { ok: false, code: 'RATE_LIMITED' };

  const limit = Math.min(24, Math.max(1, input.limit));
  const genderFilter = input.bucket ? parseDatingGenderBucket(input.bucket) : null;
  const city = input.city ? parseDatingCity(input.city) : null;
  const cursor = decodeCursor(input.cursor);

  const viewer = await loadPrivacyViewer(input.viewerId);
  const own = await prisma.datingProfile.findUnique({
    where: { userId: input.viewerId },
    select: {
      id: true,
      geohashCell: true,
      showMe: true,
      presenceEnabled: true,
    },
  });
  if (!own?.geohashCell) return { ok: false, code: 'LOCATION_REQUIRED' };

  const genderBucket: DatingGenderBucket | null =
    genderFilter ??
    (own.showMe && own.showMe !== 'everyone'
      ? parseDatingGenderBucket(own.showMe)
      : null);

  const privacy = privacyWhereForViewer(viewer);

  const rows = await prisma.datingProfile.findMany({
    where: {
      AND: [
        visibleBase(),
        privacy,
        { userId: { not: input.viewerId } },
        { geohashCell: { not: null } },
        ...(genderBucket ? [{ genderBucket }] : []),
        ...(city ? [{ city: city as DatingCity }] : []),
      ],
    },
    include: {
      user: {
        select: {
          username: true,
          avatar: true,
          gender: true,
          lastActiveAt: true,
        },
      },
      photos: approvedPublicPhotos,
    },
    take: 400,
  });

  type Ranked = {
    rank: number;
    lastActive: number;
    id: string;
    distanceBucket: DistanceBucket;
    presence: ReturnType<typeof presenceFromLastActive>;
    row: (typeof rows)[number];
  };

  const ranked: Ranked[] = rows.map((row) => {
    let distanceBucket = distanceBucketBetweenCells(
      own.geohashCell,
      row.geohashCell,
    );
    if (!row.presenceEnabled) {
      distanceBucket = '10km+';
    }
    return {
      rank: bucketRank(distanceBucket),
      lastActive: row.user.lastActiveAt.getTime(),
      id: row.id,
      distanceBucket,
      presence: presenceFromLastActive(row.user.lastActiveAt, row.presenceEnabled),
      row,
    };
  });

  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.lastActive !== b.lastActive) return b.lastActive - a.lastActive;
    return a.id < b.id ? 1 : -1;
  });

  let start = 0;
  if (cursor?.i) {
    const idx = ranked.findIndex((r) => r.id === cursor.i);
    start = idx >= 0 ? idx + 1 : 0;
  }

  const page = ranked.slice(start, start + limit);
  const hasMore = ranked.length > start + limit;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ i: last.id }) : null;

  return {
    ok: true,
    items: page.map((item) => ({
      ...serializePublicProfile(item.row),
      distanceBucket: item.distanceBucket,
      presence: item.presence === 'hidden' ? null : item.presence,
    })),
    nextCursor,
  };
}
