import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import {
  getDatingProfileByUsername,
  userHasUnlockingDatingProfile,
} from "@/lib/dating/profile-lookup";
import { getDatingLikeStatus } from "@/lib/dating/like-server";
import { parseDatingInterests, parseDatingLookingFor, datingDisplayGender, datingDisplayInterestedIn } from "@/lib/dating/presets";
import { getDatingDict } from "@/lib/i18n/dating-dict";
import { isLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/i18n/types";
import { simpleMetadata } from "@/lib/seo-stub";
import { resolveMediaSrc } from "@/lib/media/url";
import { DatingNoPhoto } from "@/components/dating/DatingNoPhoto";
import { DatingLikeButton } from "@/components/dating/DatingLikeButton";
import { DatingProfileReportForm } from "@/components/dating/DatingProfileReportForm";
import { safeCommunity } from "@/lib/dating/safe";
import {
  getZodiacSignById,
  getZodiacSignName,
} from "@/lib/dating/zodiac";

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
    const { recordProfileView } = await import('@/lib/dating/views');
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
  const cityLabel =
    d.cityLabels[profile.city] ?? d.cityLabels.other;
  const cover = profile.photos[0]?.url
    ? (resolveMediaSrc(profile.photos[0].url) || '')
    : null;
  const displayName = profile.name || profile.username;
  const displayNameWithAge = profile.age
    ? `${displayName}, ${profile.age}`
    : displayName;

  return (
    <main className="container community-page dating-page">
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <Link
            href={localePath(locale, "/gatsnoba/")}
            className="btn btn--ghost"
            style={{ paddingLeft: 0 }}
          >
            ← {d.backToBrowseFromProfile}
          </Link>
          {isOwnProfile && (
            <Link
              href={localePath(locale, "/user/dating/")}
              className="btn btn--ghost"
            >
              {d.editProfile}
            </Link>
          )}
        </div>

        <div
          style={{
            backgroundColor: "var(--com-bg-card)",
            borderRadius: "1rem",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            border: "1px solid var(--com-border)",
            position: "relative",
          }}
        >
          <div
            style={{
              aspectRatio: "3/4",
              position: "relative",
              backgroundColor: "var(--com-bg-sub)",
            }}
          >
            {cover ? (
              <img
                src={cover}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <DatingNoPhoto label={d.noPhoto} sublabel={d.title} />
            )}

            {profile.isOnline ? (
              <span
                className="dating-card__online"
                style={{ position: "absolute" }}
              >
                <span className="dating-card__online-dot" aria-hidden />
                {d.onlineNow}
              </span>
            ) : null}

            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "3rem 1.5rem 1.5rem",
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
                color: "white",
              }}
            >
              <h1
                style={{
                  fontSize: "2rem",
                  margin: "0 0 0.25rem",
                  fontWeight: 700,
                  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                }}
              >
                {displayNameWithAge}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  opacity: 0.9,
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    backgroundColor: "var(--com-accent)",
                    borderRadius: "50%",
                  }}
                />
                {genderLabel} • {cityLabel}
              </p>
            </div>

            {!isOwnProfile && currentUser ? (
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
            ) : null}
          </div>

          <div style={{ padding: "1.5rem" }}>
            {profile.bio && (
              <div style={{ marginBottom: "2rem" }}>
                <p
                  style={{
                    fontSize: "1.1rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {profile.bio}
                </p>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.75rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "var(--com-bg-sub)",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--com-text-mute)",
                    marginBottom: "0.25rem",
                  }}
                >
                  {d.gender}
                </div>
                <div style={{ fontWeight: 600 }}>{genderLabel}</div>
              </div>
              <div
                style={{
                  backgroundColor: "var(--com-bg-sub)",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--com-text-mute)",
                    marginBottom: "0.25rem",
                  }}
                >
                  {d.showMe}
                </div>
                <div style={{ fontWeight: 600 }}>
                  {d.showMeLabels[interestedIn]}
                </div>
              </div>
              {profile.height && (
                <div
                  style={{
                    backgroundColor: "var(--com-bg-sub)",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--com-text-mute)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {d.height}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {profile.height} {d.cmUnit}
                  </div>
                </div>
              )}
              {profile.zodiacSign && (
                <div
                  style={{
                    backgroundColor: "var(--com-bg-sub)",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--com-text-mute)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {d.zodiacSign}
                  </div>
                  <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
                    {(() => {
                      const sign = getZodiacSignById(profile.zodiacSign);
                      return sign
                        ? getZodiacSignName(sign, locale)
                        : profile.zodiacSign;
                    })()}
                  </div>
                </div>
              )}
              {profile.lookingFor && (
                <div
                  style={{
                    backgroundColor: "var(--com-bg-sub)",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    gridColumn: "1 / -1",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--com-text-mute)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {d.lookingFor}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {(() => {
                      const key = parseDatingLookingFor(profile.lookingFor);
                      return key
                        ? d.lookingForLabels[key]
                        : profile.lookingFor;
                    })()}
                  </div>
                </div>
              )}
            </div>

            {(() => {
              const interestKeys = parseDatingInterests(profile.interests);
              if (!interestKeys.length && !profile.interests) return null;
              return (
                <div style={{ marginBottom: "2rem" }}>
                  <h3
                    style={{
                      fontSize: "1rem",
                      margin: "0 0 0.5rem",
                      color: "var(--com-text-mute)",
                    }}
                  >
                    {d.interests}
                  </h3>
                  {interestKeys.length > 0 ? (
                    <div className="dating-interests__selected dating-interests__selected--readonly">
                      {interestKeys.map((key) => (
                        <span key={key} className="dating-interest-chip is-selected">
                          {d.interestLabels[key]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                    >
                      {profile.interests}
                    </p>
                  )}
                </div>
              );
            })()}

            {profile.photos.length > 1 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                {profile.photos.slice(1).map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      borderRadius: "1rem",
                      overflow: "hidden",
                      backgroundColor: "var(--com-bg-sub)",
                    }}
                  >
                    <img
                      src={resolveMediaSrc(photo.url) || ''}
                      alt=""
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                marginTop: "1rem",
              }}
            >
              {!isOwnProfile && currentUser ? (
                <Link
                  href={localePath(
                    locale,
                    `/gatsnoba/messages/${profile.userId}/`,
                  )}
                  className="btn btn--primary"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "1rem",
                    fontSize: "1.1rem",
                    borderRadius: "3rem",
                  }}
                >
                  {d.messageCta}
                </Link>
              ) : null}

              <Link
                href={localePath(locale, `/u/${profile.username}/`)}
                className="btn btn--ghost"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "1rem",
                  borderRadius: "3rem",
                }}
              >
                {d.viewProfile} →
              </Link>
              {!isOwnProfile && currentUser ? (
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
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
