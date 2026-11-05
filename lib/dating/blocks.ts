import 'server-only';

import { prisma } from '@/lib/prisma';

/**
 * Create a user-to-user block. Silent for the blocked party — no push, no inbox.
 * Archives dating messages both ways and removes likes both ways.
 */
export async function createDatingBlock(input: {
  blockerId: string;
  blockedUserId: string;
}): Promise<{ blocked: true } | { error: string }> {
  if (input.blockerId === input.blockedUserId) {
    return { error: 'CANNOT_BLOCK_SELF' };
  }

  const target = await prisma.user.findUnique({
    where: { id: input.blockedUserId },
    select: { id: true, datingProfile: { select: { id: true } } },
  });
  if (!target) return { error: 'NOT_FOUND' };

  const own = await prisma.datingProfile.findUnique({
    where: { userId: input.blockerId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.datingBlock.upsert({
      where: {
        blockerId_blockedUserId: {
          blockerId: input.blockerId,
          blockedUserId: input.blockedUserId,
        },
      },
      create: {
        blockerId: input.blockerId,
        blockedUserId: input.blockedUserId,
      },
      update: {},
    });

    if (target.datingProfile) {
      await tx.datingLike.deleteMany({
        where: {
          fromUserId: input.blockerId,
          toProfileId: target.datingProfile.id,
        },
      });
      await tx.datingTap.deleteMany({
        where: {
          fromUserId: input.blockerId,
          toProfileId: target.datingProfile.id,
        },
      });
    }
    if (own) {
      await tx.datingLike.deleteMany({
        where: { fromUserId: input.blockedUserId, toProfileId: own.id },
      });
      await tx.datingTap.deleteMany({
        where: { fromUserId: input.blockedUserId, toProfileId: own.id },
      });
    }

    await tx.message.updateMany({
      where: {
        isDating: true,
        archivedAt: null,
        OR: [
          { senderId: input.blockerId, recipientId: input.blockedUserId },
          { senderId: input.blockedUserId, recipientId: input.blockerId },
        ],
      },
      data: { archivedAt: new Date() },
    });

    await tx.datingAlbumGrant.deleteMany({
      where: {
        OR: [
          { ownerUserId: input.blockerId, viewerUserId: input.blockedUserId },
          { ownerUserId: input.blockedUserId, viewerUserId: input.blockerId },
        ],
      },
    });
  });

  return { blocked: true };
}

export async function removeDatingBlock(input: {
  blockerId: string;
  blockedUserId: string;
}): Promise<void> {
  await prisma.datingBlock.deleteMany({
    where: { blockerId: input.blockerId, blockedUserId: input.blockedUserId },
  });
}
