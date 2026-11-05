'use client';

import { useActionState } from 'react';
import { reportDatingProfile } from '@/lib/dating/profile-client';
import { DATING_REPORT_REASONS, type DatingReportReason } from '@/lib/dating/reports';

type Messages = {
  title: string;
  lead: string;
  reason: string;
  submit: string;
  success: string;
  reasons: Record<DatingReportReason, string>;
  errors: Record<string, string>;
};

type Props = {
  profileId: string;
  messages: Messages;
};

/**
 * reportDatingProfile is a browser fetch helper, not a server action, so it is
 * imported here rather than passed down from the (server) profile page —
 * React cannot serialise a plain function across that boundary.
 */
export function DatingProfileReportForm({ profileId, messages }: Props) {
  const [state, formAction, pending] = useActionState(reportDatingProfile, null);
  const errorMessage = state?.error ? messages.errors[state.error] : null;
  const successMessage = state?.success === 'reportSuccess' ? messages.success : null;

  return (
    <details className="dating-report">
      <summary>{messages.title}</summary>
      <form action={formAction} className="community-form community-form--compact">
        <p className="community-settings__hint">{messages.lead}</p>
        <input type="hidden" name="profileId" value={profileId} />
        <label>
          {messages.reason}
          <select name="reason" required defaultValue="">
            <option value="" disabled>
              —
            </option>
            {DATING_REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {messages.reasons[reason]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn--ghost" disabled={pending}>
          {pending ? '...' : messages.submit}
        </button>
        {errorMessage ? <p className="community-form__error">{errorMessage}</p> : null}
        {successMessage ? <p className="community-form__success">{successMessage}</p> : null}
      </form>
    </details>
  );
}
