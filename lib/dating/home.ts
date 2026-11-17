import { prisma } from '@/lib/prisma';
import { datingFeedVisibleWhere } from '@/lib/dating/feed';
import { onlineSince } from '@/lib/dating/presence';
import { hydrateDatingProfile, type DatingProfileView } from '@/lib/dating/shared';
import { serializePublicProfile } from '@/lib/dating/serialize';
import { ensureDatabaseUrl } from '@/lib/db-url';
import type { DatingCity } from '@/lib/dating/presets';

export const HOME_CARD_LIMIT = 8;

export type HomeActivity = {
  text: string;
  when: string;
  bg: string;
};

const CARD_BGS = [
  'linear-gradient(150deg, #4A2B4F, #8E3B5B)',
  'linear-gradient(150deg, #2E2A4D, #4C3A6B)',
  'linear-gradient(150deg, #5A2F3E, #A14A58)',
  'linear-gradient(150deg, #3A2A46, #6B4063)',
  'linear-gradient(150deg, #2B3550, #48566F)',
  'linear-gradient(150deg, #56303C, #8E4F55)',
  'linear-gradient(150deg, #332A4A, #5B4572)',
  'linear-gradient(150deg, #4A2B4F, #8E3B5B)',
];

export function homeCardBackground(seed: string, hasPhoto: boolean): string {
  if (!hasPhoto) return '#1B1722';
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n + seed.charCodeAt(i) * (i + 1)) % CARD_BGS.length;
  return CARD_BGS[n] ?? CARD_BGS[0];
}

export function fillHomeCopy(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

function minutesAgoLabel(
  at: Date,
  now: number,
  labels: { justNow: string; minutesAgo: string },
): string {
  const mins = Math.max(0, Math.round((now - at.getTime()) / 60000));
  if (mins < 2) return labels.justNow;
  return fillHomeCopy(labels.minutesAgo, { n: Math.min(mins, 59) });
}

export type HomeFeed = {
  profiles: DatingProfileView[];
  profileCount: number;
  onlineCount: number;
  newToday: number;
  activity: HomeActivity[];
};

export async function loadHomeFeed(opts: {
  city: DatingCity | null;
  onlineOnly: boolean;
  ageMax: number | null;
  labels: {
    joined: string;
    newProfileIn: string;
    justNow: string;
    minutesAgo: string;
    cityLabels: Record<DatingCity, string>;
  };
}): Promise<HomeFeed> {
  const empty: HomeFeed = {
    profiles: [],
    profileCount: 0,
    onlineCount: 0,
    newToday: 0,
    activity: [],
  };
  if (!ensureDatabaseUrl()) return empty;

  const now = Date.now();
  const visible = datingFeedVisibleWhere();
  const ageFilter =
    opts.ageMax != null
      ? { age: { gte: 18, lte: opts.ageMax } }
      : {};
  const cityFilter = opts.city ? { city: opts.city } : {};
  const onlineFilter = opts.onlineOnly
    ? { user: { lastActiveAt: { gte: onlineSince(now) } } }
    : {};

  try {
    const [rows, profileCount, onlineCount, newToday, recent] = await Promise.all([
      prisma.datingProfile.findMany({
        where: {
          ...visible,
          ...ageFilter,
          ...cityFilter,
          ...onlineFilter,
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
          photos: {
            where: { status: 'approved', visibility: 'public' },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: HOME_CARD_LIMIT,
      }),
      prisma.datingProfile.count({ where: visible }),
      prisma.datingProfile.count({
        where: {
          ...visible,
          user: { lastActiveAt: { gte: onlineSince(now) } },
        },
      }),
      prisma.datingProfile.count({
        where: {
          ...visible,
          createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.datingProfile.findMany({
        where: visible,
        include: {
          user: { select: { username: true, lastActiveAt: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
    ]);

    const profiles = rows.map((row) => hydrateDatingProfile(serializePublicProfile(row)));
    const activity: HomeActivity[] = recent.map((row, i) => {
      const name = row.name?.trim() || row.user.username;
      const place = opts.labels.cityLabels[(row.city as DatingCity) ?? 'other'] ?? row.city;
      const online = now - row.user.lastActiveAt.getTime() < 15 * 60 * 1000;
      return {
        text: online
          ? fillHomeCopy(opts.labels.joined, { name })
          : fillHomeCopy(opts.labels.newProfileIn, { place }),
        when: minutesAgoLabel(online ? row.user.lastActiveAt : row.updatedAt, now, opts.labels),
        bg: CARD_BGS[i % CARD_BGS.length] ?? CARD_BGS[0],
      };
    });

    return { profiles, profileCount, onlineCount, newToday, activity };
  } catch (err) {
    console.error('[home] feed load failed', err);
    if (process.env.NODE_ENV !== 'production') throw err;
    return empty;
  }
}
