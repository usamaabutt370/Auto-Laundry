/** Default Wash & Fold garment/package keys — labels live in partner.onboarding locales. */
export const PARTNER_WASH_FOLD_GARMENT_KEYS = [
  "washFoldItemShirt",
  "washFoldItemTshirt",
  "washFoldItemTrouser",
  "washFoldItemShalwar",
  "washFoldItemKameez",
  "washFoldItemDupatta",
  "washFoldItemBedsheet",
  "washFoldItemTowel",
  "washFoldItemSocks",
  "washFoldItemUndergarment",
] as const;

export const PARTNER_WASH_FOLD_PACKAGE_KEYS = [
  "washFoldPkg25",
  "washFoldPkg50",
  "washFoldPkg75",
  "washFoldPkg100",
] as const;

export const PARTNER_WASH_FOLD_ITEM_KEYS = [
  ...PARTNER_WASH_FOLD_GARMENT_KEYS,
  ...PARTNER_WASH_FOLD_PACKAGE_KEYS,
] as const;

/** Legacy partner pricing rows — no longer shown in onboarding UI. */
const PACKAGE_ID_SET = new Set<string>(PARTNER_WASH_FOLD_PACKAGE_KEYS);

export function isWashFoldPackageItemId(id: string): boolean {
  return PACKAGE_ID_SET.has(id) || id.startsWith("custom_pkg_");
}

/** Partner-added package (not a default 25/50/75/100 catalog row). */
export function isWashFoldCustomPackageId(id: string): boolean {
  return id.startsWith("custom_pkg_");
}

/** Match DB-backed rows and custom names (e.g. "50 pcs package"). */
export function isWashFoldPackageLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  return (
    /\d+\s*(pcs\s+package|piece\s+package)/i.test(t) ||
    /\d+\s*عدد\s+پیکج/.test(t) ||
    (/\bpackage\b/i.test(t) && /\d+/.test(t))
  );
}

export function isWashFoldPackageItem(item: { id: string; label: string }): boolean {
  return isWashFoldPackageItemId(item.id) || isWashFoldPackageLabel(item.label);
}

const PACKAGE_DESC_KEY_BY_ID: Record<string, string> = {
  washFoldPkg25: "washFoldPkg25Desc",
  washFoldPkg50: "washFoldPkg50Desc",
  washFoldPkg75: "washFoldPkg75Desc",
  washFoldPkg100: "washFoldPkg100Desc",
};

/** Locale key for package box description (partner.onboarding). */
export function washFoldPackageDescriptionKey(item: { id: string }): string {
  return PACKAGE_DESC_KEY_BY_ID[item.id] ?? "washFoldPackageBoxCustomDesc";
}

export type WashFoldPackageCatalogKey = (typeof PARTNER_WASH_FOLD_PACKAGE_KEYS)[number];

/** Map saved row to catalog key (id, label number, or label text). */
export function resolveWashFoldPackageCatalogKey(item: {
  id: string;
  label: string;
}): WashFoldPackageCatalogKey | null {
  if (item.id in PACKAGE_DESC_KEY_BY_ID) {
    return item.id as WashFoldPackageCatalogKey;
  }

  const countMatch = item.label.match(/\b(25|50|75|100)\b/);
  if (countMatch) {
    const key = `washFoldPkg${countMatch[1]}` as WashFoldPackageCatalogKey;
    if (PARTNER_WASH_FOLD_PACKAGE_KEYS.includes(key)) return key;
  }

  const norm = (s: string) => s.trim().toLowerCase();
  const itemNorm = norm(item.label);
  for (const key of PARTNER_WASH_FOLD_PACKAGE_KEYS) {
    if (itemNorm.includes(key.replace("washFoldPkg", ""))) return key;
  }

  return null;
}

export function getWashFoldPackageDescription(
  item: { id: string; label: string },
  descriptions: Record<WashFoldPackageCatalogKey, string>,
  fallback: string,
): string {
  const catalogKey = resolveWashFoldPackageCatalogKey(item);
  if (catalogKey && descriptions[catalogKey]?.trim()) {
    return descriptions[catalogKey];
  }
  return fallback;
}

export type WashFoldCatalogRow = { id: string; label: string };

/** Ensure default garments + packages exist (keeps custom rows and saved prices). */
export function mergeWashFoldCatalog(
  existingItems: WashFoldCatalogRow[],
  existingPrices: Record<string, string>,
  getLabel: (key: string) => string,
): { items: WashFoldCatalogRow[]; prices: Record<string, string> } {
  const items = [...existingItems];
  const prices = { ...existingPrices };

  const norm = (s: string) => s.trim().toLowerCase();

  const ensureDefault = (key: string) => {
    const label = getLabel(key);
    const n = norm(label);
    const foundIndex = items.findIndex(
      (row) => row.id === key || norm(row.label) === n,
    );
    if (foundIndex < 0) {
      items.push({ id: key, label });
      if (prices[key] === undefined) prices[key] = "";
      return;
    }
    const found = items[foundIndex];
    if (found.id !== key) {
      const prevPrice = prices[found.id];
      items[foundIndex] = { id: key, label };
      if (prevPrice !== undefined) {
        prices[key] = prevPrice;
        delete prices[found.id];
      } else if (prices[key] === undefined) {
        prices[key] = "";
      }
      return;
    }
    if (prices[found.id] === undefined) prices[found.id] = "";
  };

  for (const key of PARTNER_WASH_FOLD_GARMENT_KEYS) ensureDefault(key);
  for (const key of PARTNER_WASH_FOLD_PACKAGE_KEYS) ensureDefault(key);

  return { items, prices };
}

export const LEGACY_WASH_FOLD_PRICE_LABELS = new Set([
  "Price per Bag",
  "Price per Kg",
  "Price per Item",
  "فی بستہ قیمت",
  "فی KG قیمت",
  "فی آئٹم قیمت",
]);
