/**
 * Zod schema for the discovery filter set. `/api/v1/feed` and the browse page
 * share one definition — parse query strings through `parseDiscoveryFiltersQuery`.
 */
import { z } from 'zod';
import {
  EMPTY_DISCOVERY_FILTERS,
  parseDiscoveryFilters,
  type DiscoveryFilters,
} from '@/lib/dating/discovery-filters';

export const lookingForTagSchema = z.enum([
  'chat',
  'friends',
  'dates',
  'relationship',
  'casual',
  'networking',
]);

export const discoveryFiltersSchema = z.object({
  bucket: z.enum(['male', 'female', 'trans']).nullable().optional(),
  viewAll: z.boolean().optional(),
  city: z
    .enum(['tbilisi', 'batumi', 'kutaisi', 'gori', 'other'])
    .nullable()
    .optional(),
  ageMin: z.number().int().min(18).max(99).nullable().optional(),
  ageMax: z.number().int().min(18).max(99).nullable().optional(),
  heightMin: z.number().int().min(140).max(220).nullable().optional(),
  heightMax: z.number().int().min(140).max(220).nullable().optional(),
  distance: z.enum(['1km', '3km', '10km', 'any']).optional(),
  onlineOnly: z.boolean().optional(),
  bodyType: z
    .array(z.enum(['slim', 'average', 'athletic', 'muscular', 'curvy', 'plus']))
    .max(6)
    .optional(),
  relationshipStatus: z
    .array(
      z.enum(['single', 'dating', 'relationship', 'open', 'married', 'complicated']),
    )
    .max(6)
    .optional(),
  lookingForTags: z.array(lookingForTagSchema).max(6).optional(),
  meetAt: z
    .array(z.enum(['my_place', 'your_place', 'public', 'travel']))
    .max(4)
    .optional(),
  languages: z
    .array(z.enum(['ka', 'en', 'ru', 'tr', 'de', 'fr', 'other']))
    .max(6)
    .optional(),
  position: z
    .array(
      z.enum(['top', 'vers_top', 'vers', 'vers_bottom', 'bottom', 'side', 'ask']),
    )
    .max(7)
    .optional(),
  communityTags: z.array(z.string().min(1).max(40)).max(8).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().max(80).nullable().optional(),
  bio: z.string().max(2000).optional(),
  age: z.number().int().min(18).max(99).nullable().optional(),
  height: z.number().int().min(100).max(250).nullable().optional(),
  city: z.enum(['tbilisi', 'batumi', 'kutaisi', 'gori', 'other']).optional(),
  genderBucket: z.enum(['male', 'female', 'trans']).optional(),
  showMe: z.enum(['everyone', 'male', 'female', 'trans']).optional(),
  lookingFor: z.string().max(40).nullable().optional(),
  lookingForTags: z.array(lookingForTagSchema).max(6).optional(),
  interests: z.string().max(500).nullable().optional(),
  zodiacSign: z.string().max(40).nullable().optional(),
  weightKg: z.number().int().min(35).max(250).nullable().optional(),
  bodyType: z
    .enum(['slim', 'average', 'athletic', 'muscular', 'curvy', 'plus'])
    .nullable()
    .optional(),
  relationshipStatus: z
    .enum(['single', 'dating', 'relationship', 'open', 'married', 'complicated'])
    .nullable()
    .optional(),
  meetAt: z
    .array(z.enum(['my_place', 'your_place', 'public', 'travel']))
    .max(4)
    .optional(),
  pronouns: z
    .enum(['he_him', 'she_her', 'they_them', 'he_they', 'she_they', 'ask'])
    .nullable()
    .optional(),
  genderIdentity: z
    .enum([
      'man',
      'woman',
      'nonbinary',
      'trans_man',
      'trans_woman',
      'genderqueer',
      'agender',
      'other',
    ])
    .nullable()
    .optional(),
  languages: z
    .array(z.enum(['ka', 'en', 'ru', 'tr', 'de', 'fr', 'other']))
    .max(6)
    .optional(),
  smoking: z.enum(['no', 'sometimes', 'yes']).nullable().optional(),
  drinking: z.enum(['no', 'socially', 'yes']).nullable().optional(),
  kids: z.enum(['none', 'have', 'want', 'dont_want']).nullable().optional(),
  education: z
    .enum(['school', 'student', 'bachelor', 'master', 'phd'])
    .nullable()
    .optional(),
  work: z.string().trim().max(60).nullable().optional(),
  position: z
    .enum(['top', 'vers_top', 'vers', 'vers_bottom', 'bottom', 'side', 'ask'])
    .nullable()
    .optional(),
  communityTags: z.array(z.string().min(1).max(40)).max(8).optional(),
  isVisible: z.boolean().optional(),
  hideFromContacts: z.boolean().optional(),
  requireMutualInterest: z.boolean().optional(),
  visibilityMode: z.enum(['discoverable', 'mutual_only', 'incognito']).optional(),
  presenceEnabled: z.boolean().optional(),
});

function csv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function intOrNull(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Coerce URLSearchParams into the shape Zod expects, then validate.
 * Falls back to the permissive parser so unknown enum tokens are dropped
 * rather than rejecting the whole request.
 */
export function parseDiscoveryFiltersQuery(
  input: URLSearchParams | Record<string, string | undefined | null>,
): DiscoveryFilters {
  const get = (key: string): string | null => {
    if (input instanceof URLSearchParams) return input.get(key);
    const v = input[key];
    return v == null || v === '' ? null : String(v);
  };

  const candidate = {
    bucket: get('bucket'),
    viewAll: get('view') === 'all',
    city: get('city'),
    ageMin: intOrNull(get('ageMin')),
    ageMax: intOrNull(get('ageMax')),
    heightMin: intOrNull(get('heightMin')),
    heightMax: intOrNull(get('heightMax')),
    distance: get('distance') ?? 'any',
    onlineOnly: get('onlineOnly') === '1' || get('onlineOnly') === 'true',
    bodyType: csv(get('bodyType')),
    relationshipStatus: csv(get('relationshipStatus')),
    lookingForTags: csv(get('lookingForTags')),
    meetAt: csv(get('meetAt')),
    languages: csv(get('languages')),
    position: csv(get('position')),
    communityTags: csv(get('communityTags')),
  };

  const parsed = discoveryFiltersSchema.safeParse(candidate);
  if (!parsed.success) {
    return parseDiscoveryFilters(input);
  }

  const d = parsed.data;
  return {
    ...EMPTY_DISCOVERY_FILTERS,
    bucket: d.bucket ?? null,
    viewAll: Boolean(d.viewAll),
    city: d.city ?? null,
    ageMin: d.ageMin ?? null,
    ageMax: d.ageMax ?? null,
    heightMin: d.heightMin ?? null,
    heightMax: d.heightMax ?? null,
    distance: d.distance ?? 'any',
    onlineOnly: Boolean(d.onlineOnly),
    bodyType: d.bodyType ?? [],
    relationshipStatus: d.relationshipStatus ?? [],
    lookingForTags: d.lookingForTags ?? [],
    meetAt: d.meetAt ?? [],
    languages: d.languages ?? [],
    position: d.position ?? [],
    communityTags: (d.communityTags ?? []) as DiscoveryFilters['communityTags'],
  };
}

export type DiscoveryFiltersZod = z.infer<typeof discoveryFiltersSchema>;
