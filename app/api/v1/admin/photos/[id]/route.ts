import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth?.user.isAdmin) return err('UNAUTHORIZED', 'Admin only', { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  if (body?.action === 'approve') {
    const photo = await prisma.datingPhoto.update({
      where: { id },
      data: { status: 'approved' },
    });
    return ok({ id: photo.id, status: photo.status });
  }
  if (body?.action === 'reject') {
    await prisma.datingPhoto.delete({ where: { id } });
    return ok({ id, status: 'rejected' });
  }
  return err('VALIDATION_ERROR', 'action must be approve or reject', { status: 400 });
}
