import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { listNearbyGrid } from '@/lib/dating/grid';

export const dynamic = 'force-dynamic';

/**
 * Grindr-style nearby grid. Distance is a bucket label only
 * (`<1km` | `1-3km` | `3-10km` | `10km+`) — never metres, coords, or bearing.
 */
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const url = new URL(req.url);
  const result = await listNearbyGrid({
    viewerId: auth.user.id,
    bucket: url.searchParams.get('bucket'),
    city: url.searchParams.get('city'),
    cursor: url.searchParams.get('cursor'),
    limit: parseInt(url.searchParams.get('limit') || '24', 10) || 24,
  });
  if (!result.ok) {
    if (result.code === 'RATE_LIMITED') {
      return err('RATE_LIMITED', 'Too many discovery requests', { status: 429 });
    }
    return err('LOCATION_REQUIRED', 'Share location to use the nearby grid', { status: 400 });
  }
  return ok({ items: result.items, nextCursor: result.nextCursor });
}
