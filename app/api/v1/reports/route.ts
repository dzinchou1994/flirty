import { ok, err } from '@/lib/api/respond';
import { reportRequestSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { reportHideDecision, reportSubmissionDecision } from '@/lib/dating/reports';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = reportRequestSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid report', { status: 400 });

  const profile = await prisma.datingProfile.findUnique({
    where: { id: parsed.data.profileId },
    select: { id: true, userId: true, moderationStatus: true },
  });
  if (!profile) return err('NOT_FOUND', 'Profile not found', { status: 404 });

  const already = await prisma.datingProfileReport.findUnique({
    where: {
      profileId_reporterId: { profileId: profile.id, reporterId: auth.user.id },
    },
  });

  const decision = reportSubmissionDecision({
    reporterId: auth.user.id,
    profileUserId: profile.userId,
    reason: parsed.data.reason,
    alreadyReported: Boolean(already),
  });
  if (!decision.ok) {
    const map: Record<string, string> = {
      invalidReportReason: 'INVALID_REASON',
      cannotReportSelf: 'CANNOT_REPORT_SELF',
      alreadyReported: 'ALREADY_REPORTED',
    };
    return err(map[decision.error] || 'REPORT_ERROR', decision.error, { status: 400 });
  }

  await prisma.datingProfileReport.create({
    data: {
      profileId: profile.id,
      reporterId: auth.user.id,
      reason: decision.reason,
      receivedAt: new Date(),
    },
  });

  const reports = await prisma.datingProfileReport.findMany({
    where: { profileId: profile.id },
    select: { reason: true },
  });
  const hide = reportHideDecision({
    moderationStatus: profile.moderationStatus,
    reportCount: reports.length,
    reasons: reports.map((r) => r.reason),
  });
  if (hide.hide) {
    await prisma.datingProfile.update({
      where: { id: profile.id },
      data: {
        moderationStatus: 'hidden',
        moderationReason: hide.moderationReason,
        moderatedAt: new Date(),
        isVisible: false,
      },
    });
  }

  return ok({ reported: true }, { status: 201 });
}
