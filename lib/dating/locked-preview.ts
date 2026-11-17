import { prisma } from '@/lib/prisma';
import { datingFeedVisibleWhere } from '@/lib/dating/feed';
import { serializePublicProfile } from '@/lib/dating/serialize';
import { hydrateDatingProfile, type DatingProfileView } from '@/lib/dating/shared';
import type { DatingCity, DatingGenderBucket } from '@/lib/dating/presets';

const LOCKED_INCLUDE = {
  user: {
    select: {
      username: true,
      avatar: true,
      gender: true,
      lastActiveAt: true,
    },
  },
  photos: {
    where: { status: 'approved' as const },
    orderBy: { sortOrder: 'asc' as const },
    take: 3,
  },
} as const;

function baseWhere(city: DatingCity | null) {
  return {
    ...datingFeedVisibleWhere(),
    ...(city ? { city } : {}),
  };
}

/**
 * Guest / locked blur grid: when no gender filter is set, bias the start of
 * the list so ~70% of cards are women (genderBucket=female).
 */
export async function listLockedPreviewProfiles(opts: {
  limit: number;
  city: DatingCity | null;
  bucket: DatingGenderBucket | null;
}): Promise<DatingProfileView[]> {
  const { limit, city, bucket } = opts;
  const where = baseWhere(city);

  if (bucket) {
    const rows = await prisma.datingProfile.findMany({
      where: { ...where, genderBucket: bucket },
      include: LOCKED_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => hydrateDatingProfile(serializePublicProfile(r)));
  }

  const femaleTarget = Math.max(1, Math.round(limit * 0.7));
  const otherTarget = Math.max(0, limit - femaleTarget);

  const [femaleRows, otherRows] = await Promise.all([
    prisma.datingProfile.findMany({
      where: { ...where, genderBucket: 'female' },
      include: LOCKED_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: femaleTarget,
    }),
    prisma.datingProfile.findMany({
      where: { ...where, genderBucket: { not: 'female' } },
      include: LOCKED_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: Math.max(otherTarget, limit),
    }),
  ]);

  const females = femaleRows.map((r) =>
    hydrateDatingProfile(serializePublicProfile(r)),
  );
  const others = otherRows.map((r) =>
    hydrateDatingProfile(serializePublicProfile(r)),
  );

  // Women first (~70% of the teaser), then everyone else to fill.
  const merged = [...females, ...others];
  const seen = new Set<string>();
  const out: DatingProfileView[] = [];
  for (const p of merged) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= limit) break;
  }

  // If not enough women, backfill from others already fetched.
  if (out.length < limit) {
    for (const p of others) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= limit) break;
    }
  }

  return out;
}
