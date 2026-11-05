export type AvatarGender = 'male' | 'female' | 'nonBinary';
export function parseAvatarGender(raw: string | null | undefined): AvatarGender | null {
  if (raw === 'male' || raw === 'female' || raw === 'nonBinary') return raw;
  return null;
}
