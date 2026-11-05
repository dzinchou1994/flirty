import { ok, err } from '@/lib/api/respond';
import { profileUpdateSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { prisma } from '@/lib/prisma';
import { absoluteMediaUrl } from '@/lib/site';
import { presetFromGenderAndShowMe, parseDatingShowMe, parseDatingGenderBucket } from '@/lib/dating/presets';
import {
  isLgbtPresetCase,
  lookingForToTags,
  parseBodyType,
  parseCommunityTags,
  parseDrinking,
  parseEducation,
  parseGenderIdentity,
  parseKids,
  parseLanguages,
  parseLookingForTags,
  parseMeetAt,
  parsePosition,
  parsePronouns,
  parseRelationshipStatus,
  parseSmoking,
  DATING_WORK_MAX_LEN,
} from '@/lib/dating/attributes';
import { buildOwnerPrivateUrl } from '@/lib/media/private-url';

export const dynamic = 'force-dynamic';

async function loadOwn(userId: string) {
  return prisma.datingProfile.findUnique({
    where: { userId },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      user: { select: { username: true } },
    },
  });
}

function serializeOwn(row: NonNullable<Awaited<ReturnType<typeof loadOwn>>>) {
  return {
    id: row.id,
    userId: row.userId,
    username: row.user.username,
    name: row.name,
    age: row.age,
    bio: row.bio,
    city: row.city,
    genderBucket: row.genderBucket,
    showMe: row.showMe,
    height: row.height,
    lookingFor: row.lookingFor,
    lookingForTags: row.lookingForTags ?? [],
    interests: row.interests,
    zodiacSign: row.zodiacSign,
    weightKg: row.weightKg,
    bodyType: row.bodyType,
    relationshipStatus: row.relationshipStatus,
    meetAt: row.meetAt ?? [],
    pronouns: row.pronouns,
    genderIdentity: row.genderIdentity,
    languages: row.languages ?? [],
    smoking: row.smoking,
    drinking: row.drinking,
    kids: row.kids,
    education: row.education,
    work: row.work,
    position: isLgbtPresetCase(row.presetCase) ? row.position : null,
    communityTags: isLgbtPresetCase(row.presetCase) ? row.communityTags ?? [] : [],
    isVisible: row.isVisible,
    moderationStatus: row.moderationStatus,
    moderationReason: row.moderationReason,
    hideFromContacts: row.hideFromContacts,
    requireMutualInterest: row.requireMutualInterest,
    visibilityMode: row.visibilityMode,
    presenceEnabled: row.presenceEnabled,
    phoneVerified: Boolean(row.phoneVerifiedAt),
    photos: row.photos.map((p) => ({
      id: p.id,
      url:
        p.visibility === 'private'
          ? buildOwnerPrivateUrl(p.id, row.userId)
          : absoluteMediaUrl(p.url) || p.url,
      sortOrder: p.sortOrder,
      status: p.status,
      visibility: p.visibility === 'private' ? 'private' : 'public',
    })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const row = await loadOwn(auth.user.id);
  if (!row) return ok(null);
  return ok(serializeOwn(row));
}

export async function PUT(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid profile payload', { status: 400 });

  const data = parsed.data;
  if (data.age != null && data.age < 18) {
    return err('AGE_GATE_REQUIRED', 'Age must be 18+', { status: 403, field: 'age' });
  }

  const existing = await prisma.datingProfile.findUnique({ where: { userId: auth.user.id } });
  const genderBucket =
    parseDatingGenderBucket(data.genderBucket || existing?.genderBucket || 'male') || 'male';
  const showMe = parseDatingShowMe(data.showMe || existing?.showMe || 'everyone') || 'everyone';
  const presetCase = presetFromGenderAndShowMe(genderBucket, showMe);
  const lgbt = isLgbtPresetCase(presetCase);

  const lookingForTags =
    data.lookingForTags !== undefined
      ? parseLookingForTags(data.lookingForTags)
      : data.lookingFor !== undefined
        ? lookingForToTags(data.lookingFor)
        : undefined;

  const row = await prisma.datingProfile.upsert({
    where: { userId: auth.user.id },
    create: {
      userId: auth.user.id,
      genderBucket,
      presetCase,
      city: data.city || 'other',
      bio: data.bio || '',
      name: data.name ?? null,
      age: data.age ?? null,
      height: data.height ?? null,
      lookingFor: data.lookingFor ?? null,
      lookingForTags: lookingForTags ?? lookingForToTags(data.lookingFor ?? null),
      interests: data.interests ?? null,
      zodiacSign: data.zodiacSign ?? null,
      weightKg: data.weightKg ?? null,
      bodyType: parseBodyType(data.bodyType ?? null),
      relationshipStatus: parseRelationshipStatus(data.relationshipStatus ?? null),
      meetAt: data.meetAt ? parseMeetAt(data.meetAt) : [],
      pronouns: parsePronouns(data.pronouns ?? null),
      genderIdentity: parseGenderIdentity(data.genderIdentity ?? null),
      languages: data.languages ? parseLanguages(data.languages) : [],
      smoking: parseSmoking(data.smoking ?? null),
      drinking: parseDrinking(data.drinking ?? null),
      kids: parseKids(data.kids ?? null),
      education: parseEducation(data.education ?? null),
      work:
        data.work === undefined || data.work === null
          ? null
          : String(data.work).trim().slice(0, DATING_WORK_MAX_LEN) || null,
      position: lgbt ? parsePosition(data.position ?? null) : null,
      communityTags: lgbt && data.communityTags ? parseCommunityTags(data.communityTags) : [],
      showMe,
      isVisible: data.isVisible ?? false,
      hideFromContacts: data.hideFromContacts ?? false,
      requireMutualInterest: data.requireMutualInterest ?? false,
      visibilityMode: data.visibilityMode ?? 'discoverable',
      presenceEnabled: data.presenceEnabled ?? true,
    },
    update: {
      ...(data.genderBucket != null ? { genderBucket, presetCase } : {}),
      ...(data.showMe != null ? { showMe, presetCase } : {}),
      ...(data.city != null ? { city: data.city } : {}),
      ...(data.bio != null ? { bio: data.bio } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.age !== undefined ? { age: data.age } : {}),
      ...(data.height !== undefined ? { height: data.height } : {}),
      ...(data.lookingFor !== undefined ? { lookingFor: data.lookingFor } : {}),
      ...(lookingForTags !== undefined ? { lookingForTags } : {}),
      ...(data.interests !== undefined ? { interests: data.interests } : {}),
      ...(data.zodiacSign !== undefined ? { zodiacSign: data.zodiacSign } : {}),
      ...(data.weightKg !== undefined ? { weightKg: data.weightKg } : {}),
      ...(data.bodyType !== undefined ? { bodyType: parseBodyType(data.bodyType) } : {}),
      ...(data.relationshipStatus !== undefined
        ? { relationshipStatus: parseRelationshipStatus(data.relationshipStatus) }
        : {}),
      ...(data.meetAt !== undefined ? { meetAt: parseMeetAt(data.meetAt) } : {}),
      ...(data.pronouns !== undefined ? { pronouns: parsePronouns(data.pronouns) } : {}),
      ...(data.genderIdentity !== undefined
        ? { genderIdentity: parseGenderIdentity(data.genderIdentity) }
        : {}),
      ...(data.languages !== undefined ? { languages: parseLanguages(data.languages) } : {}),
      ...(data.smoking !== undefined ? { smoking: parseSmoking(data.smoking) } : {}),
      ...(data.drinking !== undefined ? { drinking: parseDrinking(data.drinking) } : {}),
      ...(data.kids !== undefined ? { kids: parseKids(data.kids) } : {}),
      ...(data.education !== undefined ? { education: parseEducation(data.education) } : {}),
      ...(data.work !== undefined
        ? {
            work:
              data.work === null
                ? null
                : String(data.work).trim().slice(0, DATING_WORK_MAX_LEN) || null,
          }
        : {}),
      ...(lgbt && data.position !== undefined
        ? { position: parsePosition(data.position) }
        : !lgbt
          ? { position: null, communityTags: [] }
          : {}),
      ...(lgbt && data.communityTags !== undefined
        ? { communityTags: parseCommunityTags(data.communityTags) }
        : {}),
      ...(data.isVisible != null ? { isVisible: data.isVisible } : {}),
      ...(data.hideFromContacts != null ? { hideFromContacts: data.hideFromContacts } : {}),
      ...(data.requireMutualInterest != null
        ? { requireMutualInterest: data.requireMutualInterest }
        : {}),
      ...(data.visibilityMode != null ? { visibilityMode: data.visibilityMode } : {}),
      ...(data.presenceEnabled != null ? { presenceEnabled: data.presenceEnabled } : {}),
    },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      user: { select: { username: true } },
    },
  });

  return ok(serializeOwn(row));
}
