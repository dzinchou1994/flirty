import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { localPathForUpload, readLocalUpload } from './local-read';

async function withMediaDir(fn: (dir: string) => Promise<void>) {
  const previous = process.env.LOCAL_MEDIA_DIR;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dating-media-'));
  process.env.LOCAL_MEDIA_DIR = dir;
  try {
    await fn(dir);
  } finally {
    if (previous === undefined) delete process.env.LOCAL_MEDIA_DIR;
    else process.env.LOCAL_MEDIA_DIR = previous;
    await rm(dir, { recursive: true, force: true });
  }
}

describe('signed-route local disk read', () => {
  it('reads bytes stored by the local driver', async () => {
    await withMediaDir(async (dir) => {
      const key = 'dating-profiles/user-1/photo.webp';
      const body = Buffer.from('webp-bytes');
      await mkdir(path.join(dir, 'dating-profiles', 'user-1'), { recursive: true });
      await writeFile(path.join(dir, key), body);

      const got = await readLocalUpload(`/uploads/${key}`);
      assert.ok(got);
      assert.deepEqual(got, body);
      assert.equal(localPathForUpload(`/uploads/${key}`), path.join(dir, key));
    });
  });

  it('does not follow a path that leaves the media dir', async () => {
    await withMediaDir(async () => {
      assert.equal(localPathForUpload('/uploads/../secret.webp'), null);
      assert.equal(await readLocalUpload('/uploads/../secret.webp'), null);
      assert.equal(await readLocalUpload('https://media.example.ge/dating-profiles/u/a.webp'), null);
    });
  });
});
