import { ok, err } from '@/lib/api/respond';
import { refreshRequestSchema } from '@/lib/api/schemas';
import { isUserDeletionPending } from '@/lib/auth/getAuth';
import { attachSessionCookies, issueSession } from '@/lib/auth/session';
import { REFRESH_COOKIE, verifyRefreshToken } from '@/lib/auth/tokens';

export const dynamic = 'force-dynamic';

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = refreshRequestSchema.safeParse({
    refreshToken: (body as { refreshToken?: string }).refreshToken || readCookie(req, REFRESH_COOKIE),
  });
  if (!parsed.success) return err('VALIDATION_ERROR', 'refreshToken required', { status: 400 });

  const claims = verifyRefreshToken(parsed.data.refreshToken);
  if (!claims) return err('INVALID_TOKEN', 'Invalid refresh token', { status: 401 });
  if (await isUserDeletionPending(claims.sub)) {
    return err('ACCOUNT_DELETED', 'This account has been deleted', { status: 403 });
  }

  const session = issueSession(claims.sub);
  return attachSessionCookies(ok(session), session);
}
