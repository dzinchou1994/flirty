import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { readLocalUpload } from '@/lib/media/local-read';

const cacheDir = path.join(os.tmpdir(), 'dating-grid');
const inflight = new Map<string, Promise<Buffer | null>>();

function cacheName(photoId: string): string | null {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(photoId)) return null;
  return path.join(cacheDir, `${photoId}.webp`);
}

/** A 360px cover for one public photo, cached on disk after the first decode. */
export async function gridCover(photoId: string): Promise<Buffer | null> {
  const cached = cacheName(photoId);
  if (!cached) return null;
  if (existsSync(cached)) {
    try {
      return await readFile(cached);
    } catch {
      /* rebuild */
    }
  }
  const pending = inflight.get(photoId);
  if (pending) return pending;
  const job = build(photoId, cached).finally(() => inflight.delete(photoId));
  inflight.set(photoId, job);
  return job;
}

async function build(photoId: string, cached: string): Promise<Buffer | null> {
  const photo = await prisma.datingPhoto.findUnique({
    where: { id: photoId },
    select: { url: true, status: true, visibility: true },
  });
  if (!photo || photo.visibility === 'private') return null;
  if (photo.status && photo.status !== 'approved') return null;

  const input = await sourceBytes(photo.url);
  if (!input) return null;

  const out = await sharp(input)
    .rotate()
    .resize(360, 360, { fit: 'cover', position: 'attention' })
    .webp({ quality: 68 })
    .toBuffer();

  await mkdir(cacheDir, { recursive: true });
  await writeFile(cached, out);
  return out;
}

async function sourceBytes(url: string): Promise<Buffer | null> {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    if (comma < 0) return null;
    const meta = url.slice(0, comma);
    const body = url.slice(comma + 1);
    try {
      return meta.includes(';base64')
        ? Buffer.from(body, 'base64')
        : Buffer.from(decodeURIComponent(body), 'binary');
    } catch {
      return null;
    }
  }
  const local = await readLocalUpload(url);
  if (local) return local;
  if (!/^https?:/i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 8_000_000) return null;
    return buf;
  } catch {
    return null;
  }
}
