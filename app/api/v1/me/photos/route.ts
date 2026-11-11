import { ok, err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { prisma } from '@/lib/prisma';
import { hasObjectStorage, putObject } from '@/lib/media/storage';
import { absoluteMediaUrl } from '@/lib/site';
import { assertNoExif, processDatingPhoto } from '@/lib/media/process-image';
import { buildOwnerPrivateUrl } from '@/lib/media/private-url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PHOTOS = 5;
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  if (!hasObjectStorage()) return err('STORAGE_UNAVAILABLE', 'Media storage not configured', { status: 503 });

  const profile = await prisma.datingProfile.findUnique({
    where: { userId: auth.user.id },
    include: { photos: true },
  });
  if (!profile) return err('PROFILE_REQUIRED', 'Create a profile first', { status: 400 });
  if (profile.photos.length >= MAX_PHOTOS) {
    return err('PHOTO_LIMIT', 'Maximum photos reached', { status: 400 });
  }

  const form = await req.formData();
  // The editor sends `photoFile`; the API originally only read `file`, which
  // silently produced VALIDATION_ERROR on every upload. Accept both.
  const file = form.get('file') ?? form.get('photoFile');
  const visibilityRaw = form.get('visibility');
  const visibility =
    typeof visibilityRaw === 'string' && visibilityRaw === 'private' ? 'private' : 'public';

  if (!file || typeof file === 'string') {
    return err('VALIDATION_ERROR', 'file required', { status: 400, field: 'file' });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX_BYTES) return err('PHOTO_TOO_LARGE', 'Photo too large', { status: 400 });

  let webp: Buffer;
  try {
    webp = await processDatingPhoto(bytes);
    await assertNoExif(webp);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error('[photos] process failed:', reason, e);
    return err('PHOTO_PROCESS_FAILED', `Could not process photo (${reason})`, { status: 400 });
  }

  let status: 'approved' | 'pending' = 'approved';
  try {
    const { screenImageBuffer } = await import('@/lib/media/image-moderation');
    const decision = await screenImageBuffer(webp);
    if (!decision.ok) {
      if (decision.reason === 'explicit') {
        // The only hard refusal. Nudity and sexual acts are never stored.
        return err('PHOTO_REJECTED_EXPLICIT', 'Photo rejected (explicit)', { status: 400 });
      }
      // 'noFace', 'drawing' and 'unavailable' are quality signals or classifier
      // failures, not safety violations. Blocking on them rejected ordinary
      // clothed photos and told the user they were nude. Queue for a human.
      console.info('[photos] queued for review:', decision.reason);
      status = 'pending';
    }
  } catch (e) {
    console.warn('[photos] screening unavailable', e);
    status = 'pending';
  }

  const key = `dating-profiles/${auth.user.id}/${Date.now()}.webp`;
  // Always store via putObject; private photos are never returned as this public URL.
  const storedUrl = await putObject(key, webp, 'image/webp');
  const photo = await prisma.datingPhoto.create({
    data: {
      profileId: profile.id,
      url: storedUrl,
      sortOrder: profile.photos.length,
      status,
      visibility,
    },
  });

  const clientUrl =
    visibility === 'private'
      ? buildOwnerPrivateUrl(photo.id, auth.user.id)
      : absoluteMediaUrl(photo.url) || photo.url;

  return ok(
    {
      id: photo.id,
      url: clientUrl,
      sortOrder: photo.sortOrder,
      status: photo.status,
      visibility: photo.visibility,
    },
    { status: 201 },
  );
}

export async function PATCH(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null) as {
    photoId?: string;
    visibility?: string;
  } | null;
  if (!body?.photoId || (body.visibility !== 'public' && body.visibility !== 'private')) {
    return err('VALIDATION_ERROR', 'photoId and visibility required', { status: 400 });
  }
  const profile = await prisma.datingProfile.findUnique({ where: { userId: auth.user.id } });
  if (!profile) return err('NOT_FOUND', 'Profile not found', { status: 404 });
  const updated = await prisma.datingPhoto.updateMany({
    where: { id: body.photoId, profileId: profile.id },
    data: { visibility: body.visibility },
  });
  if (!updated.count) return err('NOT_FOUND', 'Photo not found', { status: 404 });
  return ok({ id: body.photoId, visibility: body.visibility });
}

export async function DELETE(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const photoId = new URL(req.url).searchParams.get('photoId');
  if (!photoId) return err('VALIDATION_ERROR', 'photoId required', { status: 400 });
  const profile = await prisma.datingProfile.findUnique({ where: { userId: auth.user.id } });
  if (!profile) return err('NOT_FOUND', 'Profile not found', { status: 404 });
  await prisma.datingPhoto.deleteMany({ where: { id: photoId, profileId: profile.id } });
  return ok({ deleted: true });
}
