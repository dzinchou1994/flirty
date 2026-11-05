import { ok, err } from '@/lib/api/respond';
import { loginRequestSchema } from '@/lib/api/schemas';
import { normalizeUsername, verifyPassword } from '@/lib/auth/password';
import { isUserDeletionPending } from '@/lib/auth/getAuth';
import { attachSessionCookies, issueSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!ensureDatabaseUrl()) return err('SERVICE_UNAVAILABLE', 'Service unavailable', { status: 503 });
  const body = await req.json().catch(() => null);
  const parsed = loginRequestSchema.safeParse(body);
  if (!parsed.success) {
    if (body && typeof body === 'object' && (body as { ageConfirmed?: unknown }).ageConfirmed !== true) {
      return err('AGE_GATE_REQUIRED', 'You must confirm you are 18+', { status: 403, field: 'ageConfirmed' });
    }
    return err('VALIDATION_ERROR', 'Invalid login payload', { status: 400 });
  }

  const username = normalizeUsername(parsed.data.username);
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, passwordHash: true, username: true },
  });
  if (!user?.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return err('INVALID_CREDENTIALS', 'Invalid username or password', { status: 401 });
  }

  if (await isUserDeletionPending(user.id)) {
    return err('ACCOUNT_DELETED', 'This account has been deleted', { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  }).catch(() => null);

  const session = issueSession(user.id);
  const res = ok({
    user: { id: user.id, username: user.username },
    ...session,
  });
  return attachSessionCookies(res, session);
}
