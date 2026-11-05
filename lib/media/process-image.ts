import sharp from 'sharp';

/**
 * Decode → autorotate from EXIF orientation → resize → WebP.
 * sharp drops EXIF/GPS by default when encoding to WebP; we never call
 * withMetadata(), so nothing identifiable is written to R2.
 */
export async function processDatingPhoto(buffer: Buffer): Promise<Buffer> {
  let input = buffer;
  const isHeic =
    buffer.length >= 12 &&
    buffer.toString('ascii', 4, 8) === 'ftyp' &&
    /heic|heif|mif1|msf1/i.test(buffer.toString('ascii', 8, 12));
  if (isHeic) {
    const convert = require('heic-convert') as (opts: {
      buffer: Buffer;
      format: 'JPEG';
      quality: number;
    }) => Promise<ArrayBuffer>;
    input = Buffer.from(await convert({ buffer, format: 'JPEG', quality: 0.9 }));
  }

  return sharp(input)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

export type ExifLeakCheck = {
  hasExif: boolean;
  hasGps: boolean;
  orientation?: number;
};

/**
 * Inspect a stored buffer for residual EXIF / GPS.
 * Used by tests and as a defence-in-depth assert after processing.
 */
export async function inspectImageMetadata(buffer: Buffer): Promise<ExifLeakCheck> {
  const meta = await sharp(buffer).metadata();
  const hasExif = Boolean(meta.exif && meta.exif.length > 0);
  // sharp surfaces GPS only via exif blob or xmp; treat any exif as a fail
  // for our "no metadata on R2" policy. Also reject if gps-related keys appear
  // in the raw IFD (sharp doesn't parse GPS into structured fields for WebP).
  const hasGps = hasExif; // any preserved EXIF is treated as a GPS risk
  return {
    hasExif,
    hasGps,
    orientation: meta.orientation,
  };
}

export async function assertNoExif(buffer: Buffer): Promise<void> {
  const check = await inspectImageMetadata(buffer);
  if (check.hasExif || check.hasGps) {
    throw new Error('EXIF_NOT_STRIPPED');
  }
}
