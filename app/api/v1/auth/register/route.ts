import { ok, err } from '@/lib/api/respond';
import { registerRequestSchema } from '@/lib/api/schemas';
import { hashPassword, normalizeUsername } from '@/lib/auth/password';
import { attachSessionCookies, issueSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!ensureDatabaseUrl()) return err('SERVICE_UNAVAILABLE', 'Service unavailable', { status: 503 });
  const body = await req.json().catch(() => null);
  const parsed = registerRequestSchema.safeParse(body);
  if (!parsed.success) {
    if (body && typeof body === 'object' && (body as { ageConfirmed?: unknown }).ageConfirmed !== true) {
      return err('AGE_GATE_REQUIRED', 'You must confirm you are 18+', { status: 403, field: 'ageConfirmed' });
    }
    return err('VALIDATION_ERROR', 'Invalid registration payload', { status: 400 });
  }

  const username = normalizeUsername(parsed.data.username);
  if (username.length < 3) {
    return err('VALIDATION_ERROR', 'Username too short', { status: 400, field: 'username' });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return err('USERNAME_TAKEN', 'Username is taken', { status: 409, field: 'username' });

  if (parsed.data.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) return err('EMAIL_TAKEN', 'Email is taken', { status: 409, field: 'email' });
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(parsed.data.password),
        email: parsed.data.email,
        emailVerifiedAt: parsed.data.email ? new Date() : null,
        gender: parsed.data.gender ?? null,
      },
      select: { id: true, username: true },
    });

    const session = issueSession(user.id);
    const res = ok({ user, ...session }, { status: 201 });
    return attachSessionCookies(res, session);
  } catch (e) {
    console.error('[register]', e);
    return err('SERVICE_UNAVAILABLE', 'Could not create account', { status: 503 });
  }
}
