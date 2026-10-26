/** Convert ISO 3166-1 alpha-2 country code to a flag emoji (e.g. PK → 🇵🇰). */
export function flagEmojiFromCca2(cca2: string): string {
  const code = cca2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)),
  );
}
