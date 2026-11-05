import { z } from 'zod';

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().optional(),
  }),
});

export const cursorPageSchema = z.object({
  items: z.array(z.unknown()),
  nextCursor: z.string().nullable(),
});

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  ageConfirmed: z.literal(true),
});

export const registerRequestSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(8).max(128),
  email: z.string().email().optional(),
  gender: z.enum(['male', 'female', 'nonBinary']).optional(),
  ageConfirmed: z.literal(true),
});

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export const oauthIdTokenSchema = z.object({
  idToken: z.string().min(1),
  ageConfirmed: z.literal(true),
});

export {
  discoveryFiltersSchema,
  lookingForTagSchema,
  profileUpdateSchema,
} from '@/lib/api/schemas/discovery-filters';

export const likeRequestSchema = z.object({
  profileId: z.string().min(1),
  /// The element the like is aimed at. At most one; omit both to like the
  /// whole profile (what the grid view still does).
  photoId: z.string().min(1).optional(),
  promptAnswerId: z.string().min(1).optional(),
  comment: z.string().trim().max(500).optional(),
});

export const passRequestSchema = z.object({
  profileId: z.string().min(1),
});

export const promptAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        promptKey: z.string().min(1).max(64),
        answer: z.string().trim().min(1).max(220),
      }),
    )
    .max(3),
});

export const reportRequestSchema = z.object({
  profileId: z.string().min(1),
  reason: z.enum(['celebrity', 'cartoon', 'nudity', 'other']),
});

export const blockRequestSchema = z.object({
  userId: z.string().min(1),
});

export const messageSendSchema = z.object({
  peerId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

export const nearbyUpsertSchema = z.union([
  z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    fuzzM: z.number().int().min(10).max(1000).optional(),
  }),
  z.object({
    cityFallback: z.literal(true),
  }),
]);

export const contactsReplaceSchema = z.object({
  phones: z.array(z.string().min(3).max(32)).max(5000),
});

export const deleteAccountSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const adminRestrictSchema = z.object({
  status: z.enum(['hidden', 'blocked', 'active']),
  reason: z.string().max(500).optional(),
});
