import { ok, err } from '@/lib/api/respond';
import { promptAnswersSchema } from '@/lib/api/schemas';
import { getAuth } from '@/lib/auth/getAuth';
import { prisma } from '@/lib/prisma';
import { isDatingPromptKey, MAX_PROMPT_ANSWERS } from '@/lib/dating/prompts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });

  const profile = await prisma.datingProfile.findUnique({
    where: { userId: auth.user.id },
    select: {
      promptAnswers: {
        orderBy: { sortOrder: 'asc' },
        select: { id: true, promptKey: true, answer: true, sortOrder: true },
      },
    },
  });
  return ok({ items: profile?.promptAnswers ?? [] });
}

/** Replaces the whole set — the editor always submits the final three. */
export async function PUT(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return err('UNAUTHORIZED', 'Not authenticated', { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = promptAnswersSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid answers', { status: 400 });

  const profile = await prisma.datingProfile.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!profile) return err('PROFILE_LOCKED', 'Create a profile first', { status: 403 });

  const seen = new Set<string>();
  for (const a of parsed.data.answers) {
    if (!isDatingPromptKey(a.promptKey)) {
      return err('VALIDATION_ERROR', 'Unknown prompt', { status: 400, field: 'promptKey' });
    }
    if (seen.has(a.promptKey)) {
      return err('VALIDATION_ERROR', 'Duplicate prompt', { status: 400, field: 'promptKey' });
    }
    seen.add(a.promptKey);
  }
  if (parsed.data.answers.length > MAX_PROMPT_ANSWERS) {
    return err('VALIDATION_ERROR', 'Too many prompts', { status: 400 });
  }

  // Replace as one transaction so a failure can't leave a half-empty set.
  await prisma.$transaction([
    prisma.datingPromptAnswer.deleteMany({ where: { profileId: profile.id } }),
    ...parsed.data.answers.map((a, i) =>
      prisma.datingPromptAnswer.create({
        data: {
          profileId: profile.id,
          promptKey: a.promptKey,
          answer: a.answer.trim(),
          sortOrder: i,
        },
      }),
    ),
  ]);

  const items = await prisma.datingPromptAnswer.findMany({
    where: { profileId: profile.id },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, promptKey: true, answer: true, sortOrder: true },
  });
  return ok({ items });
}
