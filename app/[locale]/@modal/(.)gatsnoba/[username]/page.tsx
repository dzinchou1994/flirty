import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/types';
import { ProfileModalShell } from '@/components/dating/ProfileModalShell';
import DatingProfilePage from '../../../gatsnoba/[username]/page';

type Props = { params: Promise<{ locale: string; username: string }> };

/**
 * Tapping a card from the grid opens the profile beside it instead of
 * navigating away: the grid stays mounted behind, so you keep your place and
 * your scroll position. A hard load of the same URL still renders the full
 * page from app/[locale]/gatsnoba/[username]/page.tsx — which this reuses
 * verbatim, so the two can never drift apart.
 */
export default async function InterceptedDatingProfile(props: Props) {
  const { locale: raw } = await props.params;
  const locale = (isLocale(raw) ? raw : 'ka') as Locale;
  const d = getDatingDict(locale);

  return (
    <ProfileModalShell closeLabel={d.menu.close}>
      <DatingProfilePage params={props.params} />
    </ProfileModalShell>
  );
}
