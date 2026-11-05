import { ok, err } from '@/lib/api/respond';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!ensureDatabaseUrl()) {
    return err('DB_DOWN', 'Database is not configured', { status: 503 });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ db: 'up' as const });
  } catch {
    return err('DB_DOWN', 'Database unreachable', { status: 503 });
  }
}
