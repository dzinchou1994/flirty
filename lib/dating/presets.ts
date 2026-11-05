
export type AvatarGender = 'male' | 'female' | 'nonBinary';

export function parseAvatarGender(raw: string | null | undefined): AvatarGender | null {
  if (raw === 'male' || raw === 'female' || raw === 'nonBinary') return raw;
  return null;
}

export type DatingGenderBucket = 'male' | 'female' | 'trans';

export const DATING_GENDER_BUCKETS: readonly DatingGenderBucket[] = [
  'male',
  'female',
  'trans',
] as const;

export type DatingCity = 'tbilisi' | 'batumi' | 'kutaisi' | 'gori' | 'other';

export const DATING_CITIES: readonly DatingCity[] = [
  'tbilisi',
  'batumi',
  'kutaisi',
  'gori',
  'other',
] as const;

const CITY_SET = new Set<string>(DATING_CITIES);

export function parseDatingCity(raw: string | null | undefined): DatingCity | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return CITY_SET.has(normalized) ? (normalized as DatingCity) : null;
}

export type DatingPresetCase =
  | 'straight_male'
  | 'straight_female'
  | 'gay_male'
  | 'lesbian_female'
  | 'bi_male'
  | 'bi_female'
  | 'trans_straight'
  | 'trans_gay'
  | 'trans_bi'
  | 'open_to_all';

export const DATING_PRESET_CASES: readonly DatingPresetCase[] = [
  'straight_male',
  'straight_female',
  'gay_male',
  'lesbian_female',
  'bi_male',
  'bi_female',
  'trans_straight',
  'trans_gay',
  'trans_bi',
  'open_to_all',
] as const;

/** Who the user wants to see in their dating feed. */
export type DatingShowMe = 'everyone' | DatingGenderBucket;

export const DATING_SHOW_ME_OPTIONS: readonly DatingShowMe[] = [
  'everyone',
  'male',
  'female',
  'trans',
] as const;

const SHOW_ME_SET = new Set<string>(DATING_SHOW_ME_OPTIONS);

export function parseDatingShowMe(raw: string | null | undefined): DatingShowMe | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return SHOW_ME_SET.has(normalized) ? (normalized as DatingShowMe) : null;
}

/** What the person is looking for on dating. */
export type DatingLookingFor = 'serious' | 'casual' | 'friendship' | 'open';

export const DATING_LOOKING_FOR_OPTIONS: readonly DatingLookingFor[] = [
  'serious',
  'casual',
  'friendship',
  'open',
] as const;

const LOOKING_FOR_SET = new Set<string>(DATING_LOOKING_FOR_OPTIONS);

export function parseDatingLookingFor(raw: string | null | undefined): DatingLookingFor | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return LOOKING_FOR_SET.has(normalized) ? (normalized as DatingLookingFor) : null;
}

export type DatingInterest =
  | 'music'
  | 'travel'
  | 'movies'
  | 'sports'
  | 'cooking'
  | 'reading'
  | 'nightlife'
  | 'art'
  | 'gaming'
  | 'fitness'
  | 'hiking'
  | 'photography'
  | 'coffee'
  | 'animals'
  | 'dancing'
  | 'tech'
  | 'fashion'
  | 'wine'
  | 'beach'
  | 'yoga'
  | 'food'
  | 'cars'
  | 'nature'
  | 'series';

export const DATING_INTERESTS: readonly DatingInterest[] = [
  'music',
  'travel',
  'movies',
  'series',
  'sports',
  'fitness',
  'hiking',
  'cooking',
  'food',
  'coffee',
  'wine',
  'reading',
  'nightlife',
  'dancing',
  'art',
  'photography',
  'gaming',
  'tech',
  'fashion',
  'animals',
  'beach',
  'yoga',
  'cars',
  'nature',
] as const;

export const DATING_INTERESTS_MAX = 8;

const INTEREST_SET = new Set<string>(DATING_INTERESTS);

export function parseDatingInterest(raw: string | null | undefined): DatingInterest | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return INTEREST_SET.has(normalized) ? (normalized as DatingInterest) : null;
}

/** Parse stored interests (comma-separated keys). Keeps order, drops unknowns, caps max. */
export function parseDatingInterests(raw: string | null | undefined): DatingInterest[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const seen = new Set<DatingInterest>();
  const out: DatingInterest[] = [];
  for (const part of raw.split(/[,|]/)) {
    const key = parseDatingInterest(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= DATING_INTERESTS_MAX) break;
  }
  return out;
}

export function serializeDatingInterests(interests: readonly DatingInterest[]): string | null {
  if (!interests.length) return null;
  return interests.slice(0, DATING_INTERESTS_MAX).join(',');
}

/** Convert showMe preference into an optional genderBucket filter. */
export function genderBucketFromShowMe(showMe: DatingShowMe | null | undefined): DatingGenderBucket | null {
  if (!showMe || showMe === 'everyone') return null;
  return showMe;
}

const PRESET_SET = new Set<string>(DATING_PRESET_CASES);

const PRESET_TO_BUCKET: Record<DatingPresetCase, DatingGenderBucket> = {
  straight_male: 'male',
  straight_female: 'female',
  gay_male: 'male',
  lesbian_female: 'female',
  bi_male: 'male',
  bi_female: 'female',
  trans_straight: 'trans',
  trans_gay: 'trans',
  trans_bi: 'trans',
  open_to_all: 'trans',
};

export function parseDatingPresetCase(raw: string | null | undefined): DatingPresetCase | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim();
  return PRESET_SET.has(normalized) ? (normalized as DatingPresetCase) : null;
}

export function parseDatingGenderBucket(raw: string): DatingGenderBucket | null {
  if (raw === 'male' || raw === 'female' || raw === 'trans') return raw;
  return null;
}

export function genderBucketFromPreset(
  preset: DatingPresetCase,
  userGender?: AvatarGender | null,
): DatingGenderBucket {
  if (preset === 'open_to_all') {
    if (userGender === 'male') return 'male';
    if (userGender === 'female') return 'female';
    return 'trans';
  }
  return PRESET_TO_BUCKET[preset];
}

export function genderBucketFromAccount(
  userGender?: AvatarGender | null,
): DatingGenderBucket | null {
  if (userGender === 'male' || userGender === 'female') return userGender;
  return null;
}

/**
 * Gender shown on the public profile.
 * Account gender wins over a mismatched dating preset (men often pick
 * "straight woman" thinking it means who they want). Explicit trans
 * presets stay trans.
 */
export function datingDisplayGender(
  genderBucket: DatingGenderBucket,
  accountGender?: string | null,
  presetCase?: DatingPresetCase | null,
): DatingGenderBucket {
  const fromAccount = genderBucketFromAccount(parseAvatarGender(accountGender ?? ''));
  const explicitTrans =
    presetCase === 'trans_straight' ||
    presetCase === 'trans_gay' ||
    presetCase === 'trans_bi';
  if (explicitTrans) return 'trans';
  if (fromAccount) return fromAccount;
  return genderBucket;
}

/**
 * Who the profile is interested in.
 * If they picked a gendered preset that doesn't match their own gender
 * (e.g. a man choosing "straight woman"), treat that as interest, not identity.
 */
export function datingDisplayInterestedIn(
  showMe: DatingShowMe,
  genderBucket: DatingGenderBucket,
  accountGender?: string | null,
  presetCase?: DatingPresetCase | null,
): DatingShowMe {
  if (showMe !== 'everyone') return showMe;
  if (!presetCase) return showMe;
  const displayGender = datingDisplayGender(genderBucket, accountGender, presetCase);
  const presetGender = genderBucketFromPreset(presetCase);
  if (
    (presetGender === 'male' || presetGender === 'female') &&
    presetGender !== displayGender
  ) {
    return presetGender;
  }
  return showMe;
}

/** Keep presetCase in sync with explicit gender + who they are interested in. */
export function presetFromGenderAndShowMe(
  gender: DatingGenderBucket,
  showMe: DatingShowMe,
): DatingPresetCase {
  if (gender === 'trans') {
    if (showMe === 'male') return 'trans_gay';
    if (showMe === 'female') return 'trans_straight';
    return 'trans_bi';
  }
  if (gender === 'male') {
    if (showMe === 'female') return 'straight_male';
    if (showMe === 'male') return 'gay_male';
    return 'bi_male';
  }
  if (showMe === 'male') return 'straight_female';
  if (showMe === 'female') return 'lesbian_female';
  return 'bi_female';
}
