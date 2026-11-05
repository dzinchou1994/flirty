/**
 * Shared discovery filter shape + Prisma WHERE helpers.
 * Null / empty attribute values are treated as "unknown" and must NOT exclude
 * a profile when that field is filtered on.
 */

import type { Prisma } from '@prisma/client';
import {
  clampAge,
  clampHeight,
  DATING_AGE_MAX,
  DATING_AGE_MIN,
  DATING_FILTER_DISTANCES,
  DATING_HEIGHT_MAX,
  DATING_HEIGHT_MIN,
  parseBodyType,
  parseCommunityTags,
  parseFilterDistance,
  parseLanguages,
  parseLookingForTags,
  parseMeetAt,
  parsePosition,
  parseRelationshipStatus,
  type DatingBodyType,
  type DatingCommunityTag,
  type DatingFilterDistance,
  type DatingLanguage,
  type DatingLookingForTag,
  type DatingMeetAt,
  type DatingPosition,
  type DatingRelationshipStatus,
} from '@/lib/dating/attributes';
import {
  parseDatingCity,
  parseDatingGenderBucket,
  type DatingCity,
  type DatingGenderBucket,
} from '@/lib/dating/presets';
import { bucketRank, type DistanceBucket } from '@/lib/dating/geohash';

export type DiscoveryFilters = {
  bucket: DatingGenderBucket | null;
  /** Explicit everyone override (?view=all). */
  viewAll: boolean;
  city: DatingCity | null;
  ageMin: number | null;
  ageMax: number | null;
  heightMin: number | null;
  heightMax: number | null;
  distance: DatingFilterDistance;
  onlineOnly: boolean;
  bodyType: DatingBodyType[];
  relationshipStatus: DatingRelationshipStatus[];
  lookingForTags: DatingLookingForTag[];
  meetAt: DatingMeetAt[];
  languages: DatingLanguage[];
  position: DatingPosition[];
  communityTags: DatingCommunityTag[];
};

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = {
  bucket: null,
  viewAll: false,
  city: null,
  ageMin: null,
  ageMax: null,
  heightMin: null,
  heightMax: null,
  distance: 'any',
  onlineOnly: false,
  bodyType: [],
  relationshipStatus: [],
  lookingForTags: [],
  meetAt: [],
  languages: [],
  position: [],
  communityTags: [],
};

function csv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function intOrNull(raw: string | null, clamp: (n: number) => number): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return clamp(n);
}

/** Restore a persisted DatingFilterPreset.filters JSON blob. */
export function discoveryFiltersFromJson(raw: unknown): DiscoveryFilters | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const asCsv = (v: unknown): string =>
    Array.isArray(v) ? v.map(String).join(',') : v == null ? '' : String(v);
  return parseDiscoveryFilters({
    bucket: o.bucket == null ? undefined : String(o.bucket),
    view: o.viewAll ? 'all' : undefined,
    city: o.city == null ? undefined : String(o.city),
    ageMin: o.ageMin == null ? undefined : String(o.ageMin),
    ageMax: o.ageMax == null ? undefined : String(o.ageMax),
    heightMin: o.heightMin == null ? undefined : String(o.heightMin),
    heightMax: o.heightMax == null ? undefined : String(o.heightMax),
    distance: o.distance == null ? undefined : String(o.distance),
    onlineOnly: o.onlineOnly ? '1' : undefined,
    bodyType: asCsv(o.bodyType) || undefined,
    relationshipStatus: asCsv(o.relationshipStatus) || undefined,
    lookingForTags: asCsv(o.lookingForTags) || undefined,
    meetAt: asCsv(o.meetAt) || undefined,
    languages: asCsv(o.languages) || undefined,
    position: asCsv(o.position) || undefined,
    communityTags: asCsv(o.communityTags) || undefined,
  });
}

/** Parse URLSearchParams / record into a DiscoveryFilters object. */
export function parseDiscoveryFilters(
  input: URLSearchParams | Record<string, string | undefined | null>,
): DiscoveryFilters {
  const get = (key: string): string | null => {
    if (input instanceof URLSearchParams) return input.get(key);
    const v = input[key];
    return v == null || v === '' ? null : String(v);
  };

  const view = get('view');
  const bucketRaw = get('bucket');
  const distance = parseFilterDistance(get('distance')) ?? 'any';

  let ageMin = intOrNull(get('ageMin'), clampAge);
  let ageMax = intOrNull(get('ageMax'), clampAge);
  if (ageMin != null && ageMax != null && ageMin > ageMax) {
    const t = ageMin;
    ageMin = ageMax;
    ageMax = t;
  }

  let heightMin = intOrNull(get('heightMin'), clampHeight);
  let heightMax = intOrNull(get('heightMax'), clampHeight);
  if (heightMin != null && heightMax != null && heightMin > heightMax) {
    const t = heightMin;
    heightMin = heightMax;
    heightMax = t;
  }

  const onlineRaw = get('onlineOnly');
  const onlineOnly = onlineRaw === '1' || onlineRaw === 'true';

  return {
    bucket: parseDatingGenderBucket(bucketRaw ?? ''),
    viewAll: view === 'all',
    city: parseDatingCity(get('city') ?? ''),
    ageMin,
    ageMax,
    heightMin,
    heightMax,
    distance: DATING_FILTER_DISTANCES.includes(distance) ? distance : 'any',
    onlineOnly,
    bodyType: csv(get('bodyType'))
      .map((v) => parseBodyType(v))
      .filter((v): v is DatingBodyType => Boolean(v)),
    relationshipStatus: csv(get('relationshipStatus'))
      .map((v) => parseRelationshipStatus(v))
      .filter((v): v is DatingRelationshipStatus => Boolean(v)),
    lookingForTags: parseLookingForTags(csv(get('lookingForTags'))),
    meetAt: parseMeetAt(csv(get('meetAt'))),
    languages: parseLanguages(csv(get('languages'))),
    position: csv(get('position'))
      .map((v) => parsePosition(v))
      .filter((v): v is DatingPosition => Boolean(v)),
    communityTags: parseCommunityTags(csv(get('communityTags'))),
  };
}

/** Serialize filters to query params (omit empties). */
export function discoveryFiltersToSearchParams(
  filters: DiscoveryFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.viewAll) params.set('view', 'all');
  else if (filters.bucket) params.set('bucket', filters.bucket);
  if (filters.city) params.set('city', filters.city);
  if (filters.ageMin != null) params.set('ageMin', String(filters.ageMin));
  if (filters.ageMax != null) params.set('ageMax', String(filters.ageMax));
  if (filters.heightMin != null) params.set('heightMin', String(filters.heightMin));
  if (filters.heightMax != null) params.set('heightMax', String(filters.heightMax));
  if (filters.distance !== 'any') params.set('distance', filters.distance);
  if (filters.onlineOnly) params.set('onlineOnly', '1');
  if (filters.bodyType.length) params.set('bodyType', filters.bodyType.join(','));
  if (filters.relationshipStatus.length) {
    params.set('relationshipStatus', filters.relationshipStatus.join(','));
  }
  if (filters.lookingForTags.length) {
    params.set('lookingForTags', filters.lookingForTags.join(','));
  }
  if (filters.meetAt.length) params.set('meetAt', filters.meetAt.join(','));
  if (filters.languages.length) params.set('languages', filters.languages.join(','));
  if (filters.position.length) params.set('position', filters.position.join(','));
  if (filters.communityTags.length) {
    params.set('communityTags', filters.communityTags.join(','));
  }
  return params;
}

export function countActiveDiscoveryFilters(filters: DiscoveryFilters): number {
  let n = 0;
  if (filters.bucket && !filters.viewAll) n += 1;
  if (filters.city) n += 1;
  if (filters.ageMin != null && filters.ageMin > DATING_AGE_MIN) n += 1;
  if (filters.ageMax != null && filters.ageMax < DATING_AGE_MAX) n += 1;
  if (filters.heightMin != null && filters.heightMin > DATING_HEIGHT_MIN) n += 1;
  if (filters.heightMax != null && filters.heightMax < DATING_HEIGHT_MAX) n += 1;
  if (filters.distance !== 'any') n += 1;
  if (filters.onlineOnly) n += 1;
  if (filters.bodyType.length) n += 1;
  if (filters.relationshipStatus.length) n += 1;
  if (filters.lookingForTags.length) n += 1;
  if (filters.meetAt.length) n += 1;
  if (filters.languages.length) n += 1;
  if (filters.position.length) n += 1;
  if (filters.communityTags.length) n += 1;
  return n;
}

/** Scalar optional: match selected values OR unanswered (null). */
function optionalScalarIn(
  field: string,
  values: string[],
): Prisma.DatingProfileWhereInput | null {
  if (!values.length) return null;
  return {
    OR: [{ [field]: { in: values } }, { [field]: null }],
  } as Prisma.DatingProfileWhereInput;
}

/** Array optional: hasSome selected OR empty (unanswered). */
function optionalArrayHasSome(
  field: string,
  values: string[],
): Prisma.DatingProfileWhereInput | null {
  if (!values.length) return null;
  return {
    OR: [{ [field]: { hasSome: values } }, { [field]: { isEmpty: true } }],
  } as Prisma.DatingProfileWhereInput;
}

function optionalIntRange(
  field: 'age' | 'height',
  min: number | null,
  max: number | null,
): Prisma.DatingProfileWhereInput | null {
  if (min == null && max == null) return null;
  const range: { gte?: number; lte?: number } = {};
  if (min != null) range.gte = min;
  if (max != null) range.lte = max;
  return {
    OR: [{ [field]: range }, { [field]: null }],
  } as Prisma.DatingProfileWhereInput;
}

/** Pass + self exclusions always AND-ed into the discovery WHERE. */
export function discoveryPassExclusions(viewerId: string) {
  return [
    { userId: { not: viewerId } },
    { passesReceived: { none: { fromUserId: viewerId } } },
  ] as const;
}

/**
 * Extra AND clauses for attribute / range / online filters.
 * Gender bucket + city are applied by the caller (they interact with showMe).
 */
export function discoveryAttributeWhere(
  filters: DiscoveryFilters,
  now: Date = new Date(),
): Prisma.DatingProfileWhereInput[] {
  const parts: Prisma.DatingProfileWhereInput[] = [];

  const age = optionalIntRange('age', filters.ageMin, filters.ageMax);
  if (age) parts.push(age);

  const height = optionalIntRange('height', filters.heightMin, filters.heightMax);
  if (height) parts.push(height);

  const body = optionalScalarIn('bodyType', filters.bodyType);
  if (body) parts.push(body);

  const rel = optionalScalarIn('relationshipStatus', filters.relationshipStatus);
  if (rel) parts.push(rel);

  const look = optionalArrayHasSome('lookingForTags', filters.lookingForTags);
  if (look) parts.push(look);

  const meet = optionalArrayHasSome('meetAt', filters.meetAt);
  if (meet) parts.push(meet);

  const langs = optionalArrayHasSome('languages', filters.languages);
  if (langs) parts.push(langs);

  const pos = optionalScalarIn('position', filters.position);
  if (pos) parts.push(pos);

  const tags = optionalArrayHasSome('communityTags', filters.communityTags);
  if (tags) parts.push(tags);

  if (filters.onlineOnly) {
    const since = new Date(now.getTime() - 15 * 60 * 1000);
    parts.push({
      presenceEnabled: true,
      user: { lastActiveAt: { gte: since } },
    });
  }

  return parts;
}

/** Max distance-bucket rank allowed by a filter distance. */
export function maxDistanceRank(distance: DatingFilterDistance): number | null {
  switch (distance) {
    case '1km':
      return bucketRank('<1km');
    case '3km':
      return bucketRank('1-3km');
    case '10km':
      return bucketRank('3-10km');
    default:
      return null;
  }
}

export function distanceBucketAllowed(
  bucket: DistanceBucket,
  distance: DatingFilterDistance,
): boolean {
  const max = maxDistanceRank(distance);
  if (max == null) return true;
  return bucketRank(bucket) <= max;
}
