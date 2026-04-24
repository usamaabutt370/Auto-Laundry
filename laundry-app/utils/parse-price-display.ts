export function parsePriceDisplay(display: string): number | null {
  const normalized = display.replace(/,/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function currencyPrefixFromDisplay(display: string): string {
  const t = display.trim();
  if (/^pkr/i.test(t) || /rs\.?/i.test(t)) return "PKR ";
  if (t.startsWith("$")) return "Rs ";
  if (t.startsWith("€")) return "€";
  if (t.startsWith("£")) return "£";
  return "";
}
