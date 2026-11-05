import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { assertNoExif, inspectImageMetadata, processDatingPhoto } from './process-image';

/**
 * Build a JPEG that carries an APP1 Exif segment including a GPS IFD pointer.
 * sharp's withMetadata() API no longer accepts raw EXIF buffers, so we inject
 * the segment into the bitstream.
 */
async function jpegWithGpsExif(): Promise<Buffer> {
  const base = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 40, g: 80, b: 120 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Minimal TIFF (little-endian) with GPS IFD pointer tag 0x8825 → IFD at offset.
  // GPS IFD: one entry GPSLatitudeRef = 'N'
  const tiff = Buffer.from([
    // TIFF header
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    // IFD0: 1 entry
    0x01, 0x00,
    // tag 0x8825 GPSOffset, type LONG, count 1, value offset 0x1a
    0x25, 0x88, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00,
    // next IFD = 0
    0x00, 0x00, 0x00, 0x00,
    // GPS IFD at 0x1a: 1 entry
    0x01, 0x00,
    // tag 0x0001 GPSLatitudeRef, type ASCII, count 2, value 'N\0'
    0x01, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0x4e, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);

  const exifBody = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const app1 = Buffer.alloc(4 + exifBody.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(exifBody.length + 2, 2);
  exifBody.copy(app1, 4);

  // Insert APP1 right after SOI (FFD8)
  assert.equal(base[0], 0xff);
  assert.equal(base[1], 0xd8);
  return Buffer.concat([base.subarray(0, 2), app1, base.subarray(2)]);
}

describe('EXIF stripping on upload', () => {
  it('strips EXIF / GPS so the stored object has none', async () => {
    const tagged = await jpegWithGpsExif();
    const before = await sharp(tagged).metadata();
    assert.ok(before.exif && before.exif.length > 0, 'fixture must contain EXIF before processing');

    const processed = await processDatingPhoto(tagged);
    const after = await inspectImageMetadata(processed);
    assert.equal(after.hasExif, false);
    assert.equal(after.hasGps, false);
    await assert.doesNotReject(() => assertNoExif(processed));
  });
});
