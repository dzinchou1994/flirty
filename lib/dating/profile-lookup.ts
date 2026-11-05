import 'server-only';
import { prisma } from '@/lib/prisma';
import { serializePublicProfile } from '@/lib/dating/serialize';
import { hydrateDatingProfile, type DatingProfileView } from '@/lib/dating/shared';

const approvedPhotos = {
  where: { status: 'approved' as const },
  orderBy: { sortOrder: 'asc' as const },
};

export async function getDatingProfileByUsername(username: string): Promise<DatingProfileView | null> {
  const row = await prisma.datingProfile.findFirst({
    where: { user: { username: { equals: username, mode: 'insensitive' } } },
    include: {
      user: { select: { username: true, avatar: true, gender: true, lastActiveAt: true } },
      photos: approvedPhotos,
    },
  });
  return row ? hydrateDatingProfile(serializePublicProfile(row)) : null;
}

export async function userHasUnlockingDatingProfile(userId: string): Promise<boolean> {
  const count = await prisma.datingProfile.count({
    where: {
      userId,
      photos: { some: { status: 'approved' } },
      bio: { not: '' },
      moderationStatus: 'active',
    },
  });
  return count > 0;
}
