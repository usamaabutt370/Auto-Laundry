/**
 * Centralized user-facing strings.
 * Import from here instead of hardcoding text in screens.
 * Strings are loaded from locales (en, ur, etc.); default is English.
 * When adding a language selector, use getStrings(locale) from @/locales with the user’s chosen locale.
 */
import { DEFAULT_LOCALE, getStrings, type LocaleCode, type StringsType } from '@/locales';

/** Current strings (default locale). Use this in components. */
export const strings = getStrings(DEFAULT_LOCALE);

export type Strings = StringsType;

/** Get strings for a specific locale (e.g. for language picker or RTL). */
export { getStrings, type LocaleCode };
