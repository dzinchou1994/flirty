import path from 'node:path';
import sharp from 'sharp';
import {
  decideImageSafety,
  isIllustratedImage,
  scoresFromPredictions,
  type ImageSafetyDecision,
  type NsfwScores,
} from '@/lib/media/image-safety';

type NsfwModel = {
  classify: (
    img: unknown,
    topk?: number,
  ) => Promise<Array<{ className: string; probability: number }>>;
};

type TensorHandle = { dispose: () => void };

let modelPromise: Promise<NsfwModel> | null = null;
let faceModelPromise: Promise<typeof import('@vladmandic/face-api')> | null = null;

async function loadModel(): Promise<NsfwModel> {
  await import('@tensorflow/tfjs-node');
  const core = (await import('nsfwjs/core')) as {
    load: (name: string, options: { modelDefinitions: unknown[] }) => Promise<NsfwModel>;
  };
  const mobilenet = (await import('nsfwjs/models/mobilenet_v2')) as {
    MobileNetV2Model: unknown;
  };
  return core.load('MobileNetV2', { modelDefinitions: [mobilenet.MobileNetV2Model] });
}

function getModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = loadModel().catch((err) => {
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

async function loadFaceModel(): Promise<typeof import('@vladmandic/face-api')> {
  await import('@tensorflow/tfjs-node');
  const faceapi = await import('@vladmandic/face-api');
  const modelPath = path.join(
    process.cwd(),
    'node_modules',
    '@vladmandic',
    'face-api',
    'model',
  );
  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
  return faceapi;
}

function getFaceModel(): Promise<typeof import('@vladmandic/face-api')> {
  if (!faceModelPromise) {
    faceModelPromise = loadFaceModel().catch((err) => {
      faceModelPromise = null;
      throw err;
    });
  }
  return faceModelPromise;
}

async function hasRealFace(buffer: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(1024, 1024, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) return false;

  const tf = (await import('@tensorflow/tfjs-node')) as {
    tensor3d: (values: Uint8Array, shape: [number, number, number]) => TensorHandle;
  };
  const image = tf.tensor3d(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    [info.height, info.width, 3],
  );
  try {
    const faceapi = await getFaceModel();
    const faces = await faceapi.detectAllFaces(
      image as never,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
    );
    return faces.length > 0;
  } finally {
    image.dispose();
  }
}

export async function inspectImageBuffer(
  buffer: Buffer,
): Promise<{ decision: ImageSafetyDecision; scores: NsfwScores | null }> {
  let image: TensorHandle | null = null;
  try {
    const prepared = await rasterize(buffer);
    if (!prepared) return { decision: { ok: false, reason: 'unavailable' }, scores: null };
    const tf = (await import('@tensorflow/tfjs-node')) as {
      tensor3d: (values: Uint8Array, shape: [number, number, number]) => TensorHandle;
    };
    image = tf.tensor3d(prepared.pixels, [prepared.height, prepared.width, 3]);
    const model = await getModel();
    const scores = scoresFromPredictions(await model.classify(image, 5));
    const nsfwDecision = decideImageSafety(scores);
    if (!nsfwDecision.ok) return { decision: nsfwDecision, scores };
    const palette = await paletteSize(buffer);
    if (palette && isIllustratedImage(palette)) {
      return { decision: { ok: false, reason: 'drawing' }, scores };
    }
    if (!(await hasRealFace(buffer))) {
      return { decision: { ok: false, reason: 'noFace' }, scores };
    }
    return { decision: nsfwDecision, scores };
  } catch (err) {
    console.error('[inspectImageBuffer]', err);
    return { decision: { ok: false, reason: 'unavailable' }, scores: null };
  } finally {
    image?.dispose();
  }
}

async function paletteSize(buffer: Buffer): Promise<{ colors: number; tones: number } | null> {
  try {
    const raw = await sharp(buffer)
      .rotate()
      .resize(64, 64, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer();
    const colors = new Set<number>();
    const tones = new Set<number>();
    for (let i = 0; i < raw.length; i += 3) {
      const red = raw[i] >> 4;
      const green = raw[i + 1] >> 4;
      const blue = raw[i + 2] >> 4;
      colors.add((red << 8) | (green << 4) | blue);
      tones.add((raw[i] + raw[i + 1] + raw[i + 2]) >> 3);
    }
    return { colors: colors.size, tones: tones.size };
  } catch (err) {
    console.error('[paletteSize]', err);
    return null;
  }
}

async function rasterize(
  buffer: Buffer,
): Promise<{ pixels: Uint8Array; width: number; height: number } | null> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(224, 224, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 3 || info.width !== 224 || info.height !== 224) return null;
  return {
    pixels: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}

/**
 * Classify one image. Explicit, illustrated, and no-real-face results are rejected.
 * A classifier failure rejects the upload so an unchecked photo is never published.
 */
export async function screenImageBuffer(buffer: Buffer): Promise<ImageSafetyDecision> {
  const result = await inspectImageBuffer(buffer);
  return result.decision;
}
