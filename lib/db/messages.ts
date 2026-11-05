import 'server-only';

import { prisma } from '@/lib/prisma';

/** All Message access for this app goes through this module with isDating: true. */

export async function listDatingThread(input: {
  userId: string;
  peerId: string;
  cursor?: string | null;
  limit: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit));
  const rows = await prisma.message.findMany({
    where: {
      isDating: true,
      archivedAt: null,
      OR: [
        { senderId: input.userId, recipientId: input.peerId },
        { senderId: input.peerId, recipientId: input.userId },
      ],
      ...(input.cursor
        ? { createdAt: { lt: new Date(input.cursor) } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      body: true,
      createdAt: true,
    },
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() ?? null : null;
  return { items: items.reverse(), nextCursor };
}

export async function createDatingMessage(input: {
  senderId: string;
  recipientId: string;
  body: string;
}) {
  return prisma.message.create({
    data: {
      senderId: input.senderId,
      recipientId: input.recipientId,
      body: input.body,
      isDating: true,
    },
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      body: true,
      createdAt: true,
    },
  });
}

export async function deleteDatingMessagesForUser(userId: string): Promise<number> {
  const result = await prisma.message.deleteMany({
    where: {
      isDating: true,
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
  });
  return result.count;
}

export async function markDatingThreadRead(userId: string, peerId: string) {
  await prisma.dmReadState.upsert({
    where: { userId_peerId: { userId, peerId } },
    create: { userId, peerId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function deleteDmReadStatesForUser(userId: string) {
  await prisma.dmReadState.deleteMany({
    where: { OR: [{ userId }, { peerId: userId }] },
  });
}
