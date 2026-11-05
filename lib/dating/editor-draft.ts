import {
  genderBucketFromPreset,
  parseDatingCity,
  parseDatingGenderBucket,
  parseDatingInterests,
  parseDatingLookingFor,
  parseDatingPresetCase,
  parseDatingShowMe,
  type DatingGenderBucket,
  type DatingInterest,
} from '@/lib/dating/presets';

export type DatingEditorDraft = {
  name: string;
  age: string;
  city: string;
  showMe: string;
  genderBucket: DatingGenderBucket;
  bio: string;
  height: string;
  zodiacSign: string;
  lookingFor: string;
  interests: DatingInterest[];
  savedAt: number;
};

const PREFIX = 'dating:editor-draft:';

function storageKey(draftKey: string): string {
  return `${PREFIX}${draftKey}`;
}

function genderFromDraft(parsed: Record<string, unknown>): DatingGenderBucket | null {
  const direct = parseDatingGenderBucket(String(parsed.genderBucket || ''));
  if (direct) return direct;
  const preset = parseDatingPresetCase(String(parsed.presetCase || ''));
  if (!preset) return null;
  return genderBucketFromPreset(preset);
}

export function loadDatingEditorDraft(draftKey: string): DatingEditorDraft | null {
  if (typeof window === 'undefined' || !draftKey) return null;
  try {
    const raw = localStorage.getItem(storageKey(draftKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    const city = parseDatingCity(String(parsed.city || '')) ?? 'tbilisi';
    const showMe = parseDatingShowMe(String(parsed.showMe || '')) ?? 'everyone';
    const lookingForRaw = String(parsed.lookingFor || '').trim();
    const lookingFor = lookingForRaw && parseDatingLookingFor(lookingForRaw) ? lookingForRaw : '';
    const genderBucket = genderFromDraft(parsed);
    if (!genderBucket) return null;

    return {
      name: String(parsed.name || '').slice(0, 50),
      age: String(parsed.age || '').slice(0, 3),
      city,
      showMe,
      genderBucket,
      bio: String(parsed.bio || '').slice(0, 300),
      height: String(parsed.height || '').slice(0, 3),
      zodiacSign: String(parsed.zodiacSign || ''),
      lookingFor,
      interests: Array.isArray(parsed.interests)
        ? parseDatingInterests(parsed.interests.join(','))
        : parseDatingInterests(typeof parsed.interests === 'string' ? parsed.interests : ''),
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveDatingEditorDraft(draftKey: string, draft: Omit<DatingEditorDraft, 'savedAt'>): void {
  if (typeof window === 'undefined' || !draftKey) return;
  try {
    const payload: DatingEditorDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(storageKey(draftKey), JSON.stringify(payload));
  } catch {
    // Quota / private mode - ignore.
  }
}

export function clearDatingEditorDraft(draftKey: string): void {
  if (typeof window === 'undefined' || !draftKey) return;
  try {
    localStorage.removeItem(storageKey(draftKey));
  } catch {
    // ignore
  }
}
