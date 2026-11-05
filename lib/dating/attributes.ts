/**
 * Dating profile attribute vocabularies.
 *
 * Keys are stored on DatingProfile; labels live in i18n
 * (`lib/i18n/dating/{ka,en}.ts`) under `attributeLabels.*` — same pattern as
 * prompts. Never persist the display string.
 *
 * communityTags is DRAFT until product sign-off (see conversation).
 */

import type { DatingPresetCase } from '@/lib/dating/presets';

export const DATING_BODY_TYPES = [
  'slim',
  'average',
  'athletic',
  'muscular',
  'curvy',
  'plus',
] as const;
export type DatingBodyType = (typeof DATING_BODY_TYPES)[number];

export const DATING_RELATIONSHIP_STATUSES = [
  'single',
  'dating',
  'relationship',
  'open',
  'married',
  'complicated',
] as const;
export type DatingRelationshipStatus = (typeof DATING_RELATIONSHIP_STATUSES)[number];

/** Multi-select intent tags. Replaces the single lookingFor column over time. */
export const DATING_LOOKING_FOR_TAGS = [
  'chat',
  'friends',
  'dates',
  'relationship',
  'casual',
  'networking',
] as const;
export type DatingLookingForTag = (typeof DATING_LOOKING_FOR_TAGS)[number];

export const DATING_MEET_AT = [
  'my_place',
  'your_place',
  'public',
  'travel',
] as const;
export type DatingMeetAt = (typeof DATING_MEET_AT)[number];

export const DATING_PRONOUNS = [
  'he_him',
  'she_her',
  'they_them',
  'he_they',
  'she_they',
  'ask',
] as const;
export type DatingPronouns = (typeof DATING_PRONOUNS)[number];

export const DATING_GENDER_IDENTITIES = [
  'man',
  'woman',
  'nonbinary',
  'trans_man',
  'trans_woman',
  'genderqueer',
  'agender',
  'other',
] as const;
export type DatingGenderIdentity = (typeof DATING_GENDER_IDENTITIES)[number];

export const DATING_LANGUAGES = [
  'ka',
  'en',
  'ru',
  'tr',
  'de',
  'fr',
  'other',
] as const;
export type DatingLanguage = (typeof DATING_LANGUAGES)[number];

export const DATING_SMOKING = ['no', 'sometimes', 'yes'] as const;
export type DatingSmoking = (typeof DATING_SMOKING)[number];

export const DATING_DRINKING = ['no', 'socially', 'yes'] as const;
export type DatingDrinking = (typeof DATING_DRINKING)[number];

export const DATING_KIDS = ['none', 'have', 'want', 'dont_want'] as const;
export type DatingKids = (typeof DATING_KIDS)[number];

export const DATING_EDUCATION = [
  'school',
  'student',
  'bachelor',
  'master',
  'phd',
] as const;
export type DatingEducation = (typeof DATING_EDUCATION)[number];

export const DATING_POSITIONS = [
  'top',
  'vers_top',
  'vers',
  'vers_bottom',
  'bottom',
  'side',
  'ask',
] as const;
export type DatingPosition = (typeof DATING_POSITIONS)[number];

/**
 * DRAFT communityTags — keys only until product signs off the Georgian labels
 * in `attributeLabels.communityTags` (ka.ts). Proposed set (not Grindr tribes):
 * discreet/დისკრეტული · open/ღია · sporty/სპორტული · creative/შემოქმედებითი ·
 * geek/გიკი · party/წვეულებები · chill/მშვიდი · traveler/მოგზაური ·
 * career/კარიერა · queer/ქვირი · masculine/მასკულინური · feminine/ფემინური ·
 * romantic/რომანტიკული · poly/პოლი · monogamous/მონოგამიური.
 */
export const DATING_COMMUNITY_TAGS = [
  'discreet',
  'open',
  'sporty',
  'creative',
  'geek',
  'party',
  'chill',
  'traveler',
  'career',
  'queer',
  'masculine',
  'feminine',
  'romantic',
  'poly',
  'monogamous',
] as const;
export type DatingCommunityTag = (typeof DATING_COMMUNITY_TAGS)[number];

/** Filter distance max — never a free number. */
export const DATING_FILTER_DISTANCES = ['1km', '3km', '10km', 'any'] as const;
export type DatingFilterDistance = (typeof DATING_FILTER_DISTANCES)[number];

export const DATING_WORK_MAX_LEN = 60;
export const DATING_AGE_MIN = 18;
export const DATING_AGE_MAX = 99;
export const DATING_HEIGHT_MIN = 140;
export const DATING_HEIGHT_MAX = 220;

export const DATING_LOOKING_FOR_TAGS_MAX = 6;
export const DATING_MEET_AT_MAX = 4;
export const DATING_LANGUAGES_MAX = 6;
export const DATING_COMMUNITY_TAGS_MAX = 8;

const setOf = <T extends string>(values: readonly T[]) => new Set<string>(values);

const BODY = setOf(DATING_BODY_TYPES);
const REL = setOf(DATING_RELATIONSHIP_STATUSES);
const LOOK = setOf(DATING_LOOKING_FOR_TAGS);
const MEET = setOf(DATING_MEET_AT);
const PRONOUN = setOf(DATING_PRONOUNS);
const GENDER_ID = setOf(DATING_GENDER_IDENTITIES);
const LANG = setOf(DATING_LANGUAGES);
const SMOKE = setOf(DATING_SMOKING);
const DRINK = setOf(DATING_DRINKING);
const KIDS = setOf(DATING_KIDS);
const EDU = setOf(DATING_EDUCATION);
const POS = setOf(DATING_POSITIONS);
const COMM = setOf(DATING_COMMUNITY_TAGS);
const DIST = setOf(DATING_FILTER_DISTANCES);

function parseOne<T extends string>(
  raw: string | null | undefined,
  allowed: Set<string>,
): T | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return allowed.has(v) ? (v as T) : null;
}

function parseMany<T extends string>(
  raw: readonly string[] | null | undefined,
  allowed: Set<string>,
  max: number,
): T[] {
  if (!raw?.length) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const v = parseOne<T>(item, allowed);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

export const parseBodyType = (r?: string | null) =>
  parseOne<DatingBodyType>(r, BODY);
export const parseRelationshipStatus = (r?: string | null) =>
  parseOne<DatingRelationshipStatus>(r, REL);
export const parseLookingForTag = (r?: string | null) =>
  parseOne<DatingLookingForTag>(r, LOOK);
export const parseLookingForTags = (r?: readonly string[] | null) =>
  parseMany<DatingLookingForTag>(r, LOOK, DATING_LOOKING_FOR_TAGS_MAX);
export const parseMeetAt = (r?: readonly string[] | null) =>
  parseMany<DatingMeetAt>(r, MEET, DATING_MEET_AT_MAX);
export const parsePronouns = (r?: string | null) =>
  parseOne<DatingPronouns>(r, PRONOUN);
export const parseGenderIdentity = (r?: string | null) =>
  parseOne<DatingGenderIdentity>(r, GENDER_ID);
export const parseLanguages = (r?: readonly string[] | null) =>
  parseMany<DatingLanguage>(r, LANG, DATING_LANGUAGES_MAX);
export const parseSmoking = (r?: string | null) =>
  parseOne<DatingSmoking>(r, SMOKE);
export const parseDrinking = (r?: string | null) =>
  parseOne<DatingDrinking>(r, DRINK);
export const parseKids = (r?: string | null) => parseOne<DatingKids>(r, KIDS);
export const parseEducation = (r?: string | null) =>
  parseOne<DatingEducation>(r, EDU);
export const parsePosition = (r?: string | null) =>
  parseOne<DatingPosition>(r, POS);
export const parseCommunityTags = (r?: readonly string[] | null) =>
  parseMany<DatingCommunityTag>(r, COMM, DATING_COMMUNITY_TAGS_MAX);
export const parseFilterDistance = (r?: string | null) =>
  parseOne<DatingFilterDistance>(r, DIST);

/** Map legacy single lookingFor → lookingForTags for backfill / dual-write. */
export function lookingForToTags(
  lookingFor: string | null | undefined,
): DatingLookingForTag[] {
  switch (lookingFor) {
    case 'serious':
      return ['relationship'];
    case 'casual':
      return ['casual'];
    case 'friendship':
      return ['friends'];
    case 'open':
      return ['chat', 'dates', 'friends'];
    default:
      return [];
  }
}

/** LGBT-only editor fields: anything that is not a straight_* preset. */
export function isLgbtPresetCase(
  presetCase: DatingPresetCase | string | null | undefined,
): boolean {
  return (
    typeof presetCase === 'string' &&
    presetCase.length > 0 &&
    presetCase !== 'straight_male' &&
    presetCase !== 'straight_female'
  );
}

export function clampAge(n: number): number {
  return Math.min(DATING_AGE_MAX, Math.max(DATING_AGE_MIN, Math.round(n)));
}

export function clampHeight(n: number): number {
  return Math.min(DATING_HEIGHT_MAX, Math.max(DATING_HEIGHT_MIN, Math.round(n)));
}
