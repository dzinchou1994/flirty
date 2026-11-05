import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { countDiscoveryFeed, listDiscoveryFeed } from '@/lib/dating/feed';
import { parseDiscoveryFiltersQuery } from '@/lib/api/schemas/discovery-filters';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const url = new URL(req.url);
  const filters = parseDiscoveryFiltersQuery(url.searchParams);

  if (url.searchParams.get('countOnly') === '1') {
    const counted = await countDiscoveryFeed({
      viewerId: auth.user.id,
      filters,
    });
    if (!counted.ok) {
      return err('RATE_LIMITED', 'Too many discovery requests', { status: 429 });
    }
    return ok({ count: counted.count });
  }

  const result = await listDiscoveryFeed({
    viewerId: auth.user.id,
    filters,
    cursor: url.searchParams.get('cursor'),
    limit: parseInt(url.searchParams.get('limit') || '24', 10) || 24,
  });
  if (!result.ok) {
    return err('RATE_LIMITED', 'Too many discovery requests', { status: 429 });
  }

  // Persist last-used filters (fire-and-forget style; failure must not break feed).
  if (url.searchParams.get('persist') !== '0') {
    void prisma.datingFilterPreset
      .upsert({
        where: { userId: auth.user.id },
        create: {
          userId: auth.user.id,
          filters: filters as object,
        },
        update: { filters: filters as object },
      })
      .catch(() => undefined);
  }

  return ok({ items: result.items, nextCursor: result.nextCursor });
}
