import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { VisibilityMode } from '@/lib/dating/privacy-logic';

export type { VisibilityMode } from '@/lib/dating/privacy-logic';
export {
  wouldExcludeByBlock,
  wouldExcludeByContact,
  isVisibleUnderMode,
} from '@/lib/dating/privacy-logic';

export type PrivacyViewer = {
  userId: string;
  phoneHash: string | null;
  ownProfileId: string | null;
  /** Preloaded hashes from the viewer's address book (never raw numbers). */
  contactHashes: string[];
};

/**
 * Symmetric user-to-user block as a DatingProfile WHERE fragment.
 * Neither direction may leave the server.
 */
export function blockWhereForViewer(viewerUserId: string): Prisma.DatingProfileWhereInput {
  return {
    user: {
      AND: [
        { blocksReceived: { none: { blockerId: viewerUserId } } },
        { blocksInitiated: { none: { blockedUserId: viewerUserId } } },
      ],
    },
  };
}

/**
 * Mutual contact exclusion:
 * - owner's book contains viewer's verified phoneHash, OR
 * - viewer's book contains owner's verified phoneHash
 * → profile must never be serialised.
 */
export function contactExclusionWhere(
  viewer: PrivacyViewer,
): Prisma.DatingProfileWhereInput {
  const parts: Prisma.DatingProfileWhereInput[] = [];

  if (viewer.phoneHash) {
    parts.push({
      NOT: {
        user: {
          datingContactHashes: { some: { phoneHash: viewer.phoneHash } },
        },
      },
    });
  }

  if (viewer.contactHashes.length > 0) {
    parts.push({
      OR: [{ phoneHash: null }, { phoneHash: { notIn: viewer.contactHashes } }],
    });
  }

  return parts.length ? { AND: parts } : {};
}

/**
 * Visibility modes on DatingProfile (B2).
 * - discoverable: normal
 * - mutual_only: invisible until the owner has liked the viewer
 * - incognito: visible only to people the owner has liked or messaged
 *
 * Legacy `requireMutualInterest` is treated as mutual_only.
 */
export function visibilityModeWhere(
  viewer: PrivacyViewer,
): Prisma.DatingProfileWhereInput {
  if (!viewer.ownProfileId) {
    return {
      AND: [
        { visibilityMode: { not: 'mutual_only' } },
        { visibilityMode: { not: 'incognito' } },
        { requireMutualInterest: false },
      ],
    };
  }

  const ownerLikedViewer: Prisma.DatingProfileWhereInput = {
    user: {
      sentDatingLikes: { some: { toProfileId: viewer.ownProfileId } },
    },
  };

  const ownerMessagedViewer: Prisma.DatingProfileWhereInput = {
    user: {
      OR: [
        {
          sentMessages: {
            some: {
              isDating: true,
              archivedAt: null,
              recipientId: viewer.userId,
            },
          },
        },
        {
          receivedMessages: {
            some: {
              isDating: true,
              archivedAt: null,
              senderId: viewer.userId,
            },
          },
        },
      ],
    },
  };

  return {
    OR: [
      {
        AND: [
          { visibilityMode: 'discoverable' },
          { requireMutualInterest: false },
        ],
      },
      {
        AND: [
          {
            OR: [
              { visibilityMode: 'mutual_only' },
              { requireMutualInterest: true },
            ],
          },
          ownerLikedViewer,
        ],
      },
      {
        AND: [
          { visibilityMode: 'incognito' },
          {
            OR: [ownerLikedViewer, ownerMessagedViewer],
          },
        ],
      },
    ],
  };
}

/**
 * Full server-side discovery / profile visibility gate.
 * Every query that would serialise another user's profile must AND this in.
 */
export function privacyWhereForViewer(viewer: PrivacyViewer): Prisma.DatingProfileWhereInput {
  return {
    AND: [
      blockWhereForViewer(viewer.userId),
      contactExclusionWhere(viewer),
      visibilityModeWhere(viewer),
    ],
  };
}

export async function loadPrivacyViewer(userId: string): Promise<PrivacyViewer> {
  const [own, hashes] = await Promise.all([
    prisma.datingProfile.findUnique({
      where: { userId },
      select: { id: true, phoneHash: true },
    }),
    prisma.datingContactHash.findMany({
      where: { userId },
      select: { phoneHash: true },
      take: 5000,
    }),
  ]);
  return {
    userId,
    phoneHash: own?.phoneHash ?? null,
    ownProfileId: own?.id ?? null,
    contactHashes: hashes.map((h) => h.phoneHash),
  };
}

/** True when a block exists in either direction. */
export async function areUsersBlocked(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false;
  const row = await prisma.datingBlock.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedUserId: b },
        { blockerId: b, blockedUserId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}
