import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { absoluteMediaUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  return ok({
    id: auth.user.id,
    username: auth.user.username,
    email: auth.user.email,
    avatar: absoluteMediaUrl(auth.user.avatar),
    gender: auth.user.gender,
    isAdmin: auth.user.isAdmin,
  });
}
