import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import {
  getDatingProfileByUsername,
  userHasUnlockingDatingProfile,
} from "@/lib/dating/profile-lookup";
import { getDatingLikeStatus } from "@/lib/dating/like-server";
import {
  parseDatingInterests,
  parseDatingLookingFor,
  datingDisplayGender,
  datingDisplayInterestedIn,
} from "@/lib/dating/presets";
import { getDatingDict } from "@/lib/i18n/dating-dict";
import { isLocale } from "@/lib/i18n/config";
import { datingHomePath, localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/i18n/types";
import { simpleMetadata } from "@/lib/seo-stub";
import { resolveMediaSrc } from "@/lib/media/url";
import { DatingLikeButton } from "@/components/dating/DatingLikeButton";
import { DatingProfileReportForm } from "@/components/dating/DatingProfileReportForm";
import { ProfilePhotoCarousel } from "@/components/dating/ProfilePhotoCarousel";
import { safeCommunity } from "@/lib/dating/safe";
import { getZodiacSignById, getZodiacSignName } from "@/lib/dating/zodiac";
import { fillHomeCopy } from "@/lib/dating/home";
import { loginHrefWithNext } from "@/lib/auth/next-paths";

type Props = { params: Promise<{ locale: string; username: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale: raw, username } = await params;
  if (!isLocale(raw)) return {};
  const d = getDatingDict(raw as Locale);
  return simpleMetadata({
    locale: raw as Locale,
    path: `/gatsnoba/${username}/`,
    title: `@${username} | ${d.title}`,
    description: `@${username} ${d.title}`,
    noindex: true,
  });
}

export default async function DatingProfilePage({ params }: Props) {
  const { locale: raw, username } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const d = getDatingDict(locale);

  const profile = await getDatingProfileByUsername(username);
  if (!profile) notFound();

  const currentUser = await getSessionUser();
  const isOwnProfile = currentUser?.id === profile.userId;

  // A photoless profile is public only while that person is online.
  // Your own page still opens so you can preview it before it is published.
  if (!isOwnProfile && !profile.isVisible) {
    notFound();
  }
  if (!isOwnProfile && profile.photos.length === 0 && !profile.isOnline) {
    notFound();
  }

  const unlocked = !isOwnProfile
    ? currentUser
      ? await safeCommunity(
          () => userHasUnlockingDatingProfile(currentUser.id),
          false,
        )
      : false
    : true;
  const isGuestView = !isOwnProfile && !unlocked;

  // Logged-in users without a dating profile still cannot open others —
  // send them to create one. Guests get a teaser profile with a soft gate.
  if (!isOwnProfile && currentUser && !unlocked) {
    redirect(datingHomePath(locale));
  }

  const likeStatus =
    currentUser && !isOwnProfile && unlocked
      ? await safeCommunity(
          () => getDatingLikeStatus(currentUser.id, profile.id),
          { liked: false, matched: false },
        )
      : { liked: false, matched: false };

  if (currentUser && !isOwnProfile && unlocked) {
    const { recordProfileView } = await import("@/lib/dating/views");
    await safeCommunity(
      () =>
        recordProfileView({
          viewerId: currentUser.id,
          profileUserId: profile.userId,
        }),
      undefined,
    );
  }

  const gender = datingDisplayGender(
    profile.genderBucket,
    profile.accountGender,
    profile.presetCase,
  );
  const genderLabel = d.genderLabels[gender];
  const interestedIn = datingDisplayInterestedIn(
    profile.showMe,
    profile.genderBucket,
    profile.accountGender,
    profile.presetCase,
  );
  const cityLabel = d.cityLabels[profile.city] ?? d.cityLabels.other;
  const displayName = profile.name || profile.username;
  const displayNameWithAge = profile.age
    ? `${displayName}, ${profile.age}`
    : displayName;

  const photos = profile.photos
    .map((photo) => ({ id: photo.id, url: resolveMediaSrc(photo.url) || "" }))
    .filter((photo) => photo.url);

  const zodiacLabel = profile.zodiacSign
    ? (() => {
        const sign = getZodiacSignById(profile.zodiacSign);
        return sign ? getZodiacSignName(sign, locale) : profile.zodiacSign;
      })()
    : null;

  const lookingForLabel = profile.lookingFor
    ? (() => {
        const key = parseDatingLookingFor(profile.lookingFor);
        return key ? d.lookingForLabels[key] : profile.lookingFor;
      })()
    : null;

  const interestKeys = parseDatingInterests(profile.interests);

  const facts: { key: string; label: string; value: string; wide?: boolean }[] = [
    { key: "gender", label: d.gender, value: genderLabel },
    { key: "showMe", label: d.showMe, value: d.showMeLabels[interestedIn] },
  ];
  if (profile.height) {
    facts.push({
      key: "height",
      label: d.height,
      // The label already carries the unit ("Height (cm)" / "სიმაღლე (სმ)").
      value: String(profile.height),
    });
  }
  if (zodiacLabel) {
    facts.push({ key: "zodiac", label: d.zodiacSign, value: zodiacLabel });
  }
  if (lookingForLabel) {
    facts.push({
      key: "lookingFor",
      label: d.lookingFor,
      value: lookingForLabel,
      wide: true,
    });
  }

  const guestJoinHref = loginHrefWithNext(
    `/gatsnoba/${profile.username}/`,
    locale,
  );

  return (
    <main className={`pprofile${isGuestView ? " pprofile--guest" : ""}`}>
      <header className="pprofile__hero">
        {photos.length ? (
          <ProfilePhotoCarousel
            photos={photos}
            alt={displayName}
            labels={{ prev: d.prevPhoto, next: d.nextPhoto }}
          />
        ) : (
          <div className="pprofile__nophoto" role="img" aria-label={d.noPhoto}>
            <span className="pprofile__nophoto-initial" aria-hidden>
              {(displayName.trim()[0] || "?").toUpperCase()}
            </span>
            <span className="pprofile__nophoto-label">{d.noPhoto}</span>
          </div>
        )}

        <div className="pprofile__chrome">
          <Link
            href={isGuestView ? localePath(locale, "/gatsnoba/") : datingHomePath(locale)}
            className="pprofile__back"
            aria-label={d.backToBrowseFromProfile}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          {isOwnProfile ? (
            <Link
              href={localePath(locale, "/user/dating/")}
              className="pprofile__edit"
            >
              {d.editProfile}
            </Link>
          ) : null}
        </div>

        <div className="pprofile__identity">
          {profile.isOnline ? (
            <span className="pprofile__online">
              <span className="pprofile__online-dot" aria-hidden="true" />
              {d.onlineNow}
            </span>
          ) : null}
          <h1 className="pprofile__name">{displayNameWithAge}</h1>
          <p className="pprofile__where">
            {genderLabel}
            <span className="pprofile__sep" aria-hidden="true" />
            {cityLabel}
          </p>
        </div>
      </header>

      {/* Guests get the three-chip teaser; signed-in viewers get the full
          "interests" section below, so showing both duplicated every tag. */}
      {isGuestView && interestKeys.length ? (
        <div className="pprofile__tags">
          {interestKeys.slice(0, 3).map((key) => (
            <span key={key} className="pprofile__tag">
              {d.interestLabels[key]}
            </span>
          ))}
        </div>
      ) : null}

      {profile.bio ? (
        <section className="psection psection--bio">
          <p className="pbio">{profile.bio}</p>
        </section>
      ) : null}

      {isGuestView ? (
        <div className="pprofile-album-lock">
          <span className="pprofile-album-lock__icon" aria-hidden>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
              <path d="M8 10.5V7.4a4 4 0 0 1 8 0v3.1" />
            </svg>
          </span>
          <span>
            <strong>{fillHomeCopy(d.home.albumLockedTitle, { n: 4 })}</strong>
            <small>{fillHomeCopy(d.home.albumLockedHint, { name: displayName })}</small>
          </span>
        </div>
      ) : null}

      {!isGuestView ? (
        <dl className="pfacts">
          {facts.map((fact) => (
            <div
              key={fact.key}
              className={`pfact${fact.wide ? " pfact--wide" : ""}`}
            >
              <dt className="pfact__k">{fact.label}</dt>
              <dd className="pfact__v">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {!isGuestView && (interestKeys.length || profile.interests) ? (
        <section className="psection">
          <h2 className="psection__h">{d.interests}</h2>
          {interestKeys.length ? (
            <div className="dating-interests__selected dating-interests__selected--readonly">
              {interestKeys.map((key) => (
                <span key={key} className="dating-interest-chip is-selected">
                  {d.interestLabels[key]}
                </span>
              ))}
            </div>
          ) : (
            <p className="pbio">{profile.interests}</p>
          )}
        </section>
      ) : null}

      {!isOwnProfile && currentUser && unlocked ? (
        <section className="psection psection--quiet">
          <DatingProfileReportForm
            profileId={profile.id}
            messages={{
              title: d.reportTitle,
              lead: d.reportLead,
              reason: d.reportReason,
              submit: d.reportSubmit,
              success: d.reportSuccess,
              reasons: d.reportReasons,
              errors: {
                loginRequired: d.errorLoginRequired,
                serviceUnavailable: d.errorLoginService,
                profileNotFound: d.errorProfileNotFound,
                invalidReportReason: d.errorInvalidReportReason,
                cannotReportSelf: d.errorCannotReportSelf,
                alreadyReported: d.errorAlreadyReported,
              },
            }}
          />
        </section>
      ) : null}

      {!isOwnProfile && currentUser && unlocked ? (
        <div className="pbar">
          <DatingLikeButton
            profileId={profile.id}
            profileName={displayName}
            matchUsername={profile.username}
            initiallyLiked={likeStatus.liked}
            locale={locale}
            labels={{
              like: d.like,
              unlike: d.unlike,
              liked: d.liked,
              matchTitle: d.matchTitle,
              matchBody: d.matchBody,
              matchCta: d.matchCta,
              matchClose: d.matchClose,
            }}
          />
          <Link
            href={localePath(locale, `/gatsnoba/messages/${profile.userId}/`)}
            className="pbar__cta"
          >
            {d.messageCta}
          </Link>
        </div>
      ) : null}

      {isGuestView ? (
        <div className="pbar pbar--guest">
          <Link href={guestJoinHref} className="pbar__cta pbar__cta--guest">
            {fillHomeCopy(d.home.messageName, { name: displayName })}
          </Link>
          <Link
            href={guestJoinHref}
            className="pbar__heart"
            aria-label={d.home.likeAria}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 8 3C20 16.1 12 21 12 21z" />
            </svg>
          </Link>
          <p className="pbar__hint">{d.home.guestGateHint}</p>
        </div>
      ) : null}
    </main>
  );
}
