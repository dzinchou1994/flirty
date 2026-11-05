export const DATING_MAX_PHOTOS = 5;
export const DATING_PHOTO_MAX_BYTES = 4 * 1024 * 1024;

export type DatingPhotoStatus = 'approved' | 'pending';

export type DatingPhotoView = {
  id: string;
  url: string;
  sortOrder: number;
  status: DatingPhotoStatus;
  visibility?: 'public' | 'private';
};

export type DatingPromptAnswerView = {
  id: string;
  promptKey: string;
  answer: string;
  sortOrder: number;
};

export type DatingProfileView = {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  genderBucket: import('@/lib/dating/presets').DatingGenderBucket;
  presetCase: import('@/lib/dating/presets').DatingPresetCase;
  city: import('@/lib/dating/presets').DatingCity;
  name: string | null;
  age: number | null;
  bio: string;
  height: number | null;
  zodiacSign: string | null;
  lookingFor: string | null;
  lookingForTags?: string[];
  interests: string | null;
  weightKg?: number | null;
  bodyType?: string | null;
  relationshipStatus?: string | null;
  meetAt?: string[];
  pronouns?: string | null;
  genderIdentity?: string | null;
  languages?: string[];
  smoking?: string | null;
  drinking?: string | null;
  kids?: string | null;
  education?: string | null;
  work?: string | null;
  position?: string | null;
  communityTags?: string[];
  showMe: import('@/lib/dating/presets').DatingShowMe;
  accountGender: string | null;
  isVisible: boolean;
  moderationStatus: 'active' | 'hidden' | 'blocked' | 'pending';
  moderationReason: string | null;
  photosPublishedAt: Date | null;
  photos: DatingPhotoView[];
  promptAnswers: DatingPromptAnswerView[];
  updatedAt: Date;
  isOnline: boolean;
  presence?: 'online' | 'active_today' | 'active_this_week' | null;
  /** Coarse distance label only — never metres or coordinates. */
  distanceBucket?: '<1km' | '1-3km' | '3-10km' | '10km+' | null;
};

export type DatingProfilePayload = Omit<DatingProfileView, 'photosPublishedAt' | 'updatedAt'> & {
  photosPublishedAt: string | null;
  updatedAt: string;
};

export function serializeDatingProfile(profile: DatingProfileView): DatingProfilePayload {
  return {
    ...profile,
    photosPublishedAt: profile.photosPublishedAt
      ? profile.photosPublishedAt.toISOString()
      : null,
    updatedAt:
      profile.updatedAt instanceof Date
        ? profile.updatedAt.toISOString()
        : String(profile.updatedAt),
  };
}

export function hydrateDatingProfile(payload: DatingProfilePayload): DatingProfileView {
  return {
    ...payload,
    photosPublishedAt: payload.photosPublishedAt ? new Date(payload.photosPublishedAt) : null,
    updatedAt: new Date(payload.updatedAt),
  };
}

export function parseDatingPhotoStatus(value: string | null | undefined): DatingPhotoStatus {
  return value === 'pending' ? 'pending' : 'approved';
}
