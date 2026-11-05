import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { getVisibleProfileForViewer } from '@/lib/dating/feed';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ username: string }> },
) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const { username } = await ctx.params;
  const profile = await getVisibleProfileForViewer({
    viewerId: auth.user.id,
    username,
  });
  if (!profile) return err('PROFILE_NOT_VISIBLE', 'Profile is not visible', { status: 404 });
  return ok(profile);
}
