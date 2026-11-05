import 'server-only';

import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * Two drivers behind one interface.
 *
 *  - R2, when the three credentials are present.
 *  - The server's own disk otherwise.
 *
 * Local disk is the sensible default at this scale: 25GB of usable space on
 * the app server is roughly 160k processed photos, and the whole audience is
 * in one country, so a CDN buys very little. Switching to R2 later is filling
 * in env vars — no code change.
 *
 * MIND THE VOLUME: LOCAL_MEDIA_DIR must be a Docker volume in production, or
 * every `docker compose up --build` wipes the uploads.
 */
function localMediaDir(): string {
  return process.env.LOCAL_MEDIA_DIR?.trim() || path.join(process.cwd(), 'public', 'uploads');
}

/** Public path prefix the local driver serves from. */
const LOCAL_PUBLIC_PREFIX = '/uploads';

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim() || 'dating-media';
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  // R2_PUBLIC_BASE_URL is required, not optional: without it every stored photo
  // would be handed to clients as a URL on a host we do not control. Treat the
  // whole R2 config as absent instead, so the local disk driver takes over.
  if (!accountId || !accessKeyId || !secretAccessKey || !publicBaseUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

/** True when either driver can store a file — i.e. always. */
export function hasObjectStorage(): boolean {
  return true;
}

/** True only for R2, for callers that care which driver is active. */
export function usesRemoteStorage(): boolean {
  return r2Config() !== null;
}

let cachedClient: S3Client | null = null;

function getClient() {
  const cfg = r2Config();
  if (!cfg) throw new Error('R2 is not configured');
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return { client: cachedClient, bucket: cfg.bucket, publicBaseUrl: cfg.publicBaseUrl };
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!r2Config()) {
    // Local disk. The key may contain slashes, so create the tree first.
    const safeKey = key.replace(/^\/+/, '').replace(/\.\./g, '');
    const dest = path.join(localMediaDir(), safeKey);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, body);
    // Relative URL; absoluteMediaUrl resolves it against the site origin.
    return `${LOCAL_PUBLIC_PREFIX}/${safeKey}`;
  }

  const { client, bucket, publicBaseUrl } = getClient();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
  return `${publicBaseUrl}/${key}`;
}

/** Absolute path on disk for a stored key — used to read private photos back. */
export function localPathForKey(key: string): string {
  const safeKey = key.replace(/^\/+/, '').replace(/\.\./g, '');
  return path.join(localMediaDir(), safeKey);
}

export function objectKeyFromUrl(url: string): string | null {
  try {
    // Local driver stores a relative /uploads/... path.
    if (url.startsWith(`${LOCAL_PUBLIC_PREFIX}/`)) {
      return url.slice(LOCAL_PUBLIC_PREFIX.length + 1);
    }
    const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    if (base && url.startsWith(base + '/')) return url.slice(base.length + 1);
    const u = new URL(url);
    return u.pathname.replace(/^\//, '') || null;
  } catch {
    return null;
  }
}

export async function deleteObjectKeys(keys: string[]): Promise<void> {
  if (!keys.length) return;

  if (!r2Config()) {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await unlink(localPathForKey(key));
        } catch {
          // Already gone is not an error worth failing a deletion over.
        }
      }),
    );
    return;
  }

  const { client, bucket } = getClient();
  await Promise.all(
    keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key }))),
  );
}
