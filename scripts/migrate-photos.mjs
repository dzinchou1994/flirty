/**
 * Move photos out of the HTML and onto disk.
 *
 * Most DatingPhoto rows hold the whole image as a `data:image/...;base64,…`
 * URL. That means every grid page ships ~13MB of base64 inside the document:
 * nothing is cached, nothing loads in parallel, and the page cannot paint
 * until the last byte arrives. This writes each one to the media volume using
 * exactly the key scheme the upload route uses, makes a grid-sized thumbnail
 * beside it, and points the row at the file.
 *
 *   node scripts/migrate-photos.mjs                 # report only, writes nothing
 *   node scripts/migrate-photos.mjs --run           # migrate
 *   node scripts/migrate-photos.mjs --run --limit 50
 *
 * Safety:
 *   - Report is the default. --run is required to write anything.
 *   - Every original data URI is appended to a rollback file BEFORE its row
 *     is touched, so any row can be put back exactly as it was.
 *   - A row is updated only after its files are on disk and non-empty.
 *   - Idempotent: rows that already point at a file are skipped, so it is
 *     safe to re-run and safe to stop half way.
 */
import { readFileSync, existsSync, appendFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

// A plain node script gets no Next env loading.
for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const RUN = process.argv.includes('--run');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

const MEDIA_DIR = process.env.LOCAL_MEDIA_DIR?.trim() || path.join(process.cwd(), 'public', 'uploads');
const ROLLBACK = path.join(process.cwd(), `photo-migration-rollback-${Date.now()}.jsonl`);
const FULL_PX = 1200;
const THUMB_PX = 480;

const prisma = new PrismaClient();
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

async function main() {
  const rows = await prisma.datingPhoto.findMany({
    select: { id: true, url: true, profile: { select: { userId: true } } },
  });

  const dataUri = rows.filter((r) => r.url?.startsWith('data:'));
  const onDisk = rows.filter((r) => r.url && !r.url.startsWith('data:'));
  const bytes = dataUri.reduce((a, r) => a + r.url.length * 0.75, 0);

  console.log('photos total        :', rows.length);
  console.log('already files       :', onDisk.length);
  console.log('inline data URIs    :', dataUri.length);
  console.log('weight of those     :', mb(bytes));
  console.log('media dir           :', MEDIA_DIR);

  if (!RUN) {
    console.log('\nReport only. Nothing was changed. Re-run with --run to migrate.');
    return;
  }
  if (!dataUri.length) {
    console.log('\nNothing to migrate.');
    return;
  }

  console.log('\nrollback file       :', ROLLBACK);
  console.log('migrating...\n');

  let done = 0, failed = 0, saved = 0;
  for (const row of dataUri.slice(0, LIMIT)) {
    try {
      const m = row.url.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
      if (!m) throw new Error('unparseable data URI');
      const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'binary');
      if (!buf.length) throw new Error('empty payload');

      // Rollback entry first: never touch a row we cannot put back.
      appendFileSync(ROLLBACK, JSON.stringify({ id: row.id, url: row.url }) + '\n');

      const userId = row.profile?.userId ?? 'orphan';
      const key = `dating-profiles/${userId}/${row.id}.webp`;
      const thumbKey = `dating-profiles/${userId}/${row.id}-thumb.webp`;
      const dest = path.join(MEDIA_DIR, key);
      const thumbDest = path.join(MEDIA_DIR, thumbKey);
      await mkdir(path.dirname(dest), { recursive: true });

      const full = await sharp(buf).rotate()
        .resize(FULL_PX, FULL_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 }).toBuffer();
      const thumb = await sharp(buf).rotate()
        .resize(THUMB_PX, THUMB_PX, { fit: 'cover', position: 'attention' })
        .webp({ quality: 72 }).toBuffer();

      await writeFile(dest, full);
      await writeFile(thumbDest, thumb);

      // Only now is the row safe to repoint.
      if (!statSync(dest).size || !statSync(thumbDest).size) throw new Error('wrote an empty file');
      await prisma.datingPhoto.update({ where: { id: row.id }, data: { url: `/uploads/${key}` } });

      saved += row.url.length * 0.75 - thumb.length;
      done++;
      if (done % 25 === 0) console.log(`  ${done}/${Math.min(dataUri.length, LIMIT)}`);
    } catch (err) {
      failed++;
      console.error(`  FAILED ${row.id}: ${err.message}`);
    }
  }

  console.log(`\nmigrated ${done}, failed ${failed}`);
  console.log(`grid payload reduced by roughly ${mb(saved)}`);
  console.log(`rollback: ${ROLLBACK}`);

  // Phase 2. Photos that were already files have no thumbnail, and the grid
  // asks every local photo for one. Without this they would 404 the moment
  // the card starts using thumbSrc().
  console.log('\nbackfilling thumbnails for photos that were already files...');
  let made = 0, skipped = 0, missing = 0;
  for (const row of onDisk) {
    if (!row.url.startsWith('/uploads/')) { skipped++; continue; }
    const key = row.url.slice('/uploads/'.length);
    const src = path.join(MEDIA_DIR, key);
    const thumbDest = path.join(MEDIA_DIR, key.replace(/\.webp$/i, '-thumb.webp'));
    if (existsSync(thumbDest)) { skipped++; continue; }
    if (!existsSync(src)) { missing++; continue; }
    try {
      const thumb = await sharp(src).rotate()
        .resize(THUMB_PX, THUMB_PX, { fit: 'cover', position: 'attention' })
        .webp({ quality: 72 }).toBuffer();
      await writeFile(thumbDest, thumb);
      made++;
    } catch (err) {
      console.error(`  thumb FAILED ${row.id}: ${err.message}`);
    }
  }
  console.log(`thumbnails made ${made}, already there ${skipped}, source file missing ${missing}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
