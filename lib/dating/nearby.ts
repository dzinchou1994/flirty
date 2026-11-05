import 'server-only';

import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { cityFallbackCoords } from '@/lib/dating/city-coords';
import { nextGeohashCell } from '@/lib/dating/geohash';
import { parseDatingCity } from '@/lib/dating/presets';
import { loadPrivacyViewer, privacyWhereForViewer } from '@/lib/dating/privacy';

export const NEARBY_WINDOW_MS = 30 * 60 * 1000;
export const NEARBY_UPSERT_THROTTLE_MS = 45_000;
export const NEARBY_FUZZ_MIN = 10;
export const NEARBY_FUZZ_MAX = 1000;
export const NEARBY_LIST_LIMIT = 200;

export type NearbyMember = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  profileIcon: string | null;
  isPremium: boolean;
  lat: number;
  lng: number;
  fuzzM: number;
};

export type NearbySelfStatus = {
  sharing: boolean;
  fuzzM: number;
  updatedAt: string | null;
};

function clampFuzz(fuzzM: number): number {
  if (!Number.isFinite(fuzzM)) return 100;
  return Math.min(NEARBY_FUZZ_MAX, Math.max(NEARBY_FUZZ_MIN, Math.round(fuzzM)));
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Deterministic offset so markers don't jump on every poll. */
function jitterLatLng(
  lat: number,
  lng: number,
  fuzzM: number,
  seed: string,
): { lat: number; lng: number } {
  const hash = createHash('sha256').update(seed).digest();
  const angle = (hash.readUInt16BE(0) / 0xffff) * Math.PI * 2;
  const frac = hash.readUInt16BE(2) / 0xffff;
  const distM = fuzzM * (0.35 + 0.65 * frac);

  const dLat = (distM * Math.cos(angle)) / 111_320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const metersPerDegLng = 111_320 * Math.max(0.2, Math.abs(cosLat));
  const dLng = (distM * Math.sin(angle)) / metersPerDegLng;

  return {
    lat: Math.max(-90, Math.min(90, lat + dLat)),
    lng: ((lng + dLng + 540) % 360) - 180,
  };
}

export async function getNearbySelfStatus(
  userId: string,
): Promise<NearbySelfStatus> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      nearbySharing: true,
      nearbyFuzzM: true,
      nearbyUpdatedAt: true,
    },
  });
  if (!row) {
    return { sharing: false, fuzzM: 100, updatedAt: null };
  }
  return {
    sharing: row.nearbySharing,
    fuzzM: clampFuzz(row.nearbyFuzzM),
    updatedAt: row.nearbyUpdatedAt?.toISOString() ?? null,
  };
}

export async function upsertNearbyLocation(
  userId: string,
  lat: number,
  lng: number,
  fuzzM: number,
): Promise<NearbySelfStatus> {
  if (!isValidCoord(lat, lng)) {
    throw new Error('INVALID_COORDS');
  }
  const fuzz = clampFuzz(fuzzM);
  const now = new Date();

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      nearbyUpdatedAt: true,
      nearbyFuzzM: true,
      nearbySharing: true,
    },
  });
  if (!existing) {
    throw new Error('USER_NOT_FOUND');
  }

  const fuzzChanged = clampFuzz(existing.nearbyFuzzM) !== fuzz;
  const lastUpdated = existing.nearbyUpdatedAt;
  const recentlyUpdated =
    lastUpdated != null &&
    now.getTime() - lastUpdated.getTime() < NEARBY_UPSERT_THROTTLE_MS;

  // Skip pure GPS heartbeats inside the throttle window; always allow fuzz changes.
  if (recentlyUpdated && !fuzzChanged && existing.nearbySharing && lastUpdated) {
    return {
      sharing: true,
      fuzzM: fuzz,
      updatedAt: lastUpdated.toISOString(),
    };
  }

  const profile = await prisma.datingProfile.findUnique({
    where: { userId },
    select: { id: true, geohashCell: true },
  });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      nearbyLat: lat,
      nearbyLng: lng,
      nearbyFuzzM: fuzz,
      nearbySharing: true,
      nearbyUpdatedAt: now,
      lastActiveAt: now,
    },
    select: {
      nearbySharing: true,
      nearbyFuzzM: true,
      nearbyUpdatedAt: true,
    },
  });

  // Snap to ~1km cell; only rewrite when the user leaves the current cell.
  if (profile) {
    const cell = nextGeohashCell(profile.geohashCell, lat, lng);
    if (cell !== profile.geohashCell) {
      await prisma.datingProfile.update({
        where: { id: profile.id },
        data: { geohashCell: cell },
      });
    }
  }

  return {
    sharing: updated.nearbySharing,
    fuzzM: clampFuzz(updated.nearbyFuzzM),
    updatedAt: updated.nearbyUpdatedAt?.toISOString() ?? null,
  };
}

/**
 * Place the user near the centre of their dating-profile city when they
 * decline (or cannot grant) browser geolocation.
 */
export async function upsertCityFallbackLocation(
  userId: string,
): Promise<NearbySelfStatus> {
  const profile = await prisma.datingProfile.findUnique({
    where: { userId },
    select: { city: true },
  });
  const city = parseDatingCity(profile?.city) ?? 'tbilisi';
  const coords = cityFallbackCoords(city, userId);
  // Wider fuzz than live GPS — city fallback is intentionally coarse.
  return upsertNearbyLocation(userId, coords.lat, coords.lng, 600);
}

export async function stopNearbySharing(userId: string): Promise<NearbySelfStatus> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      nearbySharing: false,
      nearbyLat: null,
      nearbyLng: null,
      nearbyUpdatedAt: null,
    },
    select: {
      nearbySharing: true,
      nearbyFuzzM: true,
      nearbyUpdatedAt: true,
    },
  });
  return {
    sharing: updated.nearbySharing,
    fuzzM: clampFuzz(updated.nearbyFuzzM),
    updatedAt: null,
  };
}

export async function listNearbyMembers(viewerId: string): Promise<NearbyMember[]> {
  const since = new Date(Date.now() - NEARBY_WINDOW_MS);
  const dayKey = since.toISOString().slice(0, 10);
  const viewer = await loadPrivacyViewer(viewerId);
  const privacy = privacyWhereForViewer(viewer);

  // Privacy + block applied in SQL via datingProfile relation — never fetch-then-filter.
  const rows = await prisma.user.findMany({
    where: {
      nearbySharing: true,
      nearbyUpdatedAt: { gte: since },
      nearbyLat: { not: null },
      nearbyLng: { not: null },
      id: { not: viewerId },
      NOT: { username: { startsWith: 'guest_' } },
      datingProfile: {
        is: {
          AND: [{ isVisible: true, moderationStatus: 'active' }, privacy],
        },
      },
    },
    orderBy: { nearbyUpdatedAt: 'desc' },
    take: NEARBY_LIST_LIMIT,
    select: {
      id: true,
      username: true,
      avatar: true,
      profileIcon: true,
      isPremium: true,
      nearbyLat: true,
      nearbyLng: true,
      nearbyFuzzM: true,
    },
  });

  return rows
    .filter((row) => row.nearbyLat != null && row.nearbyLng != null)
    .map((row) => {
      const fuzzM = clampFuzz(row.nearbyFuzzM);
      const jittered = jitterLatLng(
        row.nearbyLat as number,
        row.nearbyLng as number,
        fuzzM,
        `${row.id}:${dayKey}`,
      );
      return {
        id: row.id,
        username: row.username,
        displayName: row.username,
        avatar: row.avatar,
        profileIcon: row.profileIcon,
        isPremium: row.isPremium,
        lat: jittered.lat,
        lng: jittered.lng,
        fuzzM,
      };
    });
}
