import {
  PARTNER_PRESS_GARMENT_KEYS,
  PARTNER_WASH_FOLD_GARMENT_KEYS,
  PARTNER_WASH_FOLD_PACKAGE_KEYS,
} from "@/constants/partner-wash-fold-items";

/** Default English labels — must match partner `Wash & Fold - {label}` (en onboarding). */
export const WASH_FOLD_LABEL_BY_KEY: Record<string, string> = {
  washFoldPairShirtPant: "Shirt and Pant",
  washFoldPairTshirtTrouser: "T-Shirt and Trouser",
  washFoldPairShalwarKameez: "Shalwar and Kameez",
  washFoldItemBedsheet: "Bedsheet",
  washFoldItemTowel: "Towel",
  washFoldItemSocks: "Socks",
  washFoldItemUndergarment: "Undergarment",
  washFoldPkg25: "25 pcs package",
  washFoldPkg50: "50 pcs package",
  washFoldPkg75: "75 pcs package",
  washFoldPkg100: "100 pcs package",
};

export type WashFoldItemKind = "garment" | "package";

export type WashFoldItemDef = {
  id: string;
  name: string;
  kind: WashFoldItemKind;
};

export const WASH_FOLD_GARMENT_DEFS: WashFoldItemDef[] =
  PARTNER_WASH_FOLD_GARMENT_KEYS.map((id) => ({
    id,
    name: WASH_FOLD_LABEL_BY_KEY[id] ?? id,
    kind: "garment" as const,
  }));

export const WASH_FOLD_PACKAGE_DEFS: WashFoldItemDef[] =
  PARTNER_WASH_FOLD_PACKAGE_KEYS.map((id) => ({
    id,
    name: WASH_FOLD_LABEL_BY_KEY[id] ?? id,
    kind: "package" as const,
  }));

export const WASH_FOLD_ITEM_DEFS: WashFoldItemDef[] = [
  ...WASH_FOLD_GARMENT_DEFS,
  ...WASH_FOLD_PACKAGE_DEFS,
];

/** Press catalog: pairs + bedsheet + packages — no towel/socks/undergarment. */
export const PRESS_GARMENT_DEFS: WashFoldItemDef[] =
  PARTNER_PRESS_GARMENT_KEYS.map((id) => ({
    id,
    name: WASH_FOLD_LABEL_BY_KEY[id] ?? id,
    kind: "garment" as const,
  }));

export const PRESS_ITEM_DEFS: WashFoldItemDef[] = [
  ...PRESS_GARMENT_DEFS,
  ...WASH_FOLD_PACKAGE_DEFS,
];

export function initialWashFoldQuantities(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const def of WASH_FOLD_ITEM_DEFS) {
    o[def.id] = 0;
  }
  return o;
}

export function initialPressQuantities(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const def of PRESS_ITEM_DEFS) {
    o[def.id] = 0;
  }
  return o;
}
