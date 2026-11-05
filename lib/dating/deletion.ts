import 'server-only';

import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { deleteDatingMessagesForUser, deleteDmReadStatesForUser } from '@/lib/db/messages';
import { deleteObjectKeys } from '@/lib/media/storage';
import { objectKeyFromUrl } from '@/lib/media/storage';

/**
 * Immediate hard-delete of dating data + queue User erasure for the community app.
 * Login fails as soon as UserDeletionRequest is pending (see getAuth).
 */
export async function requestAccountDeletion(input: {
  userId: string;
  submittedUsername: string;
  submittedPassword: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      datingProfile: {
        select: { id: true, photos: { select: { url: true } } },
      },
    },
  });
  if (!user) return { ok: false, code: 'NOT_FOUND', message: 'Account not found' };

  if (user.username.toLowerCase() !== input.submittedUsername.trim().toLowerCase()) {
    return { ok: false, code: 'USERNAME_MISMATCH', message: 'Username does not match' };
  }
  if (!user.passwordHash) {
    return { ok: false, code: 'PASSWORD_REQUIRED', message: 'Password required' };
  }
  if (!verifyPassword(input.submittedPassword, user.passwordHash)) {
    return { ok: false, code: 'INVALID_PASSWORD', message: 'Invalid password' };
  }

  const existing = await prisma.userDeletionRequest.findUnique({
    where: { userId: user.id },
  });
  if (existing && (existing.status === 'pending' || existing.status === 'processing')) {
    return { ok: true };
  }

  const mediaKeys = (user.datingProfile?.photos ?? [])
    .map((p) => objectKeyFromUrl(p.url))
    .filter((k): k is string => Boolean(k));

  await prisma.$transaction(async (tx) => {
    await tx.datingBlock.deleteMany({
      where: { OR: [{ blockerId: user.id }, { blockedUserId: user.id }] },
    });
    await tx.datingAlbumGrant.deleteMany({
      where: { OR: [{ ownerUserId: user.id }, { viewerUserId: user.id }] },
    });
    await tx.datingTap.deleteMany({ where: { fromUserId: user.id } });
    await tx.datingProfileView.deleteMany({ where: { viewerId: user.id } });

    if (user.datingProfile) {
      await tx.datingProfileView.deleteMany({ where: { profileId: user.datingProfile.id } });
      await tx.datingTap.deleteMany({ where: { toProfileId: user.datingProfile.id } });
      await tx.datingPhoto.deleteMany({ where: { profileId: user.datingProfile.id } });
      await tx.datingLike.deleteMany({
        where: {
          OR: [
            { fromUserId: user.id },
            { toProfileId: user.datingProfile.id },
          ],
        },
      });
      await tx.datingProfileReport.deleteMany({
        where: {
          OR: [{ profileId: user.datingProfile.id }, { reporterId: user.id }],
        },
      });
      await tx.datingProfile.delete({ where: { id: user.datingProfile.id } });
    } else {
      await tx.datingLike.deleteMany({ where: { fromUserId: user.id } });
      await tx.datingProfileReport.deleteMany({ where: { reporterId: user.id } });
    }

    await tx.datingContactHash.deleteMany({ where: { userId: user.id } });

    await tx.userDeletionRequest.upsert({
      where: { userId: user.id },
      create: { userId: user.id, status: 'pending' },
      update: { status: 'pending', requestedAt: new Date(), error: null, processedAt: null },
    });
  });

  await deleteDatingMessagesForUser(user.id);
  await deleteDmReadStatesForUser(user.id);

  try {
    await deleteObjectKeys(mediaKeys);
  } catch (err) {
    console.error('[requestAccountDeletion] media cleanup', err);
  }

  return { ok: true };
}
