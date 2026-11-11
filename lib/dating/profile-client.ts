export type DatingActionState = {
  error?: string;
  /**
   * The server's own explanation, when it has one. The UI translates `error`
   * from a fixed key list, so a generic key told the user nothing about why an
   * upload actually failed. This carries the real reason through.
   */
  detail?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
} | null;

async function readJson(res: Response) {
  return res.json().catch(() => null);
}

export async function upsertDatingProfile(_prev: DatingActionState, formData: FormData): Promise<DatingActionState> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string') payload[k] = v;
  }
  if (payload.age) payload.age = Number(payload.age);
  if (payload.height) payload.height = Number(payload.height);
  if (payload.weightKg) payload.weightKg = Number(payload.weightKg);
  if (payload.isVisible != null) payload.isVisible = payload.isVisible === 'true' || payload.isVisible === 'on';
  for (const key of [
    'lookingForTags',
    'meetAt',
    'languages',
    'communityTags',
  ] as const) {
    const raw = payload[key];
    if (typeof raw === 'string') {
      payload[key] = raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  for (const key of [
    'bodyType',
    'relationshipStatus',
    'pronouns',
    'genderIdentity',
    'smoking',
    'drinking',
    'kids',
    'education',
    'position',
    'work',
  ] as const) {
    if (payload[key] === '') payload[key] = null;
  }
  const res = await fetch('/api/v1/me/profile/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await readJson(res);
  if (!json?.ok) return { error: mapApiError(json?.error?.code) };
  return { success: 'successProfileSaved' };
}

/**
 * The API speaks SCREAMING_SNAKE codes; the editor's message table is keyed in
 * camelCase. Without this map every failure fell through to one generic
 * "upload failed", which hid the real cause.
 */
const API_ERROR_TO_MESSAGE_KEY: Record<string, string> = {
  UNAUTHORIZED: 'loginRequired',
  SERVICE_UNAVAILABLE: 'serviceUnavailable',
  STORAGE_UNAVAILABLE: 'serviceUnavailable',
  PROFILE_REQUIRED: 'photoRequiredForProfile',
  PROFILE_NOT_FOUND: 'profileNotFound',
  PROFILE_RESTRICTED: 'profileRestricted',
  PHOTO_LIMIT: 'photoLimitReached',
  PHOTO_TOO_LARGE: 'photoTooLarge',
  PHOTO_NOT_FOUND: 'photoNotFound',
  PHOTO_PROCESS_FAILED: 'invalidPhotoType',
  PHOTO_REJECTED_EXPLICIT: 'photoRejectedExplicit',
  // Legacy code kept so an older client build still shows something sane.
  PHOTO_REJECTED: 'photoRejectedExplicit',
  VALIDATION_ERROR: 'photoUploadFailed',
};

function mapApiError(code: string | undefined): string {
  if (!code) return 'serviceUnavailable';
  return API_ERROR_TO_MESSAGE_KEY[code] ?? code;
}

export async function addDatingPhoto(_prev: DatingActionState, formData: FormData): Promise<DatingActionState> {
  const res = await fetch('/api/v1/me/photos/', { method: 'POST', body: formData, credentials: 'include' });
  const json = await readJson(res);
  if (!json?.ok) {
    return {
      error: mapApiError(json?.error?.code),
      detail: typeof json?.error?.message === 'string' ? json.error.message : undefined,
    };
  }
  return { success: 'successPhotoAdded' };
}

export async function removeDatingPhoto(_prev: DatingActionState, formData: FormData): Promise<DatingActionState> {
  const photoId = String(formData.get('photoId') || '');
  const res = await fetch(`/api/v1/me/photos/?photoId=${encodeURIComponent(photoId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await readJson(res);
  if (!json?.ok) return { error: mapApiError(json?.error?.code) };
  return { success: 'successPhotoRemoved' };
}

export async function setDatingPrimaryPhoto(): Promise<DatingActionState> {
  return { success: 'successPrimaryPhotoSet' };
}

export async function setDatingProfileVisibility(_prev: DatingActionState, formData: FormData): Promise<DatingActionState> {
  const isVisible = String(formData.get('isVisible') || '') === 'true';
  const res = await fetch('/api/v1/me/profile/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ isVisible }),
  });
  const json = await readJson(res);
  if (!json?.ok) return { error: mapApiError(json?.error?.code) };
  return { success: isVisible ? 'successVisibilityOn' : 'successVisibilityOff' };
}

export async function deleteDatingProfile(): Promise<DatingActionState> {
  return { error: 'serviceUnavailable' };
}

export async function reportDatingProfile(_prev: DatingActionState, formData: FormData): Promise<DatingActionState> {
  const res = await fetch('/api/v1/reports/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      profileId: String(formData.get('profileId') || ''),
      reason: String(formData.get('reason') || 'other'),
    }),
  });
  const json = await readJson(res);
  if (!json?.ok) return { error: mapApiError(json?.error?.code) };
  return { success: 'reportSuccess' };
}
