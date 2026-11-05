type Bucket = { count: number; resetAt: number };

const stores = new Map<string, Map<string, Bucket>>();

function storeFor(name: string): Map<string, Bucket> {
  let s = stores.get(name);
  if (!s) {
    s = new Map();
    stores.set(name, s);
  }
  return s;
}

/**
 * Simple in-process sliding window. Good enough until Redis; keys are per-account.
 * Returns { ok: false } when the caller should receive RATE_LIMITED.
 */
export function takeRateLimit(input: {
  name: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): { ok: true; remaining: number } | { ok: false; retryAfterMs: number } {
  const now = input.now ?? Date.now();
  const store = storeFor(input.name);
  const existing = store.get(input.key);
  if (!existing || existing.resetAt <= now) {
    store.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return { ok: true, remaining: input.limit - 1 };
  }
  if (existing.count >= input.limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }
  existing.count += 1;
  return { ok: true, remaining: input.limit - existing.count };
}

/** Discovery / nearby grid: 60 requests per minute per account. */
export function takeDiscoveryRateLimit(userId: string) {
  return takeRateLimit({
    name: 'discovery',
    key: userId,
    limit: 60,
    windowMs: 60_000,
  });
}

/** Taps: 30 per hour per account. */
export function takeTapRateLimit(userId: string) {
  return takeRateLimit({
    name: 'taps',
    key: userId,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
}

/** Test helper — clear all windows. */
export function resetRateLimits(): void {
  stores.clear();
}
