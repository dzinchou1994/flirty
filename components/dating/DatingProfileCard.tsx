'use client';

import Link from 'next/link';
import { DatingNoPhoto } from '@/components/dating/DatingNoPhoto';
import { DatingLikeButton } from '@/components/dating/DatingLikeButton';
import type { DatingProfileView } from '@/lib/dating/shared';
import {
  datingDisplayGender,
  datingDisplayInterestedIn,
  type DatingCity,
  type DatingGenderBucket,
  type DatingShowMe,
} from '@/lib/dating/presets';
import { resolveMediaSrc } from '@/lib/media/url';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

type Messages = {
  genderLabels: Record<DatingGenderBucket, string>;
  showMeLabels: Record<DatingShowMe, string>;
  cityLabels: Record<DatingCity, string>;
  distanceBuckets?: Record<'<1km' | '1-3km' | '3-10km' | '10km+', string>;
  viewProfile: string;
  noPhoto: string;
  datingSublabel?: string;
  onlineNow?: string;
  like?: string;
  unlike?: string;
  liked?: string;
  matchTitle?: string;
  matchBody?: string;
  matchCta?: string;
  matchClose?: string;
};

type Props = {
  profile: DatingProfileView;
  locale: Locale;
  messages: Messages;
  liked?: boolean;
  showLike?: boolean;
  blurred?: boolean;
};

export function DatingProfileCard({
  profile,
  locale,
  messages,
  liked = false,
  showLike = false,
  blurred = false,
}: Props) {
  const cover = profile.photos[0]?.url ? resolveMediaSrc(profile.photos[0].url) || '' : null;
  const gender = datingDisplayGender(
    profile.genderBucket,
    profile.accountGender,
    profile.presetCase,
  );
  const genderLabel = messages.genderLabels[gender];
  const interestedIn = datingDisplayInterestedIn(
    profile.showMe,
    profile.genderBucket,
    profile.accountGender,
    profile.presetCase,
  );
  const interestLabel =
    interestedIn === 'everyone' ? null : messages.showMeLabels[interestedIn];
  const cityLabel = messages.cityLabels[profile.city] ?? messages.cityLabels.other;
  const distanceLabel =
    profile.distanceBucket && messages.distanceBuckets
      ? messages.distanceBuckets[profile.distanceBucket]
      : null;
  const displayName = profile.name || profile.username;
  const displayNameWithAge = profile.age ? `${displayName}, ${profile.age}` : displayName;
  const href = localePath(locale, `/gatsnoba/${profile.username}/`);

  const media = (
    <div className={`dating-card${blurred ? ' dating-card--blurred' : ''}`}>
      <div className="dating-card__media">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="dating-card__image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <DatingNoPhoto label={messages.noPhoto} sublabel={messages.datingSublabel} />
        )}
        {profile.photos.length > 1 && (
          <span className="dating-card__photo-count" aria-hidden>
            {profile.photos.length}
          </span>
        )}
        {profile.isOnline && messages.onlineNow ? (
          <span className="dating-card__online" title={messages.onlineNow}>
            <span className="dating-card__online-dot" aria-hidden />
            {messages.onlineNow}
          </span>
        ) : null}
        {distanceLabel ? (
          <span className="dating-card__distance">{distanceLabel}</span>
        ) : null}
        <div className="dating-card__overlay">
          <h2 className="dating-card__name">{displayNameWithAge}</h2>
          <p className="dating-card__meta">
            <span>{cityLabel}</span>
            <span aria-hidden>·</span>
            <span>{genderLabel}</span>
            {interestLabel ? (
              <>
                <span aria-hidden>·</span>
                <span>{interestLabel}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dating-card-wrap">
      {blurred ? (
        <div aria-label={`${messages.viewProfile}: ${displayNameWithAge}`}>{media}</div>
      ) : (
        <Link href={href} aria-label={`${messages.viewProfile}: ${displayNameWithAge}`}>
          {media}
        </Link>
      )}
      {showLike &&
      !blurred &&
      messages.like &&
      messages.unlike &&
      messages.liked &&
      messages.matchTitle &&
      messages.matchBody &&
      messages.matchCta &&
      messages.matchClose ? (
        <DatingLikeButton
          profileId={profile.id}
          profileName={displayName}
          matchUsername={profile.username}
          initiallyLiked={liked}
          locale={locale}
          labels={{
            like: messages.like,
            unlike: messages.unlike,
            liked: messages.liked,
            matchTitle: messages.matchTitle,
            matchBody: messages.matchBody,
            matchCta: messages.matchCta,
            matchClose: messages.matchClose,
          }}
        />
      ) : null}
    </div>
  );
}
