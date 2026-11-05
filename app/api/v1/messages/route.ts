import { ok, err } from '@/lib/api/respond';
import { messageSendSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { getDatingMessageAccess } from '@/lib/dating/access';
import { createDatingMessage, listDatingThread, markDatingThreadRead } from '@/lib/db/messages';
import { prisma } from '@/lib/prisma';
import { absoluteMediaUrl } from '@/lib/site';
import { buildDatingPushPayload } from '@/lib/dating/push-payload';
import { areUsersBlocked } from '@/lib/dating/privacy';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const url = new URL(req.url);
  const peerId = url.searchParams.get('peerId');

  if (peerId) {
    if (await areUsersBlocked(auth.user.id, peerId)) {
      return err('MESSAGE_DENIED', 'Cannot open this thread', { status: 403 });
    }
    const access = await getDatingMessageAccess(auth.user.id, peerId);
    if (!access.allowed) return err('MESSAGE_DENIED', 'Cannot open this thread', { status: 403 });
    const page = await listDatingThread({
      userId: auth.user.id,
      peerId,
      cursor: url.searchParams.get('cursor'),
      limit: parseInt(url.searchParams.get('limit') || '50', 10) || 50,
    });
    await markDatingThreadRead(auth.user.id, peerId);
    return ok({
      items: page.items.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
      nextCursor: page.nextCursor,
      canSend: access.canSend,
      remaining: access.remaining,
      reason: access.reason,
    });
  }

  const own = await prisma.datingProfile.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!own) return ok({ items: [], nextCursor: null });

  // Inbox: blocked peers excluded via NOT EXISTS on User.blocks* (either direction).
  const notBlockedWithMe = {
    blocksReceived: { none: { blockerId: auth.user.id } },
    blocksInitiated: { none: { blockedUserId: auth.user.id } },
  };
  const messages = await prisma.message.findMany({
    where: {
      isDating: true,
      archivedAt: null,
      OR: [
        { senderId: auth.user.id, recipient: notBlockedWithMe },
        { recipientId: auth.user.id, sender: notBlockedWithMe },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { senderId: true, recipientId: true, body: true, createdAt: true },
  });

  const peers = new Map<string, { lastBody: string; lastAt: Date }>();
  for (const m of messages) {
    const peer = m.senderId === auth.user.id ? m.recipientId : m.senderId;
    if (!peer || peers.has(peer)) continue;
    peers.set(peer, { lastBody: m.body, lastAt: m.createdAt });
  }

  const items = [];
  for (const [pid, meta] of peers) {
    const user = await prisma.user.findUnique({
      where: { id: pid },
      select: {
        id: true,
        username: true,
        avatar: true,
        datingProfile: { select: { id: true, name: true } },
      },
    });
    if (!user?.datingProfile) continue;
    items.push({
      peerId: user.id,
      username: user.username,
      name: user.datingProfile.name,
      avatar: absoluteMediaUrl(user.avatar),
      lastBody: meta.lastBody.slice(0, 80),
      lastAt: meta.lastAt.toISOString(),
    });
  }
  items.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  return ok({ items: items.slice(0, 40), nextCursor: null });
}

export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = messageSendSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid message', { status: 400 });

  if (await areUsersBlocked(auth.user.id, parsed.data.peerId)) {
    return err('MESSAGE_DENIED', 'Cannot message this user', { status: 403 });
  }

  const access = await getDatingMessageAccess(auth.user.id, parsed.data.peerId);
  if (!access.allowed) return err('MESSAGE_DENIED', 'Cannot message this user', { status: 403 });
  if (!access.canSend) {
    return err(
      'MESSAGE_LIMIT',
      'Wait for a reply before sending more messages',
      { status: 429 },
    );
  }

  const msg = await createDatingMessage({
    senderId: auth.user.id,
    recipientId: parsed.data.peerId,
    body: parsed.data.body.trim(),
  });

  // Neutral push shape only — never message text or sender name.
  const push = buildDatingPushPayload({
    kind: 'message',
    id: msg.id,
    ref: parsed.data.peerId,
  });

  const after = await getDatingMessageAccess(auth.user.id, parsed.data.peerId);

  return ok(
    {
      id: msg.id,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      push,
      canSend: after.canSend,
      remaining: after.remaining,
    },
    { status: 201 },
  );
}
