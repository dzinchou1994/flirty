/**
 * Discovery ordering. Pure and dependency-free so it can be tested without a
 * database — the feed query selects the fields, this decides the order.
 *
 * Visibility and ordering are deliberately separate concerns: every published
 * profile is in the result set, and rank is what decides who leads. A
 * photoless, offline account is last, not missing.
 */

export type Rankable = {
  id: string;
  /** male | female | trans | anything else the schema grows. */
  genderBucket: string;
  isOnline: boolean;
  hasPhoto: boolean;
  /** Lower is nearer. Callers pass the distance bucket's rank. */
  distanceRank: number;
  /** Epoch ms. */
  lastActive: number;
};

/**
 * Online first, then photographed, then nearest, then most recently active.
 * `id` breaks ties so paging is stable across requests.
 */
export function compareDiscovery(a: Rankable, b: Rankable): number {
  if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
  if (a.hasPhoto !== b.hasPhoto) return a.hasPhoto ? -1 : 1;
  if (a.distanceRank !== b.distanceRank) return a.distanceRank - b.distanceRank;
  if (a.lastActive !== b.lastActive) return b.lastActive - a.lastActive;
  return a.id < b.id ? 1 : -1;
}

export function sortDiscovery<T extends Rankable>(rows: T[]): T[] {
  return [...rows].sort(compareDiscovery);
}

/**
 * Round-robin the already-sorted list across gender buckets so the grid does
 * not open as twenty men in a row simply because more men are online.
 *
 * Order within each gender is untouched, and the overall best-ranked profile
 * still leads. When one gender runs out the rest follow in plain rank order,
 * so this evens out the top of the grid without ever dropping anyone.
 */
export function balanceByGender<T extends { genderBucket: string }>(
  sorted: T[],
): T[] {
  const queues = new Map<string, T[]>();
  for (const row of sorted) {
    const key = row.genderBucket || 'other';
    const queue = queues.get(key);
    if (queue) queue.push(row);
    else queues.set(key, [row]);
  }
  // Nothing to interleave.
  if (queues.size < 2) return [...sorted];

  // Map keeps insertion order, so the bucket holding the top-ranked profile
  // is served first and the strongest card still opens the grid.
  const lanes = [...queues.values()];
  const out: T[] = [];
  let lane = 0;
  while (out.length < sorted.length) {
    const queue = lanes[lane % lanes.length];
    const next = queue.shift();
    if (next) out.push(next);
    lane += 1;
  }
  return out;
}

export function rankDiscovery<T extends Rankable>(rows: T[]): T[] {
  return balanceByGender(sortDiscovery(rows));
}
