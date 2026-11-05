import { err } from '@/lib/api/respond';
import { getAuth } from '@/lib/auth/getAuth';
import { verifyPrivatePhotoToken } from '@/lib/media/private-token';
import { viewerHasAlbumGrant } from '@/lib/media/private-url';
import { prisma } from '@/lib/prisma';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { objectKeyFromUrl } from '@/lib/media/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Stream a private photo after verifying a short-lived token + album grant.
 * A public R2 URL for a private photo is a bug — this is the only access path.
 */
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });

  const token = new URL(req.url).searchParams.get('t');
  if (!token) return err('VALIDATION_ERROR', 'token required', { status: 400 });

  const claims = verifyPrivatePhotoToken(token);
  if (!claims || claims.viewerId !== auth.user.id) {
    return err('FORBIDDEN', 'Invalid or expired token', { status: 403 });
  }

  const photo = await prisma.datingPhoto.findUnique({
    where: { id: claims.photoId },
    include: { profile: { select: { userId: true } } },
  });
  if (!photo || photo.visibility !== 'private') {
    return err('NOT_FOUND', 'Photo not found', { status: 404 });
  }

  const allowed = await viewerHasAlbumGrant(photo.profile.userId, auth.user.id);
  if (!allowed) return err('FORBIDDEN', 'No album grant', { status: 403 });

  const key = objectKeyFromUrl(photo.url);
  if (!key) return err('NOT_FOUND', 'Object missing', { status: 404 });

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim() || 'dating-media';
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return err('STORAGE_UNAVAILABLE', 'Media storage not configured', { status: 503 });
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = obj.Body ? Buffer.from(await obj.Body.transformToByteArray()) : null;
    if (!bytes) return err('NOT_FOUND', 'Empty object', { status: 404 });
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': obj.ContentType || 'image/webp',
        'Cache-Control': 'private, max-age=60',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return err('NOT_FOUND', 'Object missing', { status: 404 });
  }
}
