/**
 * Prompt library.
 *
 * The question lives here, keyed; only the answer is stored per profile. That
 * keeps questions translatable and editable without migrating user data, and
 * stops people inventing their own question text.
 *
 * Editing a question's wording is safe. Removing a key is not: existing
 * answers would lose their question. Retire by moving the key to RETIRED.
 */

export const DATING_PROMPT_KEYS = [
  'perfect_sunday',
  'hidden_spot',
  'ask_me_about',
  'never_give_up',
  'made_me_laugh',
  'lets_go_together',
  'unusual_about_me',
  'looking_for_someone',
  'unpopular_opinion',
  'grateful_for',
  'saturday_evening',
  'two_truths',
] as const;

export type DatingPromptKey = (typeof DATING_PROMPT_KEYS)[number];

/** Keys no longer offered to new profiles but still rendered if answered. */
export const RETIRED_PROMPT_KEYS: string[] = [];

export const MAX_PROMPT_ANSWERS = 3;
export const MIN_PROMPT_ANSWERS = 1;
export const PROMPT_ANSWER_MAX_LEN = 220;

export function isDatingPromptKey(value: string): value is DatingPromptKey {
  return (DATING_PROMPT_KEYS as readonly string[]).includes(value);
}

/** Known key — including retired ones — so stored answers always render. */
export function isKnownPromptKey(value: string): boolean {
  return isDatingPromptKey(value) || RETIRED_PROMPT_KEYS.includes(value);
}
