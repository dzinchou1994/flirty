import 'server-only';

import { prisma } from '@/lib/prisma';

/** Max outbound dating messages before the peer replies (Grindr-style). */
export const UNANSWERED_OUTBOUND_LIMIT = 3;

function hasActivePremium(user: {
  isPremium: boolean;
  premiumUntil: Date | null;
  stripeSubscriptionId: string | null;
} | null): boolean {
  if (!user) return false;
  if (user.stripeSubscriptionId && user.isPremium) return true;
  if (user.isPremium && user.premiumUntil && user.premiumUntil.getTime() > Date.now()) {
    return true;
  }
  return Boolean(user.isPremium && !user.premiumUntil);
}

export type DatingMessageAccess = {
  /** Thread may be opened (not blocked; both have dating profiles). */
  allowed: boolean;
  /** Caller may send another message right now. */
  canSend: boolean;
  remaining: number;
  reason:
    | 'ok'
    | 'denied'
    | 'blocked'
    | 'no_profile'
    | 'limit'
    | 'match'
    | 'replied';
  matched: boolean;
  liked: boolean;
  isPremium: boolean;
};

const denied = (
  patch: Partial<DatingMessageAccess> = {},
): DatingMessageAccess => ({
  allowed: false,
  canSend: false,
  remaining: 0,
  reason: 'denied',
  matched: false,
  liked: false,
  isPremium: false,
  ...patch,
});

/**
 * Messaging no longer requires a mutual like.
 * Unanswered streak is capped so users cannot flood someone who never replies.
 * Once the peer has answered at least once (or it's a mutual match), send is open.
 */
export async function getDatingMessageAccess(
  fromUserId: string,
  toUserId: string,
): Promise<DatingMessageAccess> {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return denied();

  const blocked = await prisma.datingBlock.findFirst({
    where: {
      OR: [
        { blockerId: fromUserId, blockedUserId: toUserId },
        { blockerId: toUserId, blockedUserId: fromUserId },
      ],
    },
    select: { id: true },
  });
  if (blocked) return denied({ reason: 'blocked' });

  const [profileA, profileB, fromUser] = await Promise.all([
    prisma.datingProfile.findUnique({ where: { userId: fromUserId }, select: { id: true } }),
    prisma.datingProfile.findUnique({ where: { userId: toUserId }, select: { id: true } }),
    prisma.user.findUnique({
      where: { id: fromUserId },
      select: { isPremium: true, premiumUntil: true, stripeSubscriptionId: true },
    }),
  ]);
  if (!profileA || !profileB) return denied({ reason: 'no_profile' });

  const [aLikedB, bLikedA] = await Promise.all([
    prisma.datingLike.findUnique({
      where: { fromUserId_toProfileId: { fromUserId, toProfileId: profileB.id } },
      select: { id: true },
    }),
    prisma.datingLike.findUnique({
      where: { fromUserId_toProfileId: { fromUserId: toUserId, toProfileId: profileA.id } },
      select: { id: true },
    }),
  ]);

  const matched = Boolean(aLikedB && bLikedA);
  const liked = Boolean(aLikedB);
  const isPremium = hasActivePremium(fromUser);

  const base = {
    allowed: true as const,
    matched,
    liked,
    isPremium,
  };

  // Mutual match or peer already in conversation → no unanswered cap.
  if (matched) {
    return { ...base, canSend: true, remaining: 99, reason: 'match' };
  }

  const lastFromPeer = await prisma.message.findFirst({
    where: {
      isDating: true,
      archivedAt: null,
      senderId: toUserId,
      recipientId: fromUserId,
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (lastFromPeer) {
    return { ...base, canSend: true, remaining: 99, reason: 'replied' };
  }

  const outboundUnanswered = await prisma.message.count({
    where: {
      isDating: true,
      archivedAt: null,
      senderId: fromUserId,
      recipientId: toUserId,
    },
  });

  const limit = isPremium ? UNANSWERED_OUTBOUND_LIMIT + 2 : UNANSWERED_OUTBOUND_LIMIT;
  const remaining = Math.max(0, limit - outboundUnanswered);
  if (remaining <= 0) {
    return {
      ...base,
      canSend: false,
      remaining: 0,
      reason: 'limit',
    };
  }

  return {
    ...base,
    canSend: true,
    remaining,
    reason: 'ok',
  };
}
