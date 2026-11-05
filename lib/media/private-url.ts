import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  privatePhotoAccessPath,
  signPrivatePhotoToken,
  resolvePhotoUrlForViewer,
} from '@/lib/media/private-token';

export {
  signPrivatePhotoToken,
  verifyPrivatePhotoToken,
  privatePhotoAccessPath,
  resolvePhotoUrlForViewer,
} from '@/lib/media/private-token';

/**
 * Issue a short-lived app URL for a private photo, only if the viewer has a grant
 * (or is the owner). Returns null when access is denied — callers must not fall
 * back to the public R2 URL.
 */
export async function issuePrivatePhotoUrl(input: {
  photoId: string;
  ownerUserId: string;
  viewerId: string;
  visibility: string;
  publicUrl: string;
}): Promise<string | null> {
  if (input.visibility !== 'private') {
    return input.publicUrl;
  }
  const hasGrant =
    input.viewerId === input.ownerUserId ||
    (await viewerHasAlbumGrant(input.ownerUserId, input.viewerId));
  return resolvePhotoUrlForViewer({
    visibility: input.visibility,
    publicUrl: input.publicUrl,
    photoId: input.photoId,
    ownerUserId: input.ownerUserId,
    viewerId: input.viewerId,
    hasGrant,
  });
}

export async function viewerHasAlbumGrant(
  ownerUserId: string,
  viewerUserId: string,
): Promise<boolean> {
  if (ownerUserId === viewerUserId) return true;
  const grant = await prisma.datingAlbumGrant.findUnique({
    where: {
      ownerUserId_viewerUserId: { ownerUserId, viewerUserId },
    },
    select: { id: true },
  });
  return Boolean(grant);
}

export function buildOwnerPrivateUrl(photoId: string, ownerUserId: string): string {
  return privatePhotoAccessPath(
    signPrivatePhotoToken({ photoId, viewerId: ownerUserId }),
  );
}
