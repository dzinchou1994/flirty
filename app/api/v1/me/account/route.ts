import { ok, err } from '@/lib/api/respond';
import { deleteAccountSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { requestAccountDeletion } from '@/lib/dating/deletion';
import { clearSessionCookies } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'username and password required', { status: 400 });

  const result = await requestAccountDeletion({
    userId: auth.user.id,
    submittedUsername: parsed.data.username,
    submittedPassword: parsed.data.password,
  });
  if (!result.ok) return err(result.code, result.message, { status: 400 });

  return clearSessionCookies(ok({ deleted: true, userErasure: 'queued' }));
}
