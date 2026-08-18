/** Dry Cleaning catalog — labels live in partner.onboarding locales. */

export type DryCleanItemKind = "garment" | "suitPackage";

export type DryCleanItemDef = {
  id: string;
  name: string;
  kind: DryCleanItemKind;
  /** Piece list shown when the customer selects a suit package. */
  packageIncludes?: readonly string[];
};

export const DRY_CLEAN_SUIT_2_PIECE_ID = "dryCleaningItemSuit2Piece" as const;
export const DRY_CLEAN_SUIT_3_PIECE_ID = "dryCleaningItemSuit3Piece" as const;

export const DRY_CLEAN_SUIT_PACKAGE_IDS = [
  DRY_CLEAN_SUIT_2_PIECE_ID,
  DRY_CLEAN_SUIT_3_PIECE_ID,
] as const;

export function isDryCleanSuitPackageId(id: string): boolean {
  return (DRY_CLEAN_SUIT_PACKAGE_IDS as readonly string[]).includes(id);
}

/** Former catalog rows — hidden from partner/customer lists. */
export const LEGACY_DRY_CLEAN_ITEM_KEYS = [
  "dryCleaningItemSuit",
  "dryCleaningItemDress",
  "dryCleaningItemTie",
  "dryCleaningItemShirt",
  "dryCleaningItemPants",
] as const;

export const LEGACY_DRY_CLEAN_ITEM_LABELS = new Set(
  [
    "Suit",
    "سوٹ",
    "Dress",
    "ڈریس",
    "Tie",
    "ٹائی",
    "Shirt",
    "Pants",
    "قمیض",
    "پینٹ",
    // previous long suit titles (standalone rows)
    "2-piece Suit + Shirt + Tie",
    "3-piece Suit + Shirt + Tie",
  ].map((s) => s.trim().toLowerCase()),
);

export function isLegacyDryCleanItemId(id: string): boolean {
  return (LEGACY_DRY_CLEAN_ITEM_KEYS as readonly string[]).includes(id);
}

export function isLegacyDryCleanItemLabel(label: string): boolean {
  return LEGACY_DRY_CLEAN_ITEM_LABELS.has(label.trim().toLowerCase());
}

/** Garments removed from Dry Cleaning defaults; filtered from saved/DB rows. */
export const DROPPED_DRY_CLEAN_ITEM_KEYS = [
  "dryCleaningItemSweater",
  "dryCleaningItemJacket",
  "dryCleaningItemRobe",
] as const;

export const DROPPED_DRY_CLEAN_ITEM_LABELS = new Set(
  [
    "Sweater",
    "Jacket",
    "Robe",
    "سویٹر",
    "جیکٹ",
    "روب",
  ].map((s) => s.trim().toLowerCase()),
);

export function isDroppedDryCleanItemId(id: string): boolean {
  return (DROPPED_DRY_CLEAN_ITEM_KEYS as readonly string[]).includes(id);
}

export function isDroppedDryCleanItemLabel(label: string): boolean {
  return DROPPED_DRY_CLEAN_ITEM_LABELS.has(label.trim().toLowerCase());
}

/** Default English names — must match partner `Dry Cleaning - {label}` (en onboarding). */
export const DRY_CLEAN_LABEL_BY_KEY: Record<string, string> = {
  [DRY_CLEAN_SUIT_2_PIECE_ID]: "2-piece Suit",
  [DRY_CLEAN_SUIT_3_PIECE_ID]: "3-piece Suit",
  dryCleaningPairShirtPants: "Shirt and Pant",
  dryCleaningItemCoat: "Coat",
  dryCleaningItemBlanket: "Blanket",
};

/** Tie stays inside suit packages — not a separate priced row. */
export const DRY_CLEAN_ITEM_DEFS: DryCleanItemDef[] = [
  {
    id: DRY_CLEAN_SUIT_2_PIECE_ID,
    name: DRY_CLEAN_LABEL_BY_KEY[DRY_CLEAN_SUIT_2_PIECE_ID],
    kind: "suitPackage",
    packageIncludes: ["Coat", "Pant", "Shirt", "Tie"],
  },
  {
    id: DRY_CLEAN_SUIT_3_PIECE_ID,
    name: DRY_CLEAN_LABEL_BY_KEY[DRY_CLEAN_SUIT_3_PIECE_ID],
    kind: "suitPackage",
    packageIncludes: ["Coat", "Pant", "Waistcoat", "Shirt", "Tie"],
  },
  {
    id: "dryCleaningPairShirtPants",
    name: "Shirt and Pant",
    kind: "garment",
  },
  {
    id: "dryCleaningItemCoat",
    name: "Coat",
    kind: "garment",
  },
  {
    id: "dryCleaningItemBlanket",
    name: "Blanket",
    kind: "garment",
  },
];

/** Partner onboarding default item keys (includes both suit rates for save/load). */
export const PARTNER_DRY_CLEANING_ITEM_KEYS = DRY_CLEAN_ITEM_DEFS.map(
  (d) => d.id,
) as readonly string[];

export const PARTNER_DRY_CLEANING_GARMENT_KEYS = DRY_CLEAN_ITEM_DEFS.filter(
  (d) => d.kind === "garment",
).map((d) => d.id);

export function initialDryCleanQuantities(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const d of DRY_CLEAN_ITEM_DEFS) {
    o[d.id] = 0;
  }
  return o;
}

export function getDryCleanDefById(id: string): DryCleanItemDef | undefined {
  return DRY_CLEAN_ITEM_DEFS.find((d) => d.id === id);
}

export type DryCleanCatalogRow = { id: string; label: string };

/** Previous long titles — remap to short “2-piece Suit” / “3-piece Suit”. */
const DRY_CLEAN_SUIT_LABEL_ALIASES: Record<string, string> = {
  "2-piece suit + shirt + tie": DRY_CLEAN_SUIT_2_PIECE_ID,
  "3-piece suit + shirt + tie": DRY_CLEAN_SUIT_3_PIECE_ID,
  "2-پیس سوٹ + شرٹ + ٹائی": DRY_CLEAN_SUIT_2_PIECE_ID,
  "3-پیس سوٹ + شرٹ + ٹائی": DRY_CLEAN_SUIT_3_PIECE_ID,
  "2-piece suit": DRY_CLEAN_SUIT_2_PIECE_ID,
  "3-piece suit": DRY_CLEAN_SUIT_3_PIECE_ID,
  "2-پیس سوٹ": DRY_CLEAN_SUIT_2_PIECE_ID,
  "3-پیس سوٹ": DRY_CLEAN_SUIT_3_PIECE_ID,
};

/** Ensure default dry-clean items exist; drop legacy rows; keep custom rows. */
export function mergeDryCleanCatalog(
  existingItems: DryCleanCatalogRow[],
  existingPrices: Record<string, string>,
  getLabel: (key: string) => string,
): { items: DryCleanCatalogRow[]; prices: Record<string, string> } {
  const prices = { ...existingPrices };
  const items: DryCleanCatalogRow[] = [];
  const norm = (s: string) => s.trim().toLowerCase();

  for (const row of existingItems) {
    if (isLegacyDryCleanItemId(row.id) || isLegacyDryCleanItemLabel(row.label)) {
      delete prices[row.id];
      continue;
    }
    if (isDroppedDryCleanItemId(row.id) || isDroppedDryCleanItemLabel(row.label)) {
      delete prices[row.id];
      continue;
    }
    const aliasKey = DRY_CLEAN_SUIT_LABEL_ALIASES[norm(row.label)];
    if (aliasKey) {
      const prevPrice = prices[row.id];
      items.push({ id: aliasKey, label: getLabel(aliasKey) });
      if (prevPrice !== undefined) {
        prices[aliasKey] = prevPrice;
        if (row.id !== aliasKey) delete prices[row.id];
      }
      continue;
    }
    items.push(row);
  }

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

  for (const key of PARTNER_DRY_CLEANING_ITEM_KEYS) ensureDefault(key);

  const seen = new Set<string>();
  const deduped: DryCleanCatalogRow[] = [];
  for (const row of items) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push(row);
  }

  return { items: deduped, prices };
}
