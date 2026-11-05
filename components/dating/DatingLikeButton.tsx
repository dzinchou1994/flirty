'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import {
  likeDatingProfile,
  unlikeDatingProfile,
} from '@/lib/dating/like-client';
import { DatingMatchModal } from '@/components/dating/DatingMatchModal';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

type Props = {
  profileId: string;
  profileName: string;
  matchUsername?: string;
  initiallyLiked: boolean;
  locale: Locale;
  labels: {
    like: string;
    unlike: string;
    liked: string;
    matchTitle: string;
    matchBody: string;
    matchCta: string;
    matchClose: string;
  };
};

export function DatingLikeButton({
  profileId,
  profileName,
  matchUsername,
  initiallyLiked,
  locale,
  labels,
}: Props) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState(matchUsername ?? '');
  const [pending, startTransition] = useTransition();

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    const next = !liked;
    setLiked(next);

    startTransition(async () => {
      const result = next
        ? await likeDatingProfile(profileId)
        : await unlikeDatingProfile(profileId);

      if (result?.error) {
        setLiked(!next);
        return;
      }

      if (result?.matched && result.matchUsername) {
        setMatchedUser(result.matchUsername);
        setMatchOpen(true);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={`dating-like-btn${liked ? ' is-liked' : ''}`}
        aria-label={liked ? labels.unlike : labels.like}
        aria-pressed={liked}
        title={liked ? labels.liked : labels.like}
        disabled={pending}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="dating-like-btn__icon">
          <path
            d="M12 21s-6.7-4.35-9.33-7.6C.7 10.95 1.1 7.4 3.55 5.7 5.45 4.35 8 4.6 9.7 6.2L12 8.4l2.3-2.2c1.7-1.6 4.25-1.85 6.15-.5 2.45 1.7 2.85 5.25.88 7.7C18.7 16.65 12 21 12 21z"
            fill="currentColor"
          />
        </svg>
      </button>

      <DatingMatchModal
        open={matchOpen}
        onClose={() => setMatchOpen(false)}
        profileName={profileName}
        messageHref={localePath(
          locale,
          `/gatsnoba/messages/?to=${encodeURIComponent(matchedUser || profileName)}`,
        )}
        labels={{
          title: labels.matchTitle,
          body: labels.matchBody,
          cta: labels.matchCta,
          close: labels.matchClose,
        }}
      />
    </>
  );
}
