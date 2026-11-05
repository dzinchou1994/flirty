import 'server-only';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';
import { SESSION_COOKIE, verifyAccessToken } from '@/lib/auth/tokens';
import { isUserDeletionPending } from '@/lib/auth/getAuth';

export async function getSessionUser() {
  if (!ensureDatabaseUrl()) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const claims = verifyAccessToken(token);
  if (!claims) return null;
  if (await isUserDeletionPending(claims.sub)) return null;
  return prisma.user.findUnique({
    where: { id: claims.sub },
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
