import 'server-only';

import crypto from 'crypto';

function pepper(): string {
  return process.env.CONTACT_HASH_PEPPER || 'dev-contact-pepper';
}

/** Normalise to a simple E.164-ish form for GE-centric numbers. */
export function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  if (digits.startsWith('0') && !digits.startsWith('00')) {
    digits = `+995${digits.slice(1)}`;
  }
  if (!digits.startsWith('+')) {
    if (digits.length === 9) digits = `+995${digits}`;
    else digits = `+${digits}`;
  }
  const only = digits.replace(/[^\d+]/g, '');
  if (only.length < 8 || only.length > 16) return null;
  return only;
}

export function hashPhone(raw: string): string | null {
  const e164 = normalisePhone(raw);
  if (!e164) return null;
  return crypto.createHmac('sha256', pepper()).update(e164).digest('hex');
}
