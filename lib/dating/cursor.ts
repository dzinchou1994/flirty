export function encodeCursor(parts: Record<string, string>): string {
  return Buffer.from(JSON.stringify(parts), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | null | undefined): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Record<
      string,
      string
    >;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
