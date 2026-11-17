import Link from 'next/link';
import { DatingBlurHero } from '@/components/dating/DatingBlurHero';
import { DatingFiltersSheet } from '@/components/dating/DatingFiltersSheet';
import { DatingInfiniteGrid } from '@/components/dating/DatingInfiniteGrid';
import {
  LocationConfirm,
  type LocationConfirmLabels,
} from '@/components/dating/LocationConfirm';
import { DATING_CREATE_NEXT, loginHrefWithNext } from '@/lib/auth/next-paths';
import type { DatingProfileView } from '@/lib/dating/shared';
import {
  type DatingCity,
  type DatingGenderBucket,
  type DatingShowMe,
} from '@/lib/dating/presets';
import type { DatingFilterDistance } from '@/lib/dating/attributes';
import type { DiscoveryFilters } from '@/lib/dating/discovery-filters';
import {
  countActiveDiscoveryFilters,
  discoveryFiltersToSearchParams,
  EMPTY_DISCOVERY_FILTERS,
} from '@/lib/dating/discovery-filters';
import { datingHomePath, localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';
import type { DatingFiltersSheetLabels } from '@/components/dating/DatingFiltersSheet';

type Labels = {
  title: string;
  lead: string;
  howItWorks: string;
  introTitle: string;
  introBody: string;
  steps: [string, string, string];
  close: string;
  editProfile: string;
  loginToCreate: string;
  city: string;
  cityLabels: Record<DatingCity, string>;
  filterAll: string;
  filterMale: string;
  filterFemale: string;
  filterTrans: string;
  noProfiles: string;
  noProfilesHint: string;
  noPhoto: string;
  datingSublabel?: string;
  viewProfile: string;
  loadMore: string;
  gender: string;
  genderLabels: Record<DatingGenderBucket, string>;
  showMeLabels: Record<DatingShowMe, string>;
  heroTitle: string;
  heroMeta: string;
  heroLead: string;
  heroCta: string;
  discoverTitle: string;
  filtersOpen: string;
  filtersTitle: string;
  filtersClose: string;
  filtersApply: string;
  filtersReset: string;
  filtersLookingFor: string;
  filtersCityAny: string;
  filtersAge: string;
  filtersHeight: string;
  filtersDistance: string;
  filtersOnlineOnly: string;
  filtersBodyType: string;
  filtersRelationship: string;
  filtersLookingForTags: string;
  filtersMeetAt: string;
  filtersLanguages: string;
  filtersPosition: string;
  filtersCount: string;
  filterDistanceLabels: Record<DatingFilterDistance, string>;
  attributeLabels: DatingFiltersSheetLabels['attributeLabels'];
  filtersSoon: string;
  filtersSoonHint: string;
  blurLockHint: string;
  like: string;
  unlike: string;
  liked: string;
  matchTitle: string;
  matchBody: string;
  matchCta: string;
  matchClose: string;
  restrictionTitle?: string;
  restrictionHiddenHint?: string;
  restrictionPhotoHint?: string;
  restrictionManageCta?: string;
  pendingTitle?: string;
  pendingHint?: string;
  blurPendingBadge?: string;
  blurPendingTitle?: string;
  blurPendingHint?: string;
  blurRejectedBadge?: string;
  blurRejectedTitle?: string;
  blurRejectedReasonLabel?: string;
  onlineNow: string;
  distanceBuckets: Record<'<1km' | '1-3km' | '3-10km' | '10km+', string>;
  locationPrimer: LocationConfirmLabels;
};

type Props = {
  locale: Locale;
  user: { id: string } | null;
  hasDatingProfile: boolean;
  unlocked: boolean;
  profileCount: number;
  likedProfileIds: string[];
  /** Effective gender filter applied to the feed. */
  bucket: DatingGenderBucket | null;
  /** User's saved showMe preference (for chip active state). */
  preferredShowMe: DatingShowMe;
  /** True when user explicitly chose "everyone" via ?view=all */
  viewAll: boolean;
  city: DatingCity | null;
  /** Full discovery filter set from the URL. */
  filters: DiscoveryFilters;
  pageSize: number;
  initialCursor?: string | null;
  profiles: DatingProfileView[];
  restriction?: { status: 'pending' | 'hidden' | 'blocked'; reason: string | null } | null;
  /** True when the logged-in user has a dating profile without a geohash cell. */
  missingLocation?: boolean;
  labels: Labels;
};

export function DatingBrowseView({
  locale,
  user,
  hasDatingProfile,
  unlocked,
  profileCount,
  likedProfileIds,
  bucket,
  preferredShowMe,
  viewAll,
  city,
  filters,
  pageSize,
  initialCursor = null,
  profiles,
  restriction,
  missingLocation = false,
  labels,
}: Props) {
  const lockStatus =
    restriction?.status === 'pending' || restriction?.status === 'hidden'
      ? restriction.status
      : null;
  const isLocked = !unlocked;
  const showHero = isLocked && !hasDatingProfile;
  const manageHref = localePath(locale, DATING_CREATE_NEXT);
  const createProfileHref = user
    ? localePath(locale, DATING_CREATE_NEXT)
    : loginHrefWithNext(DATING_CREATE_NEXT, locale);

  const allActive =
    viewAll || (!bucket && (preferredShowMe === 'everyone' || isLocked));
  const activeBucket = viewAll ? null : bucket;

  const effectiveFilters: DiscoveryFilters = {
    ...filters,
    bucket: activeBucket,
    viewAll: allActive,
    city,
  };
  const feedQuery = discoveryFiltersToSearchParams(effectiveFilters).toString();
  const activeFilterCount = countActiveDiscoveryFilters(effectiveFilters);

  function browseHref(
    options: Partial<DiscoveryFilters> & {
      bucket?: DatingGenderBucket | null;
      city?: DatingCity | null;
      viewAll?: boolean;
    },
  ): string {
    const next = discoveryFiltersToSearchParams({
      ...filters,
      ...options,
      bucket: options.viewAll ? null : (options.bucket ?? filters.bucket),
      viewAll: Boolean(options.viewAll),
      city: options.city === undefined ? city : options.city,
    });
    const query = next.toString();
    const home = datingHomePath(locale);
    return query ? `${home}?${query}` : home;
  }

  function clearAllFilters(): string {
    return browseHref({ ...EMPTY_DISCOVERY_FILTERS, viewAll: true, city: null });
  }

  const bucketLabels: Record<DatingGenderBucket, string> = {
    male: labels.filterMale,
    female: labels.filterFemale,
    trans: labels.filterTrans,
  };

  const activeChips: { key: string; label: string; href: string }[] = [];
  if (activeBucket) {
    activeChips.push({
      key: 'bucket',
      label: bucketLabels[activeBucket],
      href: browseHref({ bucket: null, viewAll: true }),
    });
  }
  if (city) {
    activeChips.push({
      key: 'city',
      label: labels.cityLabels[city],
      href: browseHref({ city: null, viewAll: allActive }),
    });
  }
  if (filters.ageMin != null || filters.ageMax != null) {
    activeChips.push({
      key: 'age',
      label: `${labels.filtersAge} ${filters.ageMin ?? '18'}–${filters.ageMax ?? '99'}`,
      href: browseHref({ ageMin: null, ageMax: null }),
    });
  }
  if (filters.heightMin != null || filters.heightMax != null) {
    activeChips.push({
      key: 'height',
      label: `${labels.filtersHeight} ${filters.heightMin ?? 140}–${filters.heightMax ?? 220}`,
      href: browseHref({ heightMin: null, heightMax: null }),
    });
  }
  if (filters.distance !== 'any') {
    activeChips.push({
      key: 'distance',
      label: labels.filterDistanceLabels[filters.distance],
      href: browseHref({ distance: 'any' }),
    });
  }
  if (filters.onlineOnly) {
    activeChips.push({
      key: 'online',
      label: labels.filtersOnlineOnly,
      href: browseHref({ onlineOnly: false }),
    });
  }
  for (const tag of filters.lookingForTags) {
    activeChips.push({
      key: `look-${tag}`,
      label: labels.attributeLabels.lookingForTags[tag],
      href: browseHref({
        lookingForTags: filters.lookingForTags.filter((t) => t !== tag),
      }),
    });
  }
  for (const bt of filters.bodyType) {
    activeChips.push({
      key: `body-${bt}`,
      label: labels.attributeLabels.bodyType[bt],
      href: browseHref({ bodyType: filters.bodyType.filter((t) => t !== bt) }),
    });
  }

  return (
    <main
      className={`container community-page dating-page${isLocked ? ' dating-page--locked' : ''}${lockStatus ? ` dating-page--${lockStatus}` : ''}`}
    >
      {user ? (
        <LocationConfirm
          enabled
          missingLocation={missingLocation}
          labels={labels.locationPrimer}
        />
      ) : null}
      {showHero ? (
        <DatingBlurHero
          locale={locale}
          isLoggedIn={Boolean(user)}
          profileCount={profileCount}
          labels={{
            title: labels.heroTitle,
            meta: labels.heroMeta,
            lead: labels.heroLead,
            cta: labels.heroCta,
          }}
        />
      ) : null}

      {activeChips.length > 0 ? (
        <div className="dating-active-filters" aria-label={labels.filtersTitle}>
          {activeChips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className="dating-active-filters__chip"
            >
              <span>{chip.label}</span>
              <span aria-hidden>×</span>
            </Link>
          ))}
          {activeFilterCount > 0 ? (
            <Link
              href={clearAllFilters()}
              className="dating-active-filters__clear"
            >
              {labels.filtersReset}
            </Link>
          ) : null}
        </div>
      ) : null}

      {!showHero ? (
        <>
          <DatingFiltersSheet
            locale={locale}
            filters={effectiveFilters}
            labels={{
              filtersOpen: labels.filtersOpen,
              filtersTitle: labels.filtersTitle,
              filtersClose: labels.filtersClose,
              filtersApply: labels.filtersApply,
              filtersReset: labels.filtersReset,
              filtersLookingFor: labels.filtersLookingFor,
              filtersCityAny: labels.filtersCityAny,
              filtersAge: labels.filtersAge,
              filtersHeight: labels.filtersHeight,
              filtersDistance: labels.filtersDistance,
              filtersOnlineOnly: labels.filtersOnlineOnly,
              filtersBodyType: labels.filtersBodyType,
              filtersRelationship: labels.filtersRelationship,
              filtersLookingForTags: labels.filtersLookingForTags,
              filtersMeetAt: labels.filtersMeetAt,
              filtersLanguages: labels.filtersLanguages,
              filtersPosition: labels.filtersPosition,
              filtersCount: labels.filtersCount,
              filterAll: labels.filterAll,
              filterMale: labels.filterMale,
              filterFemale: labels.filterFemale,
              filterTrans: labels.filterTrans,
              city: labels.city,
              cityLabels: labels.cityLabels,
              distanceLabels: labels.filterDistanceLabels,
              attributeLabels: labels.attributeLabels,
            }}
          />
        </>
      ) : null}

      <div className={`dating-browse-stage${isLocked ? ' dating-browse-stage--locked' : ''}`}>
        {isLocked ? (
          <div
            className={`dating-blur-overlay${lockStatus ? ` dating-blur-overlay--${lockStatus}` : ''}`}
            role={lockStatus ? 'status' : undefined}
          >
            {lockStatus === 'pending' ? (
              <div className="dating-blur-overlay__panel">
                <p className="dating-blur-overlay__badge">
                  {labels.blurPendingBadge ?? labels.pendingTitle}
                </p>
                <p className="dating-blur-overlay__title">
                  {labels.blurPendingTitle ?? labels.pendingTitle}
                </p>
                <p className="dating-blur-overlay__hint">
                  {labels.blurPendingHint ?? labels.pendingHint}
                </p>
                <Link href={manageHref} className="dating-blur-overlay__cta">
                  {labels.restrictionManageCta ?? labels.editProfile}
                </Link>
              </div>
            ) : lockStatus === 'hidden' ? (
              <div className="dating-blur-overlay__panel">
                <p className="dating-blur-overlay__badge dating-blur-overlay__badge--rejected">
                  {labels.blurRejectedBadge}
                </p>
                <p className="dating-blur-overlay__title">{labels.blurRejectedTitle}</p>
                {restriction?.reason ? (
                  <p className="dating-blur-overlay__reason">
                    <span className="dating-blur-overlay__reason-label">
                      {labels.blurRejectedReasonLabel}
                    </span>
                    {restriction.reason}
                  </p>
                ) : null}
                {labels.restrictionHiddenHint ? (
                  <p className="dating-blur-overlay__hint">{labels.restrictionHiddenHint}</p>
                ) : null}
                {labels.restrictionPhotoHint ? (
                  <p className="dating-blur-overlay__hint">{labels.restrictionPhotoHint}</p>
                ) : null}
                <Link href={manageHref} className="dating-blur-overlay__cta">
                  {labels.restrictionManageCta ?? labels.editProfile}
                </Link>
              </div>
            ) : (
              <Link href={createProfileHref} className="dating-blur-overlay__cta">
                {hasDatingProfile ? labels.editProfile : labels.heroCta}
              </Link>
            )}
          </div>
        ) : null}

        <DatingInfiniteGrid
          key={feedQuery || `${city ?? 'all'}-${activeBucket ?? 'mix'}`}
          locale={locale}
          initialProfiles={profiles}
          initialHasMore={!isLocked && profiles.length === pageSize}
          initialCursor={initialCursor}
          pageSize={pageSize}
          bucket={activeBucket}
          city={city}
          viewAll={allActive}
          feedQuery={feedQuery}
          likedProfileIds={likedProfileIds}
          locked={isLocked}
          loadMoreLabel={labels.loadMore}
          empty={
            <div className="dating-empty">
              <div className="dating-empty__icon" aria-hidden>
                ♥
              </div>
              <p className="community-sidebar__empty">{labels.noProfiles}</p>
              {user ? (
                <Link href={localePath(locale, DATING_CREATE_NEXT)} className="btn btn--ghost">
                  {labels.noProfilesHint}
                </Link>
              ) : (
                <Link href={createProfileHref} className="btn btn--ghost">
                  {labels.heroCta}
                </Link>
              )}
            </div>
          }
          messages={{
            genderLabels: labels.genderLabels,
            showMeLabels: labels.showMeLabels,
            cityLabels: labels.cityLabels,
            distanceBuckets: labels.distanceBuckets,
            viewProfile: labels.viewProfile,
            noPhoto: labels.noPhoto,
            datingSublabel: labels.datingSublabel,
            onlineNow: labels.onlineNow,
            like: labels.like,
            unlike: labels.unlike,
            liked: labels.liked,
            matchTitle: labels.matchTitle,
            matchBody: labels.matchBody,
            matchCta: labels.matchCta,
            matchClose: labels.matchClose,
          }}
        />
      </div>
    </main>
  );
}
