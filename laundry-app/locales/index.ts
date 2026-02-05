import type { en } from './en';

import { en as enStrings } from './en';
import { ur as urStrings } from './ur';

/** Supported locale codes. */
export type LocaleCode = 'en' | 'ur';

/** Shape of locale strings (use English as the source of truth). */
export type StringsType = typeof en;

const locales: Record<LocaleCode, StringsType> = {
  en: enStrings,
  ur: urStrings,
};

/** Default locale when none is set. */
export const DEFAULT_LOCALE: LocaleCode = 'en';

/** Get strings for a locale. Falls back to English if locale is missing. */
export function getStrings(locale: LocaleCode = DEFAULT_LOCALE): StringsType {
  return locales[locale] ?? locales.en;
}

/** List of supported locale codes (for language picker, etc.). */
export const SUPPORTED_LOCALES: LocaleCode[] = ['en', 'ur'];
