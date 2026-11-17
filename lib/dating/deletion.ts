import 'server-only';

import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { deleteObjectKeys } from '@/lib/media/storage';
import { objectKeyFromUrl } from '@/lib/media/storage';

/**
 * Hard-delete this account on the Dating database. The User row is removed
 * here; related dating rows cascade. Intimgram is not updated.
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

  const mediaKeys = (user.datingProfile?.photos ?? [])
    .map((p) => objectKeyFromUrl(p.url))
    .filter((k): k is string => Boolean(k));

  try {
    await prisma.user.delete({ where: { id: user.id } });
  } catch (err) {
    console.error('[requestAccountDeletion]', err);
    return { ok: false, code: 'DELETE_FAILED', message: 'Could not delete account' };
  }

  try {
    await deleteObjectKeys(mediaKeys);
  } catch (err) {
    console.error('[requestAccountDeletion] media cleanup', err);
  }

  return { ok: true };
}
