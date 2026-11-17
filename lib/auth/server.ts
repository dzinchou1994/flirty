import 'server-only';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/lib/auth/tokens';
import { isUserDeletionPending } from '@/lib/auth/getAuth';
import { touchLastActive } from '@/lib/auth/touch-last-active';

async function loadUser(userId: string) {
  if (await isUserDeletionPending(userId)) return null;
  await touchLastActive(userId);
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      gender: true,
      avatar: true,
      isAdmin: true,
      isPremium: true,
      premiumUntil: true,
      stripeSubscriptionId: true,
    },
  });
}

/**
 * Resolve the signed-in user for RSC / pages.
 * Falls back to the long-lived refresh cookie when the access cookie expired,
 * so a short access TTL cannot silently log people out on every navigation.
 */
export async function getSessionUser() {
  if (!ensureDatabaseUrl()) return null;
  const jar = await cookies();

  const access = verifyAccessToken(jar.get(SESSION_COOKIE)?.value);
  if (access) return loadUser(access.sub);

  const refresh = verifyRefreshToken(jar.get(REFRESH_COOKIE)?.value);
  if (refresh) return loadUser(refresh.sub);

  return null;
}
