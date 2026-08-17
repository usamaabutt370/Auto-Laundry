/** Tailoring catalog — labels live in partner.onboarding locales. */

export const TAILORING_ITEM_SHALWAR_KAMEEZ_ID =
  "tailoringItemShalwarKameez" as const;
export const TAILORING_ITEM_GHARARA_KAMEEZ_ID =
  "tailoringItemGhararaKameez" as const;
export const TAILORING_ITEM_KURTA_PALAZZO_ID =
  "tailoringItemKurtaPalazzo" as const;
export const TAILORING_ITEM_ANARKALI_CHURIDAR_ID =
  "tailoringItemAnarkaliChuridar" as const;
export const TAILORING_ITEM_LEHENGA_KURTI_ID =
  "tailoringItemLehengaKurti" as const;
export const TAILORING_ITEM_PISHWAS_DUPATTA_ID =
  "tailoringItemPishwasDupatta" as const;
export const TAILORING_ITEM_MAXI_DUPATTA_ID =
  "tailoringItemMaxiDupatta" as const;
export const TAILORING_ITEM_SHIRT_PANT_ID = "tailoringItemShirtPant" as const;

export const LADIES_TAILORING_ITEM_IDS = new Set<string>([
  TAILORING_ITEM_GHARARA_KAMEEZ_ID,
  TAILORING_ITEM_KURTA_PALAZZO_ID,
  TAILORING_ITEM_ANARKALI_CHURIDAR_ID,
  TAILORING_ITEM_LEHENGA_KURTI_ID,
  TAILORING_ITEM_PISHWAS_DUPATTA_ID,
  TAILORING_ITEM_MAXI_DUPATTA_ID,
]);

export function isLadiesTailoringItem(id: string): boolean {
  return LADIES_TAILORING_ITEM_IDS.has(id);
}

export const PARTNER_TAILORING_ITEM_KEYS = [
  TAILORING_ITEM_SHALWAR_KAMEEZ_ID,
  TAILORING_ITEM_SHIRT_PANT_ID,
  TAILORING_ITEM_GHARARA_KAMEEZ_ID,
  TAILORING_ITEM_KURTA_PALAZZO_ID,
  TAILORING_ITEM_ANARKALI_CHURIDAR_ID,
  TAILORING_ITEM_LEHENGA_KURTI_ID,
  TAILORING_ITEM_PISHWAS_DUPATTA_ID,
  TAILORING_ITEM_MAXI_DUPATTA_ID,
] as const;

/** Former separate rows — filtered from saved/DB lists. */
export const DROPPED_TAILORING_ITEM_KEYS = [
  "pants",
  "shirt",
  "suit",
  "dress",
  "tailoringItemPants",
  "tailoringItemShirt",
  "tailoringItemSuit",
  "tailoringItemDress",
  "tailoringItemSuitShirtPant",
] as const;

export const DROPPED_TAILORING_ITEM_LABELS = new Set(
  [
    "Pants",
    "Shirt",
    "Suit",
    "Dress",
    "Suit, Shirt and Pant",
    "پینٹ",
    "قمیض",
    "سوٹ",
    "ڈریس",
    "سوٹ، شرٹ اور پینٹ",
  ].map((s) => s.trim().toLowerCase()),
);

export function isDroppedTailoringItemId(id: string): boolean {
  return (DROPPED_TAILORING_ITEM_KEYS as readonly string[]).includes(id);
}

export function isDroppedTailoringItemLabel(label: string): boolean {
  return DROPPED_TAILORING_ITEM_LABELS.has(label.trim().toLowerCase());
}

/** Default English names — must match partner `Tailoring - {label}` (en onboarding). */
export const TAILORING_LABEL_BY_KEY: Record<string, string> = {
  [TAILORING_ITEM_SHALWAR_KAMEEZ_ID]: "Shalwar & Kameez",
  [TAILORING_ITEM_GHARARA_KAMEEZ_ID]: "Gharara & Kameez",
  [TAILORING_ITEM_KURTA_PALAZZO_ID]: "Kurta & Palazzo",
  [TAILORING_ITEM_ANARKALI_CHURIDAR_ID]: "Anarkali & Churidar",
  [TAILORING_ITEM_LEHENGA_KURTI_ID]: "Lehenga & Kurti",
  [TAILORING_ITEM_PISHWAS_DUPATTA_ID]: "Pishwas & Dupatta",
  [TAILORING_ITEM_MAXI_DUPATTA_ID]: "Maxi & Dupatta",
  [TAILORING_ITEM_SHIRT_PANT_ID]: "Shirt & Pant",
};

export const TAILORING_ITEM_DEFS: { id: string; name: string }[] =
  PARTNER_TAILORING_ITEM_KEYS.map((id) => ({
    id,
    name: TAILORING_LABEL_BY_KEY[id] ?? id,
  }));

export function initialTailoringQuantities(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const d of TAILORING_ITEM_DEFS) {
    o[d.id] = 0;
  }
  return o;
}

export type TailoringCatalogRow = { id: string; label: string };

/** Ensure new defaults; drop legacy rows; migrate old dress/shirt/pant prices when possible. */
export function mergeTailoringCatalog(
  existingItems: TailoringCatalogRow[],
  existingPrices: Record<string, string>,
  getLabel: (key: string) => string,
): { items: TailoringCatalogRow[]; prices: Record<string, string> } {
  const prices = { ...existingPrices };
  const items: TailoringCatalogRow[] = [];
  const norm = (s: string) => s.trim().toLowerCase();

  let legacyDressPrice = "";
  let legacyShirtPantPrice = "";

  for (const row of existingItems) {
    if (row.id === "tailoringItemSuitShirtPant") {
      const price = prices[row.id]?.trim() ?? "";
      if (price) legacyShirtPantPrice = price;
      delete prices[row.id];
      continue;
    }

    if (isDroppedTailoringItemId(row.id) || isDroppedTailoringItemLabel(row.label)) {
      const price = prices[row.id]?.trim() ?? "";
      if (row.id === "dress" || row.id === "tailoringItemDress") {
        if (price) legacyDressPrice = price;
      } else if (
        row.id === "pants" ||
        row.id === "shirt" ||
        row.id === "tailoringItemPants" ||
        row.id === "tailoringItemShirt"
      ) {
        if (price && !legacyShirtPantPrice) legacyShirtPantPrice = price;
      }
      delete prices[row.id];
      continue;
    }
    items.push(row);
  }

  const ensureDefault = (key: string) => {
    const label = getLabel(key);
    const n = norm(label);
    const nAnd = n.replace(/ & /g, " and ");
    const nAmp = n.replace(/ and /g, " & ");
    const foundIndex = items.findIndex(
      (row) =>
        row.id === key ||
        norm(row.label) === n ||
        norm(row.label) === nAnd ||
        norm(row.label) === nAmp,
    );
    if (foundIndex < 0) {
      items.push({ id: key, label });
      if (prices[key] === undefined) prices[key] = "";
      return;
    }
    const found = items[foundIndex];
    if (found.id !== key || found.label !== label) {
      const prevPrice = prices[found.id];
      items[foundIndex] = { id: key, label };
      if (prevPrice !== undefined) {
        prices[key] = prevPrice;
        if (found.id !== key) delete prices[found.id];
      } else if (prices[key] === undefined) {
        prices[key] = "";
      }
      return;
    }
    if (prices[found.id] === undefined) prices[found.id] = "";
  };

  for (const key of PARTNER_TAILORING_ITEM_KEYS) ensureDefault(key);

  if (!(prices[TAILORING_ITEM_SHALWAR_KAMEEZ_ID]?.trim() ?? "") && legacyDressPrice) {
    prices[TAILORING_ITEM_SHALWAR_KAMEEZ_ID] = legacyDressPrice;
  }
  if (!(prices[TAILORING_ITEM_SHIRT_PANT_ID]?.trim() ?? "") && legacyShirtPantPrice) {
    prices[TAILORING_ITEM_SHIRT_PANT_ID] = legacyShirtPantPrice;
  }

  const seen = new Set<string>();
  const deduped: TailoringCatalogRow[] = [];
  for (const row of items) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push(row);
  }

  const catalogOrder = new Map(
    PARTNER_TAILORING_ITEM_KEYS.map((key, index) => [key, index]),
  );
  deduped.sort((a, b) => {
    const aIndex = catalogOrder.get(a.id) ?? 1000;
    const bIndex = catalogOrder.get(b.id) ?? 1000;
    return aIndex - bIndex;
  });

  return { items: deduped, prices };
}
