export const AUTO_NO_FACE_REASON =
  'ნამდვილი ადამიანის სახე ვერ მოიძებნა. ატვირთე მკაფიო ფოტო, რომელშიც შენი სახე ჩანს.';

export const AUTO_SHORT_BIO_REASON =
  'აღწერა უნდა იყოს მინიმუმ 10 სიმბოლო.';

const LEGACY_PHOTO_REASON = 'შეუსაბამო ფოტოები';

export function isAutoCorrectableDatingRestriction(reason: string | null | undefined): boolean {
  const value = reason?.trim();
  return (
    value === AUTO_NO_FACE_REASON ||
    value === AUTO_SHORT_BIO_REASON ||
    value === LEGACY_PHOTO_REASON
  );
}
