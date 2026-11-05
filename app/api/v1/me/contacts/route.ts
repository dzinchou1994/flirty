import { ok, err } from '@/lib/api/respond';
import { contactsReplaceSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { hashPhone } from '@/lib/dating/contacts';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = contactsReplaceSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid contacts payload', { status: 400 });

  const hashes = [
    ...new Set(
      parsed.data.phones
        .map((p) => hashPhone(p))
        .filter((h): h is string => Boolean(h)),
    ),
  ].slice(0, 5000);

  await prisma.$transaction(async (tx) => {
    await tx.datingContactHash.deleteMany({ where: { userId: auth.user.id } });
    if (hashes.length) {
      await tx.datingContactHash.createMany({
        data: hashes.map((phoneHash) => ({ userId: auth.user.id, phoneHash })),
        skipDuplicates: true,
      });
    }
  });

  return ok({ count: hashes.length });
}

export async function DELETE(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  await prisma.datingContactHash.deleteMany({ where: { userId: auth.user.id } });
  return ok({ count: 0 });
}
