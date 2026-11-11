'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  DATING_MAX_PHOTOS,
  DATING_PHOTO_MAX_BYTES,
  type DatingProfileView,
} from '@/lib/dating/shared';
import type { DatingActionState } from '@/lib/dating/profile-client';
import {
  upsertDatingProfile,
  addDatingPhoto,
  removeDatingPhoto,
  setDatingPrimaryPhoto,
  setDatingProfileVisibility,
  deleteDatingProfile,
} from '@/lib/dating/profile-client';
import {
  DATING_CITIES,
  DATING_GENDER_BUCKETS,
  DATING_INTERESTS,
  DATING_INTERESTS_MAX,
  DATING_LOOKING_FOR_OPTIONS,
  DATING_SHOW_ME_OPTIONS,
  datingDisplayGender,
  datingDisplayInterestedIn,
  genderBucketFromAccount,
  parseDatingInterests,
  type DatingCity,
  type DatingGenderBucket,
  type DatingInterest,
  type DatingLookingFor,
  type DatingShowMe,
} from '@/lib/dating/presets';
import { parseAvatarGender } from '@/lib/dating/avatar';
import {
  clearDatingEditorDraft,
  loadDatingEditorDraft,
  saveDatingEditorDraft,
} from '@/lib/dating/editor-draft';
import { resolveMediaSrc } from '@/lib/media/url';
import { isAutoCorrectableDatingRestriction } from '@/lib/dating/moderation-reasons';
import { getZodiacSignName, getZodiacSigns } from '@/lib/dating/zodiac';
import { datingProfileCompleteness } from '@/lib/dating/completeness';
import {
  lookingForToTags,
  parseCommunityTags,
  parseLanguages,
  parseLookingForTags,
  parseMeetAt,
  type DatingCommunityTag,
  type DatingLanguage,
  type DatingLookingForTag,
  type DatingMeetAt,
} from '@/lib/dating/attributes';
import {
  DatingAttributeSections,
  type AttributeFormValues,
  type AttributeSectionLabels,
} from '@/components/dating/DatingAttributeSections';
import type { Locale } from '@/lib/i18n/types';

type Messages = {
  required: string;
  save: string;
  back: string;
  gender: string;
  genderHint: string;
  genderLabels: Record<DatingGenderBucket, string>;
  name: string;
  namePlaceholder: string;
  age: string;
  agePlaceholder: string;
  city: string;
  cityHint: string;
  cityLabels: Record<DatingCity, string>;
  showMe: string;
  showMeHint: string;
  showMeLabels: Record<'everyone' | 'male' | 'female' | 'trans', string>;
  bio: string;
  bioPlaceholder: string;
  bioHint: string;
  height: string;
  heightPlaceholder: string;
  zodiacSign: string;
  lookingFor: string;
  lookingForLabels: Record<DatingLookingFor, string>;
  interests: string;
  interestsHint: string;
  interestsAdd: string;
  interestsCollapse: string;
  interestsMax: string;
  interestLabels: Record<DatingInterest, string>;
  photosTitle: string;
  photosLead: string;
  photoUpload: string;
  photoUploadHint: string;
  photoRemove: string;
  photoPrimaryBadge: string;
  photoSetPrimary: string;
  photoAddMore: string;
  photoPending: string;
  photoAwaitingReview: string;
  photosReviewHint: string;
  photoCount: string;
  photoUploading: string;
  visibilityTitle: string;
  visibilityHint: string;
  visibilityPause: string;
  visibilityResume: string;
  visibilityUnavailable: string;
  albumLink?: string;
  albumLinkHref?: string;
  deleteProfileTitle: string;
  deleteProfileLead: string;
  deleteProfileConfirm: string;
  deleteProfileUsername: string;
  deleteProfileSubmit: string;
  errors: Record<string, string>;
  successes: Record<string, string>;
  restrictionTitle: string;
  restrictionHiddenHint: string;
  restrictionBlockedHint: string;
  restrictionPhotoHint: string;
  pendingTitle: string;
  pendingHint: string;
  pendingPhotoReason: string;
  pendingBioReason: string;
  pendingAutoPublishHint: string;
  completeness: string;
  editorSections: AttributeSectionLabels['sections'] & { basics: string };
  attributeFields: AttributeSectionLabels['fields'];
  attributeLabels: AttributeSectionLabels['labels'];
};

type Props = {
  profile: DatingProfileView | null;
  /** Scopes local draft storage to the logged-in user. */
  draftKey: string;
  accountGender?: string | null;
  locale: Locale;
  backHref: string;
  upsertProfile?: (prev: DatingActionState, formData: FormData) => Promise<DatingActionState>;
  addPhoto?: (prev: DatingActionState, formData: FormData) => Promise<DatingActionState>;
  removePhoto?: (prev: DatingActionState, formData: FormData) => Promise<DatingActionState>;
  setPrimaryPhoto?: (prev: DatingActionState, formData: FormData) => Promise<DatingActionState>;
  setVisibility?: (prev: DatingActionState, formData: FormData) => Promise<DatingActionState>;
  deleteProfile?: (prev: DatingActionState, formData: FormData) => Promise<DatingActionState>;
  messages: Messages;
};

type PendingPhoto = {
  localId: string;
  file: File;
  previewUrl: string;
};

const ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif';

function revokePending(photos: PendingPhoto[]) {
  for (const photo of photos) URL.revokeObjectURL(photo.previewUrl);
}

function RequiredMark({ label }: { label: string }) {
  return (
    <span className="dating-required" title={label} aria-label={label}>
      *
    </span>
  );
}

function initialGenderBucket(profile: DatingProfileView | null, accountGender?: string | null): string {
  const account = accountGender ?? profile?.accountGender ?? null;
  if (profile?.genderBucket) {
    return datingDisplayGender(profile.genderBucket, account, profile.presetCase);
  }
  return genderBucketFromAccount(parseAvatarGender(account ?? '')) ?? '';
}

function profileFormDefaults(profile: DatingProfileView | null, accountGender?: string | null) {
  return {
    name: profile?.name ?? '',
    age: profile?.age != null ? String(profile.age) : '',
    city: (profile?.city ?? 'tbilisi') as string,
    showMe: profile
      ? (datingDisplayInterestedIn(
          profile.showMe,
          profile.genderBucket,
          accountGender ?? profile.accountGender,
          profile.presetCase,
        ) as string)
      : 'everyone',
    genderBucket: initialGenderBucket(profile, accountGender),
    bio: profile?.bio ?? '',
    height: profile?.height != null ? String(profile.height) : '',
    zodiacSign: profile?.zodiacSign ?? '',
    lookingFor: DATING_LOOKING_FOR_OPTIONS.includes(
      (profile?.lookingFor ?? '') as DatingLookingFor,
    )
      ? (profile?.lookingFor as string)
      : '',
  };
}

function attributeDefaults(profile: DatingProfileView | null): AttributeFormValues {
  const tags =
    profile?.lookingForTags && profile.lookingForTags.length
      ? parseLookingForTags(profile.lookingForTags)
      : lookingForToTags(profile?.lookingFor);
  return {
    weightKg: profile?.weightKg != null ? String(profile.weightKg) : '',
    bodyType: profile?.bodyType ?? '',
    relationshipStatus: profile?.relationshipStatus ?? '',
    lookingForTags: tags as DatingLookingForTag[],
    meetAt: parseMeetAt(profile?.meetAt) as DatingMeetAt[],
    pronouns: profile?.pronouns ?? '',
    genderIdentity: profile?.genderIdentity ?? '',
    languages: parseLanguages(profile?.languages) as DatingLanguage[],
    smoking: profile?.smoking ?? '',
    drinking: profile?.drinking ?? '',
    kids: profile?.kids ?? '',
    education: profile?.education ?? '',
    work: profile?.work ?? '',
    position: profile?.position ?? '',
    communityTags: parseCommunityTags(profile?.communityTags) as DatingCommunityTag[],
  };
}

export function DatingProfileEditor({
  profile,
  draftKey,
  accountGender,
  locale,
  backHref,
  upsertProfile = upsertDatingProfile,
  addPhoto = addDatingPhoto,
  removePhoto = removeDatingPhoto,
  setPrimaryPhoto = setDatingPrimaryPhoto,
  setVisibility = setDatingProfileVisibility,
  deleteProfile = deleteDatingProfile,
  messages,
}: Props) {
  const router = useRouter();
  const fileInputId = useId();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [formValues, setFormValues] = useState(() => profileFormDefaults(profile, accountGender));
  const [attrValues, setAttrValues] = useState(() => attributeDefaults(profile));
  const [attrSection, setAttrSection] = useState<string | null>('appearance');
  const [selectedInterests, setSelectedInterests] = useState<DatingInterest[]>(() =>
    parseDatingInterests(profile?.interests),
  );
  const [draftReady, setDraftReady] = useState(false);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, startSaveTransition] = useTransition();
  const [actingPhotoId, setActingPhotoId] = useState<string | null>(null);
  const [privacyAction, setPrivacyAction] = useState<string | null>(null);

  const savedCount = profile?.photos.length ?? 0;
  const totalCount = savedCount + pendingPhotos.length;
  const slotsLeft = Math.max(0, DATING_MAX_PHOTOS - totalCount);
  const busy = saving || uploading || Boolean(actingPhotoId) || Boolean(privacyAction);
  const completenessPct = datingProfileCompleteness({
    name: formValues.name,
    age: formValues.age ? Number(formValues.age) : null,
    city: formValues.city,
    bio: formValues.bio,
    height: formValues.height ? Number(formValues.height) : null,
    weightKg: attrValues.weightKg ? Number(attrValues.weightKg) : null,
    bodyType: attrValues.bodyType,
    relationshipStatus: attrValues.relationshipStatus,
    lookingForTags: attrValues.lookingForTags,
    meetAt: attrValues.meetAt,
    pronouns: attrValues.pronouns,
    genderIdentity: attrValues.genderIdentity,
    languages: attrValues.languages,
    smoking: attrValues.smoking,
    drinking: attrValues.drinking,
    kids: attrValues.kids,
    education: attrValues.education,
    work: attrValues.work,
    position: attrValues.position,
    communityTags: attrValues.communityTags,
    interests: selectedInterests.join(','),
    photoCount: totalCount,
    promptCount: profile?.promptAnswers?.length ?? 0,
    presetCase: profile?.presetCase,
  });

  const pendingRef = useRef(pendingPhotos);
  pendingRef.current = pendingPhotos;
  useEffect(() => {
    return () => revokePending(pendingRef.current);
  }, []);

  useEffect(() => {
    const draft = loadDatingEditorDraft(draftKey);
    if (draft) {
      setFormValues({
        name: draft.name,
        age: draft.age,
        city: draft.city,
        showMe: datingDisplayInterestedIn(
          draft.showMe as DatingShowMe,
          draft.genderBucket === 'trans'
            ? 'trans'
            : datingDisplayGender(draft.genderBucket, accountGender),
          accountGender,
          profile?.presetCase,
        ),
        genderBucket:
          draft.genderBucket === 'trans'
            ? 'trans'
            : datingDisplayGender(draft.genderBucket, accountGender),
        bio: draft.bio,
        height: draft.height,
        zodiacSign: draft.zodiacSign,
        lookingFor: draft.lookingFor,
      });
      setSelectedInterests(draft.interests);
    }
    setDraftReady(true);
  }, [draftKey, accountGender, profile?.presetCase]);

  useEffect(() => {
    if (!draftReady) return;
    saveDatingEditorDraft(draftKey, {
      name: formValues.name,
      age: formValues.age,
      city: formValues.city,
      showMe: formValues.showMe,
      genderBucket: formValues.genderBucket as DatingGenderBucket,
      bio: formValues.bio,
      height: formValues.height,
      zodiacSign: formValues.zodiacSign,
      lookingFor: formValues.lookingFor,
      interests: selectedInterests,
    });
  }, [draftKey, draftReady, formValues, selectedInterests]);

  function patchForm<K extends keyof typeof formValues>(key: K, value: (typeof formValues)[K]) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  function resolveError(key: string | undefined, detail?: string) {
    const base = !key
      ? messages.errors.photoUploadFailed
      : (messages.errors[key] ?? messages.errors.photoUploadFailed);
    // Append the server's own reason when it has one, so a failure is
    // diagnosable from the screen instead of only from container logs.
    return detail ? `${base} (${detail})` : base;
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length || slotsLeft <= 0) return;

    const next: PendingPhoto[] = [];
    for (const file of Array.from(fileList)) {
      if (next.length >= slotsLeft) break;
      if (file.size <= 0) continue;
      if (file.size > DATING_PHOTO_MAX_BYTES) {
        setStatus({ type: 'error', text: messages.errors.photoTooLarge });
        continue;
      }
      next.push({
        localId: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (!next.length) return;
    setPendingPhotos((prev) => [...prev, ...next]);
    setStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onPickFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
  }

  function removePending(localId: string) {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  }

  async function flushPendingUploads(): Promise<boolean> {
    if (!pendingPhotos.length) return true;
    setUploading(true);
    setStatus({ type: 'success', text: messages.photoUploading });

    const queue = [...pendingPhotos];
    for (const item of queue) {
      const fd = new FormData();
      fd.set('file', item.file);
      const result = await addPhoto(null, fd);
      if (result?.error) {
        setUploading(false);
        setStatus({ type: 'error', text: resolveError(result.error, result.detail) });
        return false;
      }
      URL.revokeObjectURL(item.previewUrl);
      setPendingPhotos((prev) => prev.filter((p) => p.localId !== item.localId));
    }

    setUploading(false);
    return true;
  }

  function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus(null);

    if (totalCount === 0) {
      setStatus({
        type: 'error',
        text: messages.errors.photoRequiredForProfile ?? messages.errors.photoRequired,
      });
      return;
    }

    startSaveTransition(async () => {
      const uploaded = await flushPendingUploads();
      if (!uploaded) {
        router.refresh();
        return;
      }

      const saved = await upsertProfile(null, formData);
      if (saved?.error) {
        setStatus({ type: 'error', text: resolveError(saved.error, saved.detail) });
        router.refresh();
        return;
      }

      clearDatingEditorDraft(draftKey);
      setStatus({ type: 'success', text: messages.successes.profileSaved });
      router.refresh();
    });
  }

  async function onUploadNow() {
    if (!profile) {
      setStatus({
        type: 'error',
        text: messages.errors.profileNotFound,
      });
      return;
    }
    if (!pendingPhotos.length) return;

    const uploaded = await flushPendingUploads();
    if (uploaded) {
      setStatus({ type: 'success', text: messages.successes.photoAdded });
      router.refresh();
    } else {
      router.refresh();
    }
  }

  async function runPhotoAction(
    photoId: string,
    action: (prev: DatingActionState, formData: FormData) => Promise<DatingActionState>,
    successKey: string,
  ) {
    setActingPhotoId(photoId);
    setStatus(null);
    const fd = new FormData();
    fd.set('photoId', photoId);
    const result = await action(null, fd);
    setActingPhotoId(null);
    if (result?.error) {
      setStatus({ type: 'error', text: resolveError(result.error, result.detail) });
      return;
    }
    setStatus({
      type: 'success',
      text: messages.successes[successKey] ?? messages.successes.profileSaved,
    });
    router.refresh();
  }

  async function onVisibility(visible: boolean) {
    setPrivacyAction(visible ? 'show' : 'hide');
    setStatus(null);
    const fd = new FormData();
    fd.set('visible', visible ? '1' : '0');
    const result = await setVisibility(null, fd);
    setPrivacyAction(null);
    if (result?.error) {
      setStatus({ type: 'error', text: resolveError(result.error, result.detail) });
      return;
    }
    setStatus({
      type: 'success',
      text: messages.successes[result?.success ?? ''] ?? messages.successes.profileSaved,
    });
    router.refresh();
  }

  async function onDeleteProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(messages.deleteProfileConfirm)) return;
    setPrivacyAction('delete');
    setStatus(null);
    const result = await deleteProfile(null, new FormData(event.currentTarget));
    setPrivacyAction(null);
    if (result?.error) {
      setStatus({ type: 'error', text: resolveError(result.error, result.detail) });
      return;
    }
    clearDatingEditorDraft(draftKey);
    setStatus({
      type: 'success',
      text: messages.successes.profileDeleted ?? messages.successes.profileSaved,
    });
    router.refresh();
  }

  function toggleInterest(interest: DatingInterest) {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) return prev.filter((item) => item !== interest);
      if (prev.length >= DATING_INTERESTS_MAX) {
        setStatus({
          type: 'error',
          text: messages.interestsMax.replace('{max}', String(DATING_INTERESTS_MAX)),
        });
        return prev;
      }
      return [...prev, interest];
    });
  }

  const countLabel = messages.photoCount
    .replace('{current}', String(totalCount))
    .replace('{max}', String(DATING_MAX_PHOTOS));

  const moderationStatus = profile?.moderationStatus ?? 'active';
  const isBlocked = moderationStatus === 'blocked';
  const isHidden = moderationStatus === 'hidden';
  const isAutoCorrectable = isHidden && isAutoCorrectableDatingRestriction(profile?.moderationReason);
  const isRestricted = isBlocked || (isHidden && !isAutoCorrectable);
  const approvedCount = profile?.photos.filter((photo) => photo.status !== 'pending').length ?? 0;
  const needsPhoto = profile ? approvedCount === 0 : false;
  const needsBio = profile ? profile.bio.trim().length < 10 : false;
  const isPendingCompletion =
    Boolean(profile) &&
    !isRestricted &&
    !profile?.isVisible &&
    (profile?.moderationStatus === 'pending' || isAutoCorrectable || needsPhoto || needsBio);
  const canResume = moderationStatus === 'active' && approvedCount > 0;

  return (
    <div className={`community-settings dating-editor${isBlocked ? ' dating-editor--blocked' : ''}`}>
      {isRestricted ? (
        <div
          className={`dating-restriction-banner${isBlocked ? ' dating-restriction-banner--blocked' : ' dating-restriction-banner--hidden'}`}
          role="alert"
        >
          <p className="dating-restriction-banner__title">
            {messages.restrictionTitle}
            {profile?.moderationReason ? ` ${profile.moderationReason}` : ''}
          </p>
          <p className="dating-restriction-banner__hint">
            {isBlocked ? messages.restrictionBlockedHint : messages.restrictionHiddenHint}
          </p>
          {isHidden ? (
            <p className="dating-restriction-banner__hint dating-restriction-banner__cta">
              {messages.restrictionPhotoHint}
            </p>
          ) : null}
        </div>
      ) : null}

      {isPendingCompletion ? (
        <div className="dating-restriction-banner" role="status">
          <p className="dating-restriction-banner__title">{messages.pendingTitle}</p>
          {needsPhoto ? (
            <p className="dating-restriction-banner__hint">{messages.pendingPhotoReason}</p>
          ) : null}
          {needsBio ? (
            <p className="dating-restriction-banner__hint">{messages.pendingBioReason}</p>
          ) : null}
          <p className="dating-restriction-banner__hint dating-restriction-banner__cta">
            {messages.pendingAutoPublishHint}
          </p>
        </div>
      ) : null}

      <section className="community-settings__section dating-editor__photos-section">
        <div className="dating-editor__photos-head">
          <div>
            <h2>
              {messages.photosTitle}
              <RequiredMark label={messages.required} />
            </h2>
            <p className="community-settings__hint">
              {isRestricted && isHidden ? messages.restrictionPhotoHint : messages.photosLead}
            </p>
          </div>
          <span className="dating-editor__count" aria-live="polite">
            {countLabel}
          </span>
        </div>
        {messages.albumLink && messages.albumLinkHref ? (
          <p className="dating-editor__album-link">
            <Link href={messages.albumLinkHref} className="btn btn--ghost">
              {messages.albumLink}
            </Link>
          </p>
        ) : null}

        <div className="dating-editor__photos">
          {profile?.photos.map((photo, index) => {
            const isPrimary = index === 0;
            const acting = actingPhotoId === photo.id;
            return (
              <article
                key={photo.id}
                className={[
                  'dating-editor__photo',
                  isPrimary ? 'dating-editor__photo--primary' : 'dating-editor__photo--selectable',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role={isPrimary ? undefined : 'button'}
                tabIndex={isPrimary ? undefined : 0}
                onClick={
                  isPrimary || busy
                    ? undefined
                    : () => runPhotoAction(photo.id, setPrimaryPhoto, 'primaryPhotoSet')
                }
                onKeyDown={
                  isPrimary || busy
                    ? undefined
                    : (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          runPhotoAction(photo.id, setPrimaryPhoto, 'primaryPhotoSet');
                        }
                      }
                }
              >
                <img
                  src={resolveMediaSrc(photo.url) || ''}
                  alt=""
                  className="dating-editor__photo-img"
                  loading="lazy"
                />
                {isPrimary ? (
                  <span className="dating-editor__badge">{messages.photoPrimaryBadge}</span>
                ) : (
                  <span className="dating-editor__set-primary">
                    {acting ? '...' : messages.photoSetPrimary}
                  </span>
                )}
                <button
                  type="button"
                  className="dating-editor__remove"
                  disabled={busy}
                  aria-label={messages.photoRemove}
                  onClick={(event) => {
                    event.stopPropagation();
                    runPhotoAction(photo.id, removePhoto, 'photoRemoved');
                  }}
                >
                  {acting ? '…' : '×'}
                </button>
              </article>
            );
          })}

          {pendingPhotos.map((photo, index) => {
            const wouldBePrimary = savedCount === 0 && index === 0;
            return (
              <article
                key={photo.localId}
                className={[
                  'dating-editor__photo',
                  'dating-editor__photo--pending',
                  wouldBePrimary ? 'dating-editor__photo--primary' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <img src={photo.previewUrl} alt="" className="dating-editor__photo-img" />
                <span className="dating-editor__badge dating-editor__badge--pending">
                  {wouldBePrimary ? messages.photoPrimaryBadge : messages.photoPending}
                </span>
                <button
                  type="button"
                  className="dating-editor__remove"
                  disabled={busy}
                  aria-label={messages.photoRemove}
                  onClick={() => removePending(photo.localId)}
                >
                  ×
                </button>
              </article>
            );
          })}

          {slotsLeft > 0 && !isBlocked && (
            <label className="dating-editor__add" htmlFor={fileInputId}>
              <span className="dating-editor__add-plus" aria-hidden>
                +
              </span>
              <span className="dating-editor__add-label">{messages.photoAddMore}</span>
              <span className="dating-editor__add-meta">
                {slotsLeft}/{DATING_MAX_PHOTOS}
              </span>
            </label>
          )}
        </div>

        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept={ACCEPT}
          multiple
          className="dating-editor__file-input"
          disabled={busy || slotsLeft <= 0 || isBlocked}
          onChange={onPickFiles}
        />

        <p className="community-settings__hint">{messages.photoUploadHint}</p>

        {profile && pendingPhotos.length > 0 && (
          <button
            type="button"
            className="btn btn--primary dating-editor__upload-now"
            disabled={busy}
            onClick={onUploadNow}
          >
            {uploading ? messages.photoUploading : messages.photoUpload}
          </button>
        )}

        {status && (
          <p
            className={
              status.type === 'error' ? 'community-form__error' : 'community-form__success'
            }
          >
            {status.text}
          </p>
        )}
      </section>

      <fieldset className="dating-editor__fieldset" disabled={isBlocked}>
      <section className="community-settings__section dating-editor__form-section">
        <div className="dating-completeness" aria-live="polite">
          <div className="dating-completeness__bar" style={{ width: `${completenessPct}%` }} />
          <p className="dating-completeness__label">
            {messages.completeness.replace('{n}', String(completenessPct))}
          </p>
        </div>
        <form
          id={formId}
          onSubmit={onSaveProfile}
          className="community-form community-form--compact dating-editor__form"
        >
          <details className="dating-attr-section" open>
            <summary className="dating-attr-section__summary">
              {messages.editorSections.basics}
            </summary>
            <div className="dating-attr-section__body">
          <label>
            <span>
              {messages.name}
              <RequiredMark label={messages.required} />
            </span>
            <input
              type="text"
              name="name"
              maxLength={50}
              required
              value={formValues.name}
              onChange={(e) => patchForm('name', e.target.value)}
              placeholder={messages.namePlaceholder}
            />
          </label>
          <label>
            {messages.age}
            <input
              type="number"
              name="age"
              min={18}
              max={99}
              value={formValues.age}
              onChange={(e) => patchForm('age', e.target.value)}
              placeholder={messages.agePlaceholder}
            />
          </label>
          <label>
            <span>
              {messages.city}
              <RequiredMark label={messages.required} />
            </span>
            <select
              name="city"
              value={formValues.city}
              onChange={(e) => patchForm('city', e.target.value)}
              required
            >
              {DATING_CITIES.map((city) => (
                <option key={city} value={city}>
                  {messages.cityLabels[city]}
                </option>
              ))}
            </select>
          </label>
          <p className="community-settings__hint">{messages.cityHint}</p>
          <label>
            <span>
              {messages.gender}
              <RequiredMark label={messages.required} />
            </span>
            <select
              name="genderBucket"
              value={formValues.genderBucket}
              onChange={(e) => patchForm('genderBucket', e.target.value)}
              required
            >
              <option value="">—</option>
              {DATING_GENDER_BUCKETS.map((bucket) => (
                <option key={bucket} value={bucket}>
                  {messages.genderLabels[bucket]}
                </option>
              ))}
            </select>
          </label>
          <p className="community-settings__hint">{messages.genderHint}</p>
          <label>
            <span>
              {messages.showMe}
              <RequiredMark label={messages.required} />
            </span>
            <select
              name="showMe"
              value={formValues.showMe}
              onChange={(e) => patchForm('showMe', e.target.value)}
              required
            >
              {DATING_SHOW_ME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {messages.showMeLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <p className="community-settings__hint">{messages.showMeHint}</p>
          <label>
            <span>
              {messages.bio}
              <RequiredMark label={messages.required} />
            </span>
            <textarea
              name="bio"
              rows={4}
              maxLength={300}
              value={formValues.bio}
              onChange={(e) => patchForm('bio', e.target.value)}
              placeholder={messages.bioPlaceholder}
            />
          </label>
          <p className="community-settings__hint">{messages.bioHint}</p>

          <label>
            {messages.height}
            <input
              type="number"
              name="height"
              min={100}
              max={250}
              value={formValues.height}
              onChange={(e) => patchForm('height', e.target.value)}
              placeholder={messages.heightPlaceholder}
            />
          </label>

          <label>
            {messages.zodiacSign}
            <select
              name="zodiacSign"
              value={formValues.zodiacSign}
              onChange={(e) => patchForm('zodiacSign', e.target.value)}
            >
              <option value="">-</option>
              {getZodiacSigns().map((sign) => (
                <option key={sign.id} value={sign.id}>
                  {getZodiacSignName(sign, locale)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {messages.lookingFor}
            <select
              name="lookingFor"
              value={formValues.lookingFor}
              onChange={(e) => patchForm('lookingFor', e.target.value)}
            >
              <option value="">-</option>
              {DATING_LOOKING_FOR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {messages.lookingForLabels[option]}
                </option>
              ))}
            </select>
          </label>

          <div className="dating-interests">
            <div className="dating-interests__head">
              <span className="dating-interests__title">{messages.interests}</span>
              <span className="dating-interests__count">
                {selectedInterests.length}/{DATING_INTERESTS_MAX}
              </span>
            </div>
            <p className="community-settings__hint">{messages.interestsHint}</p>
            <input type="hidden" name="interests" value={selectedInterests.join(',')} />

            {selectedInterests.length > 0 ? (
              <div className="dating-interests__selected" aria-live="polite">
                {selectedInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className="dating-interest-chip is-selected"
                    onClick={() => toggleInterest(interest)}
                  >
                    {messages.interestLabels[interest]}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              className={`dating-interests__toggle${interestsOpen ? ' is-open' : ''}`}
              aria-expanded={interestsOpen}
              onClick={() => setInterestsOpen((open) => !open)}
            >
              {interestsOpen ? messages.interestsCollapse : messages.interestsAdd}
              <span className="dating-interests__chevron" aria-hidden>
                {interestsOpen ? '▴' : '▾'}
              </span>
            </button>

            {interestsOpen ? (
              <div className="dating-interests__options">
                {DATING_INTERESTS.map((interest) => {
                  const selected = selectedInterests.includes(interest);
                  const atMax = !selected && selectedInterests.length >= DATING_INTERESTS_MAX;
                  return (
                    <button
                      key={interest}
                      type="button"
                      className={`dating-interest-chip${selected ? ' is-selected' : ''}`}
                      disabled={atMax}
                      onClick={() => toggleInterest(interest)}
                    >
                      {messages.interestLabels[interest]}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
            </div>
          </details>

          <DatingAttributeSections
            values={attrValues}
            presetCase={profile?.presetCase}
            openSection={attrSection}
            onToggleSection={(id) => setAttrSection(id || null)}
            onChange={(patch) => setAttrValues((prev) => ({ ...prev, ...patch }))}
            messages={{
              sections: messages.editorSections,
              fields: messages.attributeFields,
              labels: messages.attributeLabels,
            }}
          />
        </form>
      </section>
      </fieldset>

      <div className="dating-editor__footer">
        <Link href={backHref} className="btn btn--ghost dating-editor__footer-back">
          {messages.back}
        </Link>
        <button
          type="submit"
          form={formId}
          className="btn btn--primary dating-editor__footer-save"
          disabled={busy || isBlocked}
        >
          {saving || uploading ? '...' : messages.save}
        </button>
      </div>

      {profile ? (
        <section className="privacy-controls" aria-label={messages.visibilityTitle}>
          <div className="privacy-controls__section">
            <h2>{messages.visibilityTitle}</h2>
            <p className="community-settings__hint">{messages.visibilityHint}</p>
            {profile.isVisible ? (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={busy}
                onClick={() => onVisibility(false)}
              >
                {privacyAction === 'hide' ? '...' : messages.visibilityPause}
              </button>
            ) : canResume ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={() => onVisibility(true)}
              >
                {privacyAction === 'show' ? '...' : messages.visibilityResume}
              </button>
            ) : (
              <p className="community-settings__hint">{messages.visibilityUnavailable}</p>
            )}
          </div>

          <div className="privacy-controls__section privacy-controls__section--danger">
            <h2>{messages.deleteProfileTitle}</h2>
            <p className="community-settings__hint">{messages.deleteProfileLead}</p>
            <form onSubmit={onDeleteProfile} className="community-form community-form--compact">
              <label>
                {messages.deleteProfileUsername}
                <input
                  name="confirmUsername"
                  required
                  autoComplete="off"
                  placeholder={profile.username}
                  spellCheck={false}
                />
              </label>
              <button type="submit" className="btn btn--danger" disabled={busy}>
                {privacyAction === 'delete' ? '...' : messages.deleteProfileSubmit}
              </button>
            </form>
          </div>
          {status ? (
            <p className={status.type === 'error' ? 'community-form__error' : 'community-form__success'}>
              {status.text}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
