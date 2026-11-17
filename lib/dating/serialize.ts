import { absoluteMediaUrl } from '@/lib/site';
import type { DatingProfilePayload, DatingProfileView } from '@/lib/dating/shared';
import {
  parseDatingCity,
  parseDatingShowMe,
  type DatingCity,
  type DatingGenderBucket,
  type DatingPresetCase,
  type DatingShowMe,
} from '@/lib/dating/presets';
import { parseDatingPhotoStatus } from '@/lib/dating/shared';
import { isRecentlyOnline, presenceFromLastActive, type PresenceLabel } from '@/lib/dating/presence';
import { resolvePhotoUrlForViewer } from '@/lib/media/private-token';

type PhotoRow = {
  id: string;
  url: string;
  sortOrder: number;
  status?: string | null;
  visibility?: string | null;
};

export type SerializeOpts = {
  viewerId?: string;
  /** When false, private photos are omitted entirely. */
  includePrivateAlbum?: boolean;
  hasAlbumGrant?: boolean;
};

export function mapRowToView(
  row: {
    id: string;
    userId: string;
    genderBucket: string;
    presetCase: string;
    city: string | null;
    name: string | null;
    age: number | null;
    bio: string;
    height: number | null;
    zodiacSign: string | null;
    lookingFor: string | null;
    lookingForTags?: string[] | null;
    interests: string | null;
    weightKg?: number | null;
    bodyType?: string | null;
    relationshipStatus?: string | null;
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
    showMe?: string | null;
    isVisible: boolean;
    moderationStatus?: string | null;
    moderationReason?: string | null;
    photosPublishedAt?: Date | null;
    presenceEnabled?: boolean | null;
    updatedAt: Date;
    user: { username: string; avatar: string | null; gender?: string | null; lastActiveAt: Date };
    photos: PhotoRow[];
  },
  opts: SerializeOpts = {},
): DatingProfileView & { presence?: PresenceLabel | null } {
  const mod = row.moderationStatus;
  const presenceEnabled = row.presenceEnabled ?? true;
  const presence = presenceFromLastActive(row.user.lastActiveAt, presenceEnabled);
  const includePrivate = opts.includePrivateAlbum !== false;

  const photos = row.photos
    .map((photo) => {
      const visibility = photo.visibility === 'private' ? 'private' : 'public';
      if (visibility === 'private' && !includePrivate) return null;
      const publicUrl = absoluteMediaUrl(photo.url) || photo.url;
      const url = resolvePhotoUrlForViewer({
        visibility,
        publicUrl,
        photoId: photo.id,
        ownerUserId: row.userId,
        viewerId: opts.viewerId,
        hasGrant: Boolean(opts.hasAlbumGrant) || opts.viewerId === row.userId,
      });
      if (!url) return null;
      return {
        id: photo.id,
        url,
        sortOrder: photo.sortOrder,
        status: parseDatingPhotoStatus(photo.status),
        visibility: visibility as 'public' | 'private',
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  return {
    id: row.id,
    userId: row.userId,
    username: row.user.username,
    avatar: absoluteMediaUrl(row.user.avatar),
    genderBucket: row.genderBucket as DatingGenderBucket,
    presetCase: row.presetCase as DatingPresetCase,
    city: (parseDatingCity(row.city) ?? 'other') as DatingCity,
    name: row.name,
    age: row.age,
    bio: row.bio,
    height: row.height,
    zodiacSign: row.zodiacSign,
    lookingFor: row.lookingFor,
    lookingForTags: row.lookingForTags ?? [],
    interests: row.interests,
    weightKg: row.weightKg ?? null,
    bodyType: row.bodyType ?? null,
    relationshipStatus: row.relationshipStatus ?? null,
    meetAt: row.meetAt ?? [],
    pronouns: row.pronouns ?? null,
    genderIdentity: row.genderIdentity ?? null,
    languages: row.languages ?? [],
    smoking: row.smoking ?? null,
    drinking: row.drinking ?? null,
    kids: row.kids ?? null,
    education: row.education ?? null,
    work: row.work ?? null,
    position: row.position ?? null,
    communityTags: row.communityTags ?? [],
    showMe: (parseDatingShowMe(row.showMe) ?? 'everyone') as DatingShowMe,
    accountGender: row.user.gender ?? null,
    isVisible: row.isVisible,
    moderationStatus:
      mod === 'hidden' || mod === 'blocked' || mod === 'pending' ? mod : 'active',
    moderationReason: row.moderationReason?.trim() || null,
    photosPublishedAt: row.photosPublishedAt ?? null,
    photos,
    promptAnswers: (row as { promptAnswers?: { id: string; promptKey: string; answer: string; sortOrder: number }[] })
      .promptAnswers?.map((a) => ({
        id: a.id,
        promptKey: a.promptKey,
        answer: a.answer,
        sortOrder: a.sortOrder,
      })) ?? [],
    updatedAt: row.updatedAt,
    isOnline: presenceEnabled && isRecentlyOnline(row.user.lastActiveAt),
    presence: presence === 'hidden' ? null : presence,
  };
}

export function serializePublicProfile(
  row: Parameters<typeof mapRowToView>[0],
  opts: SerializeOpts = {},
): DatingProfilePayload & { presence?: PresenceLabel | null } {
  const view = mapRowToView(row, {
    ...opts,
    // Discovery grids: never include private album media
    includePrivateAlbum: opts.includePrivateAlbum ?? false,
  });
  return {
    ...view,
    photosPublishedAt: view.photosPublishedAt ? view.photosPublishedAt.toISOString() : null,
    updatedAt: view.updatedAt.toISOString(),
  };
}
