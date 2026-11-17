import { isRecentlyOnline } from '@/lib/dating/presence';

/**
 * The feed is sharp once the viewer has an active profile with a bio.
 * A photo keeps that access after they leave. Without one, access lasts
 * only while they are online — the same window their card stays in the feed.
 */
export function viewerFeedUnlocked(own: {
  bio: string;
  moderationStatus: string;
  photos: readonly unknown[];
  user: { lastActiveAt: Date | null };
} | null): boolean {
  if (!own) return false;
  if (own.moderationStatus !== 'active') return false;
  if (!own.bio.trim()) return false;
  return own.photos.length > 0 || isRecentlyOnline(own.user.lastActiveAt);
}
