import { parsePhoneNumberFromString } from "libphonenumber-js";

const AUTH_EMAIL_DOMAIN = "autolaundry.app";

/** E.164 phone from country calling code + national digits (no leading 0). */
export function normalizePhoneE164(
  callingCode: string,
  nationalDigits: string,
): string {
  const phoneNumber = parsePhoneNumberFromString(`+${callingCode}${nationalDigits}`);
  return phoneNumber ? phoneNumber.number : `+${callingCode}${nationalDigits}`;
}

/** Auth email used at sign-up; must match signInWithPassword, not profiles.email. */
export function phoneToAuthEmail(normalizedPhoneE164: string): string {
  return `${normalizedPhoneE164.replace(/\D/g, "")}@${AUTH_EMAIL_DOMAIN}`;
}
