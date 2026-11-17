import { readFile } from 'node:fs/promises';
import path from 'node:path';

const LOCAL_PUBLIC_PREFIX = '/uploads';

export function localMediaDir(): string {
  return process.env.LOCAL_MEDIA_DIR?.trim() || path.join(process.cwd(), 'public', 'uploads');
}

/** Key under the local media dir, or null if this URL is not a local upload. */
export function localKeyFromUrl(url: string): string | null {
  if (!url.startsWith(`${LOCAL_PUBLIC_PREFIX}/`)) return null;
  const key = url.slice(LOCAL_PUBLIC_PREFIX.length + 1);
  if (!key || key.includes('..') || key.includes('\\') || path.isAbsolute(key)) return null;
  return key;
}

export function localPathForUpload(url: string): string | null {
  const key = localKeyFromUrl(url);
  if (!key) return null;
  const root = path.resolve(localMediaDir());
  const dest = path.resolve(root, key);
  if (dest !== root && !dest.startsWith(root + path.sep)) return null;
  return dest;
}

export async function readLocalUpload(url: string): Promise<Buffer | null> {
  const dest = localPathForUpload(url);
  if (!dest) return null;
  try {
    return await readFile(dest);
  } catch {
    return null;
  }
}
