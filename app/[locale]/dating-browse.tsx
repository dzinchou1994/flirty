import { notFound } from 'next/navigation';
import { DatingBrowseView } from '@/components/dating/DatingBrowseView';
import { DatingMobileChrome } from '@/components/dating/DatingMobileChrome';
import { getSessionUser } from '@/lib/auth/server';
import { datingFeedVisibleWhere, listDiscoveryFeed } from '@/lib/dating/feed';
import { datingBrowseLabels } from '@/lib/dating/browse-labels';
import { hydrateDatingProfile } from '@/lib/dating/shared';
import { genderBucketFromShowMe } from '@/lib/dating/presets';
import { listLockedPreviewProfiles } from '@/lib/dating/locked-preview';
import { viewerFeedUnlocked } from '@/lib/dating/discovery-access';
import {
  countActiveDiscoveryFilters,
  discoveryFiltersFromJson,
  type DiscoveryFilters,
} from '@/lib/dating/discovery-filters';
import { parseDiscoveryFiltersQuery } from '@/lib/api/schemas/discovery-filters';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DatingPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const rawParams = await searchParams;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const d = getDatingDict(locale);
  const user = await getSessionUser();

  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = firstParam(value);
  }
  let filters: DiscoveryFilters = parseDiscoveryFiltersQuery(flat);
  // listDiscoveryFeed caps a page at 24. Paging 645 profiles twelve at a
  // time took ~54 requests against a 60-per-minute discovery limit, so a fast
  // scroller tripped the limiter and the grid stopped dead. 24 halves that.
  const limit = 24;
  const urlHadFilters = countActiveDiscoveryFilters(filters) > 0 || Boolean(flat.view);

  let hasDatingProfile = false;
  let unlocked = false;
  let missingLocation = false;
  let preferredShowMe: 'everyone' | 'male' | 'female' | 'trans' = 'everyone';
  let restriction: { status: 'pending' | 'hidden' | 'blocked'; reason: string | null } | null =
    null;
  let likedProfileIds: string[] = [];
  let profiles: ReturnType<typeof hydrateDatingProfile>[] = [];
  let profileCount = 0;
  let initialCursor: string | null = null;

  // Profiles live in the shared Intimgram DB — no separate import. Always load a
  // public/locked preview for guests; privacy-aware feed only when unlocked.
  if (ensureDatabaseUrl()) {
    try {
      if (user) {
        const [own, preset] = await Promise.all([
          prisma.datingProfile.findUnique({
            where: { userId: user.id },
            include: {
              photos: { where: { status: 'approved' }, take: 1 },
              user: { select: { lastActiveAt: true } },
            },
          }),
          !urlHadFilters
            ? prisma.datingFilterPreset.findUnique({ where: { userId: user.id } })
            : Promise.resolve(null),
        ]);
        if (preset?.filters) {
          const restored = discoveryFiltersFromJson(preset.filters);
          if (restored) filters = restored;
        }
        if (own) {
          hasDatingProfile = true;
          preferredShowMe = (own.showMe as typeof preferredShowMe) || 'everyone';
          missingLocation = !own.geohashCell;
          unlocked = viewerFeedUnlocked(own);
          if (
            own.moderationStatus === 'hidden' ||
            own.moderationStatus === 'pending' ||
            own.moderationStatus === 'blocked'
          ) {
            restriction = {
              status: own.moderationStatus,
              reason: own.moderationReason,
            };
          }
        }
      }

      const effectiveBucket = filters.viewAll
        ? null
        : (filters.bucket ??
          (unlocked ? genderBucketFromShowMe(preferredShowMe) : null));

      if (unlocked && user) {
        const feedFilters: DiscoveryFilters = {
          ...filters,
          bucket: effectiveBucket,
          viewAll: filters.viewAll || !effectiveBucket,
          city: filters.city,
        };
        const [page, likes] = await Promise.all([
          listDiscoveryFeed({
            viewerId: user.id,
            filters: feedFilters,
            limit,
          }),
          prisma.datingLike.findMany({
            where: { fromUserId: user.id },
            select: { toProfileId: true },
            take: 500,
          }),
        ]);
        likedProfileIds = likes.map((l) => l.toProfileId);
        if (page.ok) {
          profiles = page.items.map((p) => hydrateDatingProfile(p));
          initialCursor = page.nextCursor;
        }
      } else {
        // Hero count is only shown for locked/guest — skip the expensive
        // EXISTS count when the user is already browsing unlocked.
        const needsCount = !unlocked;
        const [preview, count] = await Promise.all([
          listLockedPreviewProfiles({
            limit,
            city: filters.city,
            bucket: effectiveBucket,
            filters,
          }),
          needsCount
            ? prisma.datingProfile.count({ where: datingFeedVisibleWhere() })
            : Promise.resolve(0),
        ]);
        profiles = preview;
        profileCount = count;
      }
    } catch (err) {
      // Swallowing this turned a schema error into a silent "no profiles
      // here", which is very hard to diagnose. Fail loudly in development.
      console.error('[gatsnoba] feed load failed', err);
      if (process.env.NODE_ENV !== 'production') throw err;
    }
  }

  const viewAll = filters.viewAll;
  const city = filters.city;
  const bucket = viewAll
    ? null
    : (filters.bucket ?? (unlocked ? genderBucketFromShowMe(preferredShowMe) : null));

  return (
    <>
      <DatingMobileChrome locale={locale} labels={{ backHome: d.backToBrowse, title: d.title }} />
      <DatingBrowseView
        locale={locale}
        user={user}
        hasDatingProfile={hasDatingProfile}
        unlocked={unlocked}
        profileCount={profileCount}
        likedProfileIds={likedProfileIds}
        bucket={bucket}
        preferredShowMe={preferredShowMe}
        viewAll={viewAll}
        city={city}
        filters={filters}
        pageSize={limit}
        initialCursor={initialCursor}
        profiles={profiles}
        restriction={restriction?.status === 'blocked' ? null : restriction}
        missingLocation={missingLocation}
        labels={datingBrowseLabels(d)}
      />
    </>
  );
}
