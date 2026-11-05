export type VisibilityMode = 'discoverable' | 'mutual_only' | 'incognito';

/** Pure helpers for unit tests (mirror SQL intent without Prisma). */
export function wouldExcludeByContact(input: {
  viewerPhoneHash: string | null;
  viewerContactHashes: string[];
  ownerPhoneHash: string | null;
  ownerContactHashes: string[];
}): boolean {
  if (
    input.viewerPhoneHash &&
    input.ownerContactHashes.includes(input.viewerPhoneHash)
  ) {
    return true;
  }
  if (
    input.ownerPhoneHash &&
    input.viewerContactHashes.includes(input.ownerPhoneHash)
  ) {
    return true;
  }
  return false;
}

export function wouldExcludeByBlock(input: {
  blocks: Array<{ blockerId: string; blockedUserId: string }>;
  viewerId: string;
  ownerId: string;
}): boolean {
  return input.blocks.some(
    (b) =>
      (b.blockerId === input.viewerId && b.blockedUserId === input.ownerId) ||
      (b.blockerId === input.ownerId && b.blockedUserId === input.viewerId),
  );
}

export function isVisibleUnderMode(input: {
  mode: VisibilityMode;
  requireMutualInterest?: boolean;
  ownerLikedViewer: boolean;
  ownerMessagedViewer: boolean;
}): boolean {
  const mode: VisibilityMode =
    input.requireMutualInterest && input.mode === 'discoverable'
      ? 'mutual_only'
      : input.mode;
  if (mode === 'discoverable') return true;
  if (mode === 'mutual_only') return input.ownerLikedViewer;
  if (mode === 'incognito') return input.ownerLikedViewer || input.ownerMessagedViewer;
  return false;
}
