export const NSFW_CLASSES = ['Drawing', 'Hentai', 'Neutral', 'Porn', 'Sexy'] as const;

export type NsfwClass = (typeof NSFW_CLASSES)[number];

export type NsfwScores = Record<NsfwClass, number>;

export type ImageRejectReason = 'explicit' | 'drawing' | 'noFace' | 'unavailable';

export type ImageSafetyDecision =
  | { ok: true }
  | { ok: false; reason: ImageRejectReason };

export type ImageSafetyThresholds = {
  porn: number;
  hentai: number;
  sexy: number;
  drawing: number;
  explicitSum: number;
};

export const DEFAULT_IMAGE_SAFETY_THRESHOLDS: ImageSafetyThresholds = {
  porn: 0.4,
  hentai: 0.4,
  sexy: 0.65,
  drawing: 0.5,
  explicitSum: 0.7,
};

export type PhotoScreeningOutcome =
  | { store: true; status: 'approved' }
  | {
      store: false;
      error:
        | 'photoRejectedExplicit'
        | 'photoRejectedDrawing'
        | 'photoRejectedNoFace'
        | 'photoCheckUnavailable';
    };

function readThreshold(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) return fallback;
  return value;
}

export function imageSafetyThresholds(
  env: NodeJS.ProcessEnv = process.env,
): ImageSafetyThresholds {
  return {
    porn: readThreshold(env.DATING_NSFW_PORN, DEFAULT_IMAGE_SAFETY_THRESHOLDS.porn),
    hentai: readThreshold(env.DATING_NSFW_HENTAI, DEFAULT_IMAGE_SAFETY_THRESHOLDS.hentai),
    sexy: readThreshold(env.DATING_NSFW_SEXY, DEFAULT_IMAGE_SAFETY_THRESHOLDS.sexy),
    drawing: readThreshold(env.DATING_NSFW_DRAWING, DEFAULT_IMAGE_SAFETY_THRESHOLDS.drawing),
    explicitSum: readThreshold(
      env.DATING_NSFW_EXPLICIT_SUM,
      DEFAULT_IMAGE_SAFETY_THRESHOLDS.explicitSum,
    ),
  };
}

export const ILLUSTRATION_COLOR_LIMIT = 90;
export const ILLUSTRATION_TONE_LIMIT = 75;

/**
 * Flat cartoons and line drawings use few colors and few brightness levels.
 * Grayscale photos stay above the tone limit, so they are not treated as drawings.
 */
export function isIllustratedImage(input: { colors: number; tones: number }): boolean {
  return input.colors < ILLUSTRATION_COLOR_LIMIT && input.tones < ILLUSTRATION_TONE_LIMIT;
}

export function emptyNsfwScores(): NsfwScores {
  return { Drawing: 0, Hentai: 0, Neutral: 0, Porn: 0, Sexy: 0 };
}

export function scoresFromPredictions(
  predictions: Array<{ className: string; probability: number }>,
): NsfwScores {
  const scores = emptyNsfwScores();
  for (const prediction of predictions) {
    if ((NSFW_CLASSES as readonly string[]).includes(prediction.className)) {
      scores[prediction.className as NsfwClass] = prediction.probability;
    }
  }
  return scores;
}

/** Reject explicit images and illustrations. Real neutral photos are allowed. */
export function decideImageSafety(
  scores: NsfwScores,
  thresholds: ImageSafetyThresholds = imageSafetyThresholds(),
): ImageSafetyDecision {
  const porn = scores.Porn || 0;
  const hentai = scores.Hentai || 0;
  const sexy = scores.Sexy || 0;
  const drawing = scores.Drawing || 0;
  if (
    porn >= thresholds.porn ||
    hentai >= thresholds.hentai ||
    sexy >= thresholds.sexy ||
    porn + hentai + sexy >= thresholds.explicitSum
  ) {
    return { ok: false, reason: 'explicit' };
  }
  if (drawing >= thresholds.drawing) {
    return { ok: false, reason: 'drawing' };
  }
  return { ok: true };
}

/** Safe photos are stored and published. Rejected photos are never stored. */
export function applyPhotoScreening(decision: ImageSafetyDecision): PhotoScreeningOutcome {
  if (decision.ok) return { store: true, status: 'approved' };
  if (decision.reason === 'explicit') return { store: false, error: 'photoRejectedExplicit' };
  if (decision.reason === 'drawing') return { store: false, error: 'photoRejectedDrawing' };
  if (decision.reason === 'noFace') return { store: false, error: 'photoRejectedNoFace' };
  return { store: false, error: 'photoCheckUnavailable' };
}
