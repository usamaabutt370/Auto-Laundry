import { assets } from "@/assets/assets";

const img = assets.images;

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BY_ID: Record<string, number> = {
  washFoldPairShalwarKameez: img.serviceShalwarKameez,
  washFoldPairShirtPant: img.serviceShirtPant,
  washFoldItemBedsheet: img.serviceBedsheet,
  washFoldPkg25: img.serviceLaundryPackage,
  washFoldPkg50: img.serviceLaundryPackage,
  washFoldPkg75: img.serviceLaundryPackage,
  washFoldPkg100: img.serviceLaundryPackage,
  dryCleaningItemSuit2Piece: img.serviceSuit2Piece,
  dryCleaningItemSuit3Piece: img.serviceSuit3Piece,
  dryCleaningPairShirtPants: img.serviceShirtPant,
  dryCleaningItemCoat: img.serviceCoat,
  dryCleaningItemBlanket: img.serviceBlanket,
  tailoringItemShalwarKameez: img.serviceShalwarKameez,
  tailoringItemShirtPant: img.serviceShirtPant,
  tailoringItemGhararaKameez: img.serviceGharara,
  tailoringItemKurtaPalazzo: img.serviceKurtaPalazzo,
  tailoringItemAnarkaliChuridar: img.serviceAnarkali,
  tailoringItemLehengaKurti: img.serviceLehenga,
  tailoringItemPishwasDupatta: img.servicePishwas,
  tailoringItemMaxiDupatta: img.serviceMaxi,
};

export function imageForServiceItem(
  id?: string | null,
  name?: string | null,
  family?: string | null,
): number {
  if (id && BY_ID[id]) return BY_ID[id];
  const hay = normalize(`${id ?? ""} ${name ?? ""}`);
  if (/gharara/.test(hay)) return img.serviceGharara;
  if (/anarkali/.test(hay)) return img.serviceAnarkali;
  if (/lehenga/.test(hay)) return img.serviceLehenga;
  if (/pishwas/.test(hay)) return img.servicePishwas;
  if (/maxi/.test(hay)) return img.serviceMaxi;
  if (/kurta|palazzo/.test(hay)) return img.serviceKurtaPalazzo;
  if (/shalwar|kameez/.test(hay)) return img.serviceShalwarKameez;
  if (/3\s*piece|3piece/.test(hay)) return img.serviceSuit3Piece;
  if (/2\s*piece|2piece/.test(hay)) return img.serviceSuit2Piece;
  if (/\bcoat\b|overcoat/.test(hay)) return img.serviceCoat;
  if (/blanket|quilt|duvet|comforter/.test(hay)) return img.serviceBlanket;
  if (/bedsheet|bed sheet/.test(hay)) return img.serviceBedsheet;
  if (/shirt/.test(hay) && /pant/.test(hay)) return img.serviceShirtPant;
  if (/pkg|package|\bpcs\b/.test(hay)) return img.serviceLaundryPackage;
  if (family === "dryCleaning") return img.serviceSuit2Piece;
  if (family === "press" || family === "ironing") return img.serviceShirtPant;
  if (family === "tailoring") return img.serviceShalwarKameez;
  return img.serviceLaundryPackage;
}
