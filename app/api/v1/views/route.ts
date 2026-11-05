import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { listProfileViewsOfMe, recordProfileView } from '@/lib/dating/views';
import { takeDiscoveryRateLimit } from '@/lib/dating/rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const recordSchema = z.object({
  profileUserId: z.string().min(1),
});

/** Who viewed my dating profile. */
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const rate = takeDiscoveryRateLimit(auth.user.id);
  if (!rate.ok) return err('RATE_LIMITED', 'Too many requests', { status: 429 });

  const url = new URL(req.url);
  const page = await listProfileViewsOfMe({
    userId: auth.user.id,
    cursor: url.searchParams.get('cursor'),
    limit: parseInt(url.searchParams.get('limit') || '24', 10) || 24,
  });
  return ok(page);
}

/** Record that I opened someone else's profile (idempotent upsert). */
export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = recordSchema.safeParse(body);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'profileUserId required', { status: 400 });
  }
  await recordProfileView({
    viewerId: auth.user.id,
    profileUserId: parsed.data.profileUserId,
  });
  return ok({ recorded: true });
}
