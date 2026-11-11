export type PresenceLabel = 'online' | 'active_today' | 'active_this_week' | 'hidden';

const ONLINE_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Derive a coarse presence label from lastActiveAt.
 * When presence is disabled, callers must omit the label (or use `hidden`)
 * and force the coarsest distance bucket.
 */
export function presenceFromLastActive(
  lastActiveAt: Date | null | undefined,
  presenceEnabled: boolean,
  now: number = Date.now(),
): PresenceLabel {
  if (!presenceEnabled) return 'hidden';
  if (!lastActiveAt) return 'active_this_week';
  const age = now - lastActiveAt.getTime();
  if (age < ONLINE_MS) return 'online';
  if (age < DAY_MS) return 'active_today';
  if (age < WEEK_MS) return 'active_this_week';
  return 'active_this_week';
}


/** Cut-off for "online now", as a Date, for use in Prisma where clauses. */
export function onlineSince(now: number = Date.now()): Date {
  return new Date(now - ONLINE_MS);
}
