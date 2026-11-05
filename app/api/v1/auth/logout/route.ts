import { ok } from '@/lib/api/respond';
import { clearSessionCookies } from '@/lib/auth/session';

export async function POST() {
  return clearSessionCookies(ok({ loggedOut: true }));
}
