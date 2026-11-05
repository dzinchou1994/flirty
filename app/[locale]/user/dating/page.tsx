import { redirect } from 'next/navigation';
import { DatingProfileEditor } from '@/components/dating/DatingProfileEditor';
import { DatingMobileChrome } from '@/components/dating/DatingMobileChrome';
import { getSessionUser } from '@/lib/auth/server';
import { loginHrefWithNext, DATING_CREATE_NEXT } from '@/lib/auth/next-paths';
import { hydrateDatingProfile, type DatingProfileView } from '@/lib/dating/shared';
import { serializePublicProfile } from '@/lib/dating/serialize';
import { getDatingDict } from '@/lib/i18n/dating-dict';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseUrl } from '@/lib/db-url';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export default async function UserDatingPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const locale = raw as Locale;
  const d = getDatingDict(locale);
  const user = await getSessionUser();
  if (!user) redirect(loginHrefWithNext(DATING_CREATE_NEXT, locale));

  let profile: DatingProfileView | null = null;
  if (ensureDatabaseUrl()) {
    const row = await prisma.datingProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: { select: { username: true, avatar: true, gender: true, lastActiveAt: true } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (row) profile = hydrateDatingProfile(serializePublicProfile(row));
  }

  return (
    <>
      <DatingMobileChrome locale={locale} labels={{ backHome: d.backToBrowse, title: d.editorTitle }} />
      <main className="container community-page dating-page dating-page--editor">
        <header className="community-page__header">
          <div>
            <h1>{d.editorTitle}</h1>
            <p className="community-page__lead">{d.editorLead}</p>
          </div>
        </header>
        <DatingProfileEditor
          profile={profile}
          draftKey={user.id}
          accountGender={user.gender}
          locale={locale}
          backHref={localePath(locale, '/gatsnoba/')}
          messages={{
          required: d.required,
          save: d.save,
          back: d.backToBrowse,
          gender: d.gender,
          genderHint: d.genderHint,
          genderLabels: d.genderLabels,
          name: d.name,
          namePlaceholder: d.namePlaceholder,
          age: d.age,
          agePlaceholder: d.agePlaceholder,
          city: d.city,
          cityHint: d.cityHint,
          cityLabels: d.cityLabels,
          showMe: d.showMe,
          showMeHint: d.showMeHint,
          showMeLabels: d.showMeLabels,
          bio: d.bio,
          bioPlaceholder: d.bioPlaceholder,
          bioHint: d.bioHint,
          height: d.height,
          heightPlaceholder: d.heightPlaceholder,
          zodiacSign: d.zodiacSign,
          lookingFor: d.lookingFor,
          lookingForLabels: d.lookingForLabels,
          interests: d.interests,
          interestsHint: d.interestsHint,
          interestsAdd: d.interestsAdd,
          interestsCollapse: d.interestsCollapse,
          interestsMax: d.interestsMax,
          interestLabels: d.interestLabels,
          photosTitle: d.photosTitle,
          photosLead: d.photosLead,
          photoUpload: d.photoUpload,
          photoUploadHint: d.photoUploadHint,
          photoRemove: d.photoRemove,
          photoPrimaryBadge: d.photoPrimaryBadge,
          photoSetPrimary: d.photoSetPrimary,
          photoAddMore: d.photoAddMore,
          photoPending: d.photoPending,
          photoAwaitingReview: d.photoAwaitingReview,
          photosReviewHint: d.photosReviewHint,
          photoCount: d.photoCount,
          photoUploading: d.photoUploading,
          visibilityTitle: d.visibilityTitle,
          visibilityHint: d.visibilityHint,
          visibilityPause: d.visibilityPause,
          visibilityResume: d.visibilityResume,
          visibilityUnavailable: d.visibilityUnavailable,
          albumLink: d.menu.album,
          albumLinkHref: localePath(locale, '/user/dating/album/'),
          deleteProfileTitle: d.deleteProfileTitle,
          deleteProfileLead: d.deleteProfileLead,
          deleteProfileConfirm: d.deleteProfileConfirm,
          deleteProfileUsername: d.deleteProfileUsername,
          deleteProfileSubmit: d.deleteProfileSubmit,
          errors: {
            loginRequired: d.errorLoginRequired,
            serviceUnavailable: d.errorLoginService,
            invalidPreset: d.errorInvalidPreset,
            invalidGender: d.errorInvalidGender,
            invalidCity: d.errorInvalidCity,
            nameRequired: d.errorNameRequired,
            invalidLookingFor: d.errorInvalidLookingFor,
            bioTooShort: d.errorBioTooShort,
            photoRequired: d.errorPhotoRequired,
            photoRequiredForProfile: d.errorPhotoRequiredForProfile,
            invalidPhotoType: d.errorInvalidPhotoType,
            photoTooLarge: d.errorPhotoTooLarge,
            photoLimitReached: d.errorPhotoLimitReached,
            photoNotFound: d.errorPhotoNotFound,
            photoUploadFailed: d.errorPhotoUploadFailed,
            profileNotFound: d.errorProfileNotFound,
            profileRestricted: d.errorProfileRestricted,
            cannotShowProfile: d.errorCannotShow,
            usernameMismatch: d.errorUsernameMismatch,
            livePhotoLocked: d.errorLivePhotoLocked,
            photoPendingReview: d.errorPhotoPendingReview,
            photoRejectedExplicit: d.errorPhotoRejectedExplicit,
            photoRejectedDrawing: d.errorPhotoRejectedDrawing,
            photoRejectedNoFace: d.errorPhotoRejectedNoFace,
            photoCheckUnavailable: d.errorPhotoCheckUnavailable,
          },
          successes: {
            profileSaved: d.successProfileSaved,
            photoAdded: d.successPhotoAdded,
            photoPendingReview: d.successPhotoPendingReview,
            profilePendingReview: d.successProfilePendingReview,
            photoRemoved: d.successPhotoRemoved,
            primaryPhotoSet: d.successPrimaryPhotoSet,
            visibilityOn: d.successVisibilityOn,
            visibilityOff: d.successVisibilityOff,
            profileDeleted: d.successProfileDeleted,
          },
          restrictionTitle: d.restrictionTitle,
          restrictionHiddenHint: d.restrictionHiddenHint,
          restrictionBlockedHint: d.restrictionBlockedHint,
          restrictionPhotoHint: d.restrictionPhotoHint,
          pendingTitle: d.pendingTitle,
          pendingHint: d.pendingHint,
          pendingPhotoReason: d.pendingPhotoReason,
          pendingBioReason: d.pendingBioReason,
          pendingAutoPublishHint: d.pendingAutoPublishHint,
          completeness: d.completeness,
          editorSections: d.editorSections,
          attributeFields: d.attributeFields,
          attributeLabels: d.attributeLabels,
        }}
        />
      </main>
    </>
  );
}
