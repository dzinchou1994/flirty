import { ok, err } from '@/lib/api/respond';
import { oauthIdTokenSchema } from '@/lib/api/schemas';
import { createGoogleProvider, findOrCreateOAuthUser } from '@/lib/auth/oauth';
import { isUserDeletionPending } from '@/lib/auth/getAuth';
import { attachSessionCookies, issueSession } from '@/lib/auth/session';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!ensureDatabaseUrl()) return err('SERVICE_UNAVAILABLE', 'Service unavailable', { status: 503 });
  const body = await req.json().catch(() => null);
  const parsed = oauthIdTokenSchema.safeParse(body);
  if (!parsed.success) {
    if (body && typeof body === 'object' && (body as { ageConfirmed?: unknown }).ageConfirmed !== true) {
      return err('AGE_GATE_REQUIRED', 'You must confirm you are 18+', { status: 403, field: 'ageConfirmed' });
    }
    return err('VALIDATION_ERROR', 'idToken required', { status: 400 });
  }

  try {
    const info = await createGoogleProvider().verifyIdToken(parsed.data.idToken);
    const user = await findOrCreateOAuthUser(info);
    if (await isUserDeletionPending(user.id)) {
      return err('ACCOUNT_DELETED', 'This account has been deleted', { status: 403 });
    }
    const session = issueSession(user.id);
    return attachSessionCookies(ok({ user: { id: user.id, username: user.username }, ...session }), session);
  } catch (e) {
    console.error('[auth/google]', e);
    return err('OAUTH_FAILED', 'Google sign-in failed', { status: 401 });
  }
}
