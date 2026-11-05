import { createHash } from 'crypto';
import type { DatingCity } from '@/lib/dating/presets';

/** Approximate city centres used when the user declines GPS. */
export const DATING_CITY_CENTERS: Record<DatingCity, { lat: number; lng: number }> = {
  tbilisi: { lat: 41.7151, lng: 44.8271 },
  batumi: { lat: 41.6168, lng: 41.6367 },
  kutaisi: { lat: 42.2679, lng: 42.6946 },
  gori: { lat: 41.9842, lng: 44.1158 },
  other: { lat: 41.7151, lng: 44.8271 },
};

/**
 * Stable point near the city centre so city-fallback users do not all
 * collapse into the same ~1 km geohash cell.
 */
export function cityFallbackCoords(
  city: DatingCity,
  userId: string,
  radiusM = 1800,
): { lat: number; lng: number } {
  const center = DATING_CITY_CENTERS[city] ?? DATING_CITY_CENTERS.tbilisi;
  const hash = createHash('sha256').update(`city-fallback:${userId}`).digest();
  const angle = (hash.readUInt16BE(0) / 0xffff) * Math.PI * 2;
  const frac = hash.readUInt16BE(2) / 0xffff;
  const distM = radiusM * (0.15 + 0.85 * frac);

  const dLat = (distM * Math.cos(angle)) / 111_320;
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const metersPerDegLng = 111_320 * Math.max(0.2, Math.abs(cosLat));
  const dLng = (distM * Math.sin(angle)) / metersPerDegLng;

  return {
    lat: Math.max(-90, Math.min(90, center.lat + dLat)),
    lng: ((center.lng + dLng + 540) % 360) - 180,
  };
}
