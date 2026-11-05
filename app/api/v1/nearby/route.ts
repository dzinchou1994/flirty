import { ok, err } from '@/lib/api/respond';
import { nearbyUpsertSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import {
  getNearbySelfStatus,
  listNearbyMembers,
  stopNearbySharing,
  upsertCityFallbackLocation,
  upsertNearbyLocation,
} from '@/lib/dating/nearby';
import { absoluteMediaUrl } from '@/lib/site';
import { takeDiscoveryRateLimit } from '@/lib/dating/rate-limit';

export const dynamic = 'force-dynamic';

/** Map members — fuzzed coords only. Privacy filters applied in SQL. */
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const rate = takeDiscoveryRateLimit(auth.user.id);
  if (!rate.ok) return err('RATE_LIMITED', 'Too many discovery requests', { status: 429 });

  const self = await getNearbySelfStatus(auth.user.id);
  const members = await listNearbyMembers(auth.user.id);
  return ok({
    self,
    members: members.map((m) => ({
      ...m,
      avatar: absoluteMediaUrl(m.avatar),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  if (body && (body as { stop?: boolean }).stop === true) {
    return ok(await stopNearbySharing(auth.user.id));
  }
  const parsed = nearbyUpsertSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid location payload', { status: 400 });
  try {
    if ('cityFallback' in parsed.data) {
      return ok(await upsertCityFallbackLocation(auth.user.id));
    }
    const self = await upsertNearbyLocation(
      auth.user.id,
      parsed.data.lat,
      parsed.data.lng,
      parsed.data.fuzzM ?? 100,
    );
    return ok(self);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ERROR';
    if (msg === 'INVALID_COORDS') return err('INVALID_COORDS', 'Invalid coordinates', { status: 400 });
    return err('SERVICE_UNAVAILABLE', 'Could not update location', { status: 503 });
  }
}
