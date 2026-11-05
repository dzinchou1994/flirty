import 'server-only';
import { prisma } from '@/lib/prisma';

export async function getDatingLikeStatus(userId: string, profileId: string) {
  const like = await prisma.datingLike.findUnique({
    where: { fromUserId_toProfileId: { fromUserId: userId, toProfileId: profileId } },
  });
  const target = await prisma.datingProfile.findUnique({ where: { id: profileId }, select: { userId: true } });
  const own = await prisma.datingProfile.findUnique({ where: { userId }, select: { id: true } });
  let matched = false;
  if (like && target && own) {
    const reverse = await prisma.datingLike.findUnique({
      where: { fromUserId_toProfileId: { fromUserId: target.userId, toProfileId: own.id } },
    });
    matched = Boolean(reverse);
  }
  return { liked: Boolean(like), matched };
}
