import { ok, err } from '@/lib/api/respond';
import { blockRequestSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { createDatingBlock, removeDatingBlock } from '@/lib/dating/blocks';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** List users the caller has blocked. Never notifies anyone. */
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const rows = await prisma.datingBlock.findMany({
    where: { blockerId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { blockedUserId: true, createdAt: true },
  });
  return ok({
    items: rows.map((r) => ({
      userId: r.blockedUserId,
      blockedAt: r.createdAt.toISOString(),
    })),
  });
}

/**
 * Block a user. Symmetric in effect; silent for the blocked party.
 * Reachable alongside Report from any profile / conversation.
 */
export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = blockRequestSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'userId required', { status: 400 });

  const result = await createDatingBlock({
    blockerId: auth.user.id,
    blockedUserId: parsed.data.userId,
  });
  if ('error' in result) {
    if (result.error === 'CANNOT_BLOCK_SELF') {
      return err('CANNOT_BLOCK_SELF', 'Cannot block yourself', { status: 400 });
    }
    return err('NOT_FOUND', 'User not found', { status: 404 });
  }
  return ok({ blocked: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return err('VALIDATION_ERROR', 'userId required', { status: 400 });
  await removeDatingBlock({ blockerId: auth.user.id, blockedUserId: userId });
  return ok({ blocked: false });
}
