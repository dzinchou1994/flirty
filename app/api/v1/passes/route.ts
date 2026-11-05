import { ok, err } from '@/lib/api/respond';
import { passRequestSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Record a skip so the profile stops reappearing in the stack. */
export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = passRequestSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'profileId required', { status: 400 });

  const target = await prisma.datingProfile.findUnique({
    where: { id: parsed.data.profileId },
    select: { id: true, userId: true },
  });
  if (!target) return err('PROFILE_NOT_VISIBLE', 'Profile is not visible', { status: 404 });
  if (target.userId === auth.user.id) {
    return err('VALIDATION_ERROR', 'Cannot pass your own profile', { status: 400 });
  }

  await prisma.datingPass.upsert({
    where: {
      fromUserId_toProfileId: { fromUserId: auth.user.id, toProfileId: target.id },
    },
    create: { fromUserId: auth.user.id, toProfileId: target.id },
    update: {},
  });

  // A pass is private: the other person is never told.
  return ok({ passed: true });
}

/** Undo — the stack offers one step back. */
export async function DELETE(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const profileId = new URL(req.url).searchParams.get('profileId');
  if (!profileId) return err('VALIDATION_ERROR', 'profileId required', { status: 400 });

  await prisma.datingPass.deleteMany({
    where: { fromUserId: auth.user.id, toProfileId: profileId },
  });
  return ok({ passed: false });
}
