/**
 * Restrict text input to numbers only.
 * Use in onChangeText so only numeric input is accepted.
 */

/** Allow only digits 0-9 (integer). */
export function allowIntegerOnly(text: string | undefined): string {
  if (text == null || typeof text !== "string") return "";
  return text.replace(/[^0-9]/g, "");
}

/** Allow only digits and at most one decimal point (e.g. for price). */
export function allowDecimalOnly(text: string | undefined): string {
  if (text == null || typeof text !== "string") return "";
  const stripped = text.replace(/[^0-9.]/g, "");
  const parts = stripped.split(".");
  if (parts.length <= 1) return stripped;
  const decimalPart = (parts[1] ?? "").replace(/[^0-9]/g, "");
  return parts[0] + "." + decimalPart;
}
