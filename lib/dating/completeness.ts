import { isLgbtPresetCase } from '@/lib/dating/attributes';

/** Fields that count toward the profile completeness meter. */
type CompletenessInput = {
  name?: string | null;
  age?: number | null;
  city?: string | null;
  bio?: string | null;
  height?: number | null;
  weightKg?: number | null;
  bodyType?: string | null;
  relationshipStatus?: string | null;
  lookingForTags?: string[] | null;
  meetAt?: string[] | null;
  pronouns?: string | null;
  genderIdentity?: string | null;
  languages?: string[] | null;
  smoking?: string | null;
  drinking?: string | null;
  kids?: string | null;
  education?: string | null;
  work?: string | null;
  position?: string | null;
  communityTags?: string[] | null;
  interests?: string | null;
  photoCount?: number;
  promptCount?: number;
  presetCase?: string | null;
};

function filled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

/**
 * Returns 0–100. LGBT-only fields only count when the preset is non-straight.
 */
export function datingProfileCompleteness(input: CompletenessInput): number {
  const lgbt = isLgbtPresetCase(input.presetCase);
  const checks: unknown[] = [
    input.name,
    input.age,
    input.city,
    input.bio,
    input.height,
    input.weightKg,
    input.bodyType,
    input.relationshipStatus,
    input.lookingForTags,
    input.meetAt,
    input.pronouns,
    input.genderIdentity,
    input.languages,
    input.smoking,
    input.drinking,
    input.kids,
    input.education,
    input.work,
    input.interests,
    (input.photoCount ?? 0) > 0 ? 1 : null,
    (input.promptCount ?? 0) > 0 ? 1 : null,
  ];
  if (lgbt) {
    checks.push(input.position, input.communityTags);
  }
  const total = checks.length;
  const done = checks.filter(filled).length;
  if (!total) return 0;
  return Math.round((done / total) * 100);
}
