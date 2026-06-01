import {
  PARTNER_WASH_FOLD_GARMENT_KEYS,
  PARTNER_WASH_FOLD_PACKAGE_KEYS,
} from "@/constants/partner-wash-fold-items";

/** Default English labels — must match partner `Wash & Fold - {label}` (en onboarding). */
export const WASH_FOLD_LABEL_BY_KEY: Record<string, string> = {
  washFoldItemShirt: "Shirt",
  washFoldItemTshirt: "T-Shirt",
  washFoldItemTrouser: "Trouser",
  washFoldItemShalwar: "Shalwar",
  washFoldItemKameez: "Kameez",
  washFoldItemDupatta: "Dupatta",
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

export function initialWashFoldQuantities(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const def of WASH_FOLD_ITEM_DEFS) {
    o[def.id] = 0;
  }
  return o;
}
