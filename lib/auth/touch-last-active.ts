import 'server-only';

import { prisma } from '@/lib/prisma';

/** Don't write lastActiveAt more than once a minute per user. */
const TOUCH_MS = 60 * 1000;

/**
 * Mark the user online. The feed treats lastActiveAt as "here now", but
 * nothing else refreshed it after login, so a photoless profile dropped out
 * of the grid while the person was still browsing.
 */
export async function touchLastActive(userId: string): Promise<void> {
  try {
    await prisma.user.updateMany({
      where: {
        id: userId,
        lastActiveAt: { lt: new Date(Date.now() - TOUCH_MS) },
      },
      data: { lastActiveAt: new Date() },
    });
  } catch (err) {
    console.error('[presence] touch lastActiveAt failed', err);
  }
}
