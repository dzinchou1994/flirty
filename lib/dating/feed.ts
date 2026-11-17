import 'server-only';

import { prisma } from '@/lib/prisma';
import { rankDiscovery, type Rankable } from '@/lib/dating/rank';
import { loadPrivacyViewer, privacyWhereForViewer } from '@/lib/dating/privacy';
import { decodeCursor, encodeCursor } from '@/lib/dating/cursor';
import { serializePublicProfile } from '@/lib/dating/serialize';
import { takeDiscoveryRateLimit } from '@/lib/dating/rate-limit';
import {
  bucketRank,
  distanceBucketBetweenCells,
  type DistanceBucket,
} from '@/lib/dating/geohash';
import { presenceFromLastActive, onlineSince } from '@/lib/dating/presence';
import {
  parseDatingGenderBucket,
  type DatingCity,
  type DatingGenderBucket,
} from '@/lib/dating/presets';
import {
  discoveryAttributeWhere,
  discoveryPassExclusions,
  distanceBucketAllowed,
  EMPTY_DISCOVERY_FILTERS,
  parseDiscoveryFilters,
  type DiscoveryFilters,
} from '@/lib/dating/discovery-filters';

/** Grid cards only need a couple of public covers — not the full album. */
const gridPhotos = {
  where: { status: 'approved' as const, visibility: 'public' as const },
  orderBy: { sortOrder: 'asc' as const },
  take: 3,
};

const gridUser = {
  select: { username: true, avatar: true, gender: true, lastActiveAt: true },
};

/** Cap how many lean rows we rank for distance sort (tunneled DB friendly). */
/**
 * How many candidates the distance-ranked branch pulls before sorting.
 *
 * This is a hard ceiling on the whole feed, not just the first page: the
 * cursor indexes into the ranked array built from this window, so a viewer
 * with a location could never see more than 120 profiles however far they
 * scrolled — 117 after the distance filter, against 782 visible ones.
 *
 * 1000 covers the entire visible population today. Past a few thousand
 * profiles the ranking has to move into SQL (geohash prefix buckets) instead
 * of being done in memory; this constant is not a substitute for that.
 */
const DISTANCE_RANK_WINDOW = 1000;

export function datingFeedVisibleWhere() {
  return {
    isVisible: true,
    moderationStatus: 'active',
    // Everyone published and in good standing is discoverable. A bio and a
    // photo used to be hard requirements, which hid most of the population:
    // 782 of ~700+ accounts passed, and the viewer saw a fraction of that.
    // Who leads is now a ranking question, not a visibility one — see
    // rankDiscovery(): online first, then photographed, then distance.
  };
}

export type DiscoveryFeedItem = ReturnType<typeof serializePublicProfile> & {
  distanceBucket?: DistanceBucket | null;
  presence?: ReturnType<typeof presenceFromLastActive> | null;
};

export type DiscoveryFeedInput = {
  viewerId: string;
  filters?: DiscoveryFilters | null;
  /** @deprecated Prefer filters.bucket — kept for call sites mid-migration. */
  bucket?: string | null;
  /** @deprecated Prefer filters.city */
  city?: string | null;
  cursor?: string | null;
  limit: number;
};

function resolveFilters(input: DiscoveryFeedInput): DiscoveryFilters {
  if (input.filters) return input.filters;
  return {
    ...EMPTY_DISCOVERY_FILTERS,
    bucket: input.bucket ? parseDatingGenderBucket(input.bucket) : null,
    city: input.city
      ? (parseDiscoveryFilters({ city: input.city }).city as DatingCity | null)
      : null,
  };
}

async function buildDiscoveryWhere(input: {
  viewerId: string;
  filters: DiscoveryFilters;
}) {
  const [viewer, own] = await Promise.all([
    loadPrivacyViewer(input.viewerId),
    prisma.datingProfile.findUnique({
      where: { userId: input.viewerId },
      select: { id: true, showMe: true, geohashCell: true },
    }),
  ]);

  const privacy = privacyWhereForViewer(viewer);
  const genderBucket: DatingGenderBucket | null = input.filters.viewAll
    ? null
    : input.filters.bucket ??
      (own?.showMe && own.showMe !== 'everyone'
        ? parseDatingGenderBucket(own.showMe)
        : null);

  const where = {
    AND: [
      datingFeedVisibleWhere(),
      privacy,
      ...discoveryPassExclusions(input.viewerId),
      ...(genderBucket ? [{ genderBucket }] : []),
      ...(input.filters.city ? [{ city: input.filters.city }] : []),
      ...discoveryAttributeWhere(input.filters),
    ],
  };

  return { where, own, genderBucket };
}

/**
 * Discovery feed. When the viewer has a geohash cell, results are ordered
 * Grindr-style by distance bucket then lastActiveAt. Otherwise by updatedAt.
 *
 * Attribute filters run in SQL (null = unknown, never excluded). Distance
 * max is applied on the ranked lean window before the page is sliced — still
 * server-side, never over a fetched client page.
 */
export async function listDiscoveryFeed(
  input: DiscoveryFeedInput,
): Promise<
  | { ok: true; items: DiscoveryFeedItem[]; nextCursor: string | null }
  | { ok: false; code: 'RATE_LIMITED' }
> {
  const rate = takeDiscoveryRateLimit(input.viewerId);
  if (!rate.ok) return { ok: false, code: 'RATE_LIMITED' };

  const limit = Math.min(24, Math.max(1, input.limit));
  const filters = resolveFilters(input);
  const cursor = decodeCursor(input.cursor);
  const { where, own } = await buildDiscoveryWhere({
    viewerId: input.viewerId,
    filters,
  });

  const viewerCell = own?.geohashCell ?? null;

  if (!viewerCell) {
    const rows = await prisma.datingProfile.findMany({
      where: {
        AND: [
          ...where.AND,
          ...(cursor?.u && cursor?.i
            ? [
                {
                  OR: [
                    { updatedAt: { lt: new Date(cursor.u) } },
                    { updatedAt: new Date(cursor.u), id: { lt: cursor.i } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
        user: gridUser,
        photos: gridPhotos,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ u: last.updatedAt.toISOString(), i: last.id })
        : null;

    return {
      ok: true,
      items: page.map((row) => serializePublicProfile(row)),
      nextCursor,
    };
  }

  // Lean rank: ids + cells only (no photos / prompts over the tunnel).
  const lean = await prisma.datingProfile.findMany({
    where,
    select: {
      id: true,
      geohashCell: true,
      presenceEnabled: true,
      genderBucket: true,
      photos: { where: { status: 'approved' }, select: { id: true }, take: 1 },
      user: { select: { lastActiveAt: true } },
    },
    // Without an explicit order the window was whatever Postgres returned,
    // so the same request could yield a different 120 each time and the
    // cursor's findIndex could land on a row that had moved or vanished.
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: DISTANCE_RANK_WINDOW,
  });

  type Ranked = Rankable & {
    distanceBucket: DistanceBucket;
    presence: ReturnType<typeof presenceFromLastActive>;
  };

  const onlineCutoff = onlineSince().getTime();

  const candidates: Ranked[] = lean
    .map((row) => {
      let distanceBucket = distanceBucketBetweenCells(viewerCell, row.geohashCell);
      if (!row.presenceEnabled) {
        distanceBucket = '10km+';
      }
      return {
        id: row.id,
        genderBucket: row.genderBucket,
        isOnline:
          row.presenceEnabled && row.user.lastActiveAt.getTime() >= onlineCutoff,
        hasPhoto: row.photos.length > 0,
        distanceRank: bucketRank(distanceBucket),
        lastActive: row.user.lastActiveAt.getTime(),
        distanceBucket,
        presence: presenceFromLastActive(row.user.lastActiveAt, row.presenceEnabled),
      };
    })
    .filter((row) => distanceBucketAllowed(row.distanceBucket, filters.distance));

  // Online first, then photographed, then nearest — and interleaved by gender
  // so the grid never opens as one long run of whichever gender happens to be
  // more active. See lib/dating/rank.ts.
  const ranked: Ranked[] = rankDiscovery(candidates);

  let start = 0;
  if (cursor?.i) {
    const idx = ranked.findIndex((r) => r.id === cursor.i);
    start = idx >= 0 ? idx + 1 : 0;
  }

  const pageMeta = ranked.slice(start, start + limit);
  const hasMore = ranked.length > start + limit;
  const last = pageMeta[pageMeta.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ i: last.id }) : null;

  if (pageMeta.length === 0) {
    return { ok: true, items: [], nextCursor: null };
  }

  const pageIds = pageMeta.map((p) => p.id);
  const rows = await prisma.datingProfile.findMany({
    where: { id: { in: pageIds } },
    include: {
      user: gridUser,
      photos: gridPhotos,
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const metaById = new Map(pageMeta.map((p) => [p.id, p]));

  return {
    ok: true,
    items: pageIds.flatMap((id) => {
      const row = byId.get(id);
      const meta = metaById.get(id);
      if (!row || !meta) return [];
      return [
        {
          ...serializePublicProfile(row),
          distanceBucket: meta.distanceBucket,
          presence: meta.presence === 'hidden' ? null : meta.presence,
        },
      ];
    }),
    nextCursor,
  };
}

/** Same WHERE as the feed — for the live "N პროფილი" count in the filter sheet. */
export async function countDiscoveryFeed(input: {
  viewerId: string;
  filters?: DiscoveryFilters | null;
}): Promise<{ ok: true; count: number } | { ok: false; code: 'RATE_LIMITED' }> {
  const rate = takeDiscoveryRateLimit(`count:${input.viewerId}`);
  if (!rate.ok) return { ok: false, code: 'RATE_LIMITED' };

  const filters = input.filters ?? EMPTY_DISCOVERY_FILTERS;
  const { where, own } = await buildDiscoveryWhere({
    viewerId: input.viewerId,
    filters,
  });

  // Distance filter needs geohash ranking; approximate with lean window size.
  if (own?.geohashCell && filters.distance !== 'any') {
    const lean = await prisma.datingProfile.findMany({
      where,
      select: {
        id: true,
        geohashCell: true,
        presenceEnabled: true,
      },
      take: DISTANCE_RANK_WINDOW,
    });
    const count = lean.filter((row) => {
      let bucket = distanceBucketBetweenCells(own.geohashCell, row.geohashCell);
      if (!row.presenceEnabled) bucket = '10km+';
      return distanceBucketAllowed(bucket, filters.distance);
    }).length;
    return { ok: true, count };
  }

  const count = await prisma.datingProfile.count({ where });
  return { ok: true, count };
}

export async function getVisibleProfileForViewer(input: {
  viewerId: string;
  username?: string;
  profileId?: string;
  /** When true, include private photos if grant exists (signed URLs). */
  includePrivateAlbum?: boolean;
}) {
  const viewer = await loadPrivacyViewer(input.viewerId);
  const privacy = privacyWhereForViewer(viewer);

  const row = await prisma.datingProfile.findFirst({
    where: {
      AND: [
        datingFeedVisibleWhere(),
        privacy,
        input.profileId ? { id: input.profileId } : {},
        input.username
          ? { user: { username: { equals: input.username, mode: 'insensitive' } } }
          : {},
      ],
    },
    include: {
      user: { select: { username: true, avatar: true, gender: true, lastActiveAt: true } },
      photos: {
        where: { status: 'approved' },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!row) return null;

  let hasAlbumGrant = input.viewerId === row.userId;
  if (!hasAlbumGrant && (input.includePrivateAlbum ?? true)) {
    const grant = await prisma.datingAlbumGrant.findUnique({
      where: {
        ownerUserId_viewerUserId: {
          ownerUserId: row.userId,
          viewerUserId: input.viewerId,
        },
      },
      select: { id: true },
    });
    hasAlbumGrant = Boolean(grant);
  }

  return serializePublicProfile(row, {
    viewerId: input.viewerId,
    includePrivateAlbum: input.includePrivateAlbum ?? true,
    hasAlbumGrant,
  });
}
