import { ok, err } from '@/lib/api/respond';
import { adminRestrictSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth?.user.isAdmin) return err('UNAUTHORIZED', 'Admin only', { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = adminRestrictSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid payload', { status: 400 });

  const row = await prisma.datingProfile.update({
    where: { id },
    data: {
      moderationStatus: parsed.data.status,
      moderationReason: parsed.data.reason ?? null,
      moderatedAt: new Date(),
      isVisible: parsed.data.status === 'active' ? undefined : false,
    },
  });

  // Close open reports so the 24h SLA is measurable.
  await prisma.datingProfileReport.updateMany({
    where: { profileId: id, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });

  return ok({
    id: row.id,
    moderationStatus: row.moderationStatus,
    moderationReason: row.moderationReason,
  });
}
