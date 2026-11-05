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
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/i18n/types";
import { simpleMetadata } from "@/lib/seo-stub";
import { resolveMediaSrc } from "@/lib/media/url";
import { DatingNoPhoto } from "@/components/dating/DatingNoPhoto";
import { DatingLikeButton } from "@/components/dating/DatingLikeButton";
import { DatingProfileReportForm } from "@/components/dating/DatingProfileReportForm";
import { ProfilePhotoCarousel } from "@/components/dating/ProfilePhotoCarousel";
import { safeCommunity } from "@/lib/dating/safe";
import { getZodiacSignById, getZodiacSignName } from "@/lib/dating/zodiac";

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
  if (!profile || !profile.isVisible || profile.photos.length === 0) notFound();

  const currentUser = await getSessionUser();
  const isOwnProfile = currentUser?.id === profile.userId;

  // Guests / users without a dating profile cannot view others.
  if (!isOwnProfile) {
    const unlocked = currentUser
      ? await safeCommunity(
          () => userHasUnlockingDatingProfile(currentUser.id),
          false,
        )
      : false;
    if (!unlocked) {
      redirect(localePath(locale, "/gatsnoba/"));
    }
  }

  const likeStatus =
    currentUser && !isOwnProfile
      ? await safeCommunity(
          () => getDatingLikeStatus(currentUser.id, profile.id),
          { liked: false, matched: false },
        )
      : { liked: false, matched: false };

  if (currentUser && !isOwnProfile) {
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

  return (
    <main className="pprofile">
      <header className="pprofile__hero">
        {photos.length ? (
          <ProfilePhotoCarousel
            photos={photos}
            alt={displayName}
            labels={{ prev: d.prevPhoto, next: d.nextPhoto }}
          />
        ) : (
          <div className="pprofile__nophoto">
            <DatingNoPhoto label={d.noPhoto} sublabel={d.title} />
          </div>
        )}

        <div className="pprofile__chrome">
          <Link
            href={localePath(locale, "/gatsnoba/")}
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

      {profile.bio ? (
        <section className="psection psection--bio">
          <p className="pbio">{profile.bio}</p>
        </section>
      ) : null}

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

      {interestKeys.length || profile.interests ? (
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

      {!isOwnProfile && currentUser ? (
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

      {!isOwnProfile && currentUser ? (
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
    </main>
  );
}
