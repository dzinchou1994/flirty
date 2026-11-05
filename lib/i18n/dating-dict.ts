import ka from './dating/ka';
import en from './dating/en';
import type { Locale } from './types';

export type DatingDict = typeof ka;

export function getDatingDict(locale: Locale): DatingDict {
  if (locale === 'en') return en as unknown as DatingDict;
  return ka;
}
