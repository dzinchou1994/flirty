/**
 * Geohash encode + coarse distance buckets.
 * Discovery never returns precise metres, bearings, or coordinates.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Precision 6 ≈ 1.2 km × 0.6 km cells — roughly 1 km as specified. */
export const GEOHASH_PRECISION = 6;

export type DistanceBucket = '<1km' | '1-3km' | '3-10km' | '10km+';

export const DISTANCE_BUCKETS: DistanceBucket[] = ['<1km', '1-3km', '3-10km', '10km+'];

export function encodeGeohash(
  lat: number,
  lng: number,
  precision: number = GEOHASH_PRECISION,
): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = idx * 2 + 1;
        lngMin = mid;
      } else {
        idx = idx * 2;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}

/** Decode a geohash to its cell centre (approx). */
export function decodeGeohashCenter(hash: string): { lat: number; lng: number } {
  let evenBit = true;
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  for (const ch of hash) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) throw new Error('INVALID_GEOHASH');
    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (evenBit) {
        const mid = (lngMin + lngMax) / 2;
        if (bitN) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (bitN) latMin = mid;
        else latMax = mid;
      }
      evenBit = !evenBit;
    }
  }
  return { lat: (latMin + latMax) / 2, lng: (lngMin + lngMax) / 2 };
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Map approximate km to a public bucket label. Never return the number. */
export function distanceBucketFromKm(km: number): DistanceBucket {
  if (!Number.isFinite(km) || km < 0) return '10km+';
  if (km < 1) return '<1km';
  if (km < 3) return '1-3km';
  if (km < 10) return '3-10km';
  return '10km+';
}

export function bucketRank(bucket: DistanceBucket): number {
  return DISTANCE_BUCKETS.indexOf(bucket);
}

/**
 * Bucket between two stored cells. Same cell → `<1km`.
 * Presence-off subjects are forced to the coarsest bucket by the caller.
 */
export function distanceBucketBetweenCells(
  viewerCell: string | null | undefined,
  subjectCell: string | null | undefined,
): DistanceBucket {
  if (!viewerCell || !subjectCell) return '10km+';
  if (viewerCell === subjectCell) return '<1km';
  try {
    const a = decodeGeohashCenter(viewerCell);
    const b = decodeGeohashCenter(subjectCell);
    return distanceBucketFromKm(haversineKm(a, b));
  } catch {
    return '10km+';
  }
}

/**
 * Only rewrite the stored cell when the user has left it.
 * Repeated queries from a static / jittering GPS stay stable.
 */
export function nextGeohashCell(
  current: string | null | undefined,
  lat: number,
  lng: number,
): string {
  const computed = encodeGeohash(lat, lng);
  if (!current) return computed;
  if (current === computed) return current;
  return computed;
}
