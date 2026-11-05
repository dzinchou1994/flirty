export const DATING_REPORT_REASONS = ['celebrity', 'cartoon', 'nudity', 'other'] as const;

export type DatingReportReason = (typeof DATING_REPORT_REASONS)[number];

export const DATING_REPORT_HIDE_THRESHOLD = 3;

export type ReportSubmission =
  | { ok: true; reason: DatingReportReason }
  | {
      ok: false;
      error: 'invalidReportReason' | 'cannotReportSelf' | 'alreadyReported';
    };

export function parseDatingReportReason(value: string): DatingReportReason | null {
  return (DATING_REPORT_REASONS as readonly string[]).includes(value)
    ? (value as DatingReportReason)
    : null;
}

export function reportSubmissionDecision(input: {
  reporterId: string;
  profileUserId: string;
  reason: string;
  alreadyReported: boolean;
}): ReportSubmission {
  const reason = parseDatingReportReason(input.reason.trim());
  if (!reason) return { ok: false, error: 'invalidReportReason' };
  if (input.reporterId === input.profileUserId) return { ok: false, error: 'cannotReportSelf' };
  if (input.alreadyReported) return { ok: false, error: 'alreadyReported' };
  return { ok: true, reason };
}

/**
 * Hide a public profile after enough unique reports.
 * Hidden and blocked profiles keep the reason an admin already recorded.
 */
export function reportHideDecision(input: {
  moderationStatus: string;
  reportCount: number;
  reasons: string[];
}): { hide: false } | { hide: true; moderationReason: string } {
  if (input.moderationStatus === 'hidden' || input.moderationStatus === 'blocked') {
    return { hide: false };
  }
  if (input.reportCount < DATING_REPORT_HIDE_THRESHOLD) return { hide: false };
  const listed = [...new Set(input.reasons.map((reason) => reason.trim()).filter(Boolean))].join(
    ', ',
  );
  const moderationReason = listed
    ? `Hidden after ${input.reportCount} member reports (${listed}).`
    : `Hidden after ${input.reportCount} member reports.`;
  return { hide: true, moderationReason: moderationReason.slice(0, 500) };
}
