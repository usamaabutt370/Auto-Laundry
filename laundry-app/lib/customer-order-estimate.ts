import {
  DRY_CLEAN_ITEM_DEFS,
  DRY_CLEAN_SUIT_2_PIECE_ID,
  DRY_CLEAN_SUIT_3_PIECE_ID,
  getDryCleanDefById,
  isDroppedDryCleanItemLabel,
  isLegacyDryCleanItemLabel,
  type DryCleanItemDef,
} from "@/constants/dry-clean-items";
import {
  isDroppedTailoringItemLabel,
  TAILORING_ITEM_DEFS,
  TAILORING_ITEM_SHALWAR_KAMEEZ_ID,
  TAILORING_ITEM_SHIRT_PANT_ID,
} from "@/constants/tailoring-items";
import {
  PRESS_ITEM_DEFS,
  WASH_FOLD_ITEM_DEFS,
  type WashFoldItemDef,
} from "@/constants/wash-fold-items";
import {
  isDroppedWashFoldGarmentLabel,
  isLegacyWashFoldGarmentLabel,
  isPressExcludedGarmentLabel,
  isWashFoldPackageLabel,
  LEGACY_WASH_FOLD_PRICE_LABELS,
} from "@/constants/partner-wash-fold-items";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import {
  partnerOffersPickupDelivery,
  type PartnerDetailRow,
  type PartnerServiceLine,
} from "@/lib/partner-discovery";
import { getStrings, type LocaleCode } from "@/locales";
import {
  currencyPrefixFromDisplay,
  parsePriceDisplay,
} from "@/utils/parse-price-display";

const CAT_WASH = "Wash & Fold";
const CAT_DRY = "Dry Cleaning";
const CAT_TAILORING = "Tailoring";
const CAT_PRESS = "Press";

const MATCH_LOCALES: LocaleCode[] = ["en", "ur"];

export type CatalogItemDef = { id: string; name: string };

function dryCleanLabelCandidates(def: CatalogItemDef): string[] {
  const set = new Set<string>([def.name.trim()]);
  for (const lc of MATCH_LOCALES) {
    const onboarding = getStrings(lc).partner.onboarding as Record<string, string>;
    const label = onboarding[def.id]?.trim();
    if (label) set.add(label);
  }
  // Previous long titles still present in some partner_services rows
  if (def.id === "dryCleaningItemSuit2Piece") {
    set.add("2-piece Suit + Shirt + Tie");
  }
  if (def.id === "dryCleaningItemSuit3Piece") {
    set.add("3-piece Suit + Shirt + Tie");
  }
  return [...set];
}

function matchDryCleanByDef(
  rows: PartnerServiceLine[],
  def: CatalogItemDef,
): PartnerServiceLine | null {
  const candidates = dryCleanLabelCandidates(def);
  for (const row of rows) {
    const label = stripDryCleanPrefix(row.name);
    if (
      candidates.some(
        (candidate) =>
          label.trim().toLowerCase() === candidate.trim().toLowerCase(),
      )
    ) {
      return row;
    }
  }

  // Fuzzy match suit packages (partner may save slight label variants).
  if (
    def.id === "dryCleaningItemSuit2Piece" ||
    def.id === "dryCleaningItemSuit3Piece"
  ) {
    const want2 = def.id === "dryCleaningItemSuit2Piece";
    for (const row of rows) {
      const label = stripDryCleanPrefix(row.name).toLowerCase();
      if (!label) continue;
      if (isLegacyDryCleanItemLabel(label)) continue;
      if (isDroppedDryCleanItemLabel(label)) continue;
      const looksLikeSuit = /suit|سوٹ/.test(label);
      const looks2 = /2[\s-]*piece|2[\s-]*پیس/.test(label);
      const looks3 = /3[\s-]*piece|3[\s-]*پیس/.test(label);
      if (!looksLikeSuit) continue;
      if (want2 && looks2 && !looks3) return row;
      if (!want2 && looks3) return row;
    }
  }

  for (const row of rows) {
    const label = stripDryCleanPrefix(row.name).toLowerCase();
    if (
      candidates.some((candidate) => {
        const c = candidate.trim().toLowerCase();
        return label.includes(c) || c.includes(label);
      })
    ) {
      return row;
    }
  }
  return null;
}

export type OrderEstimateLine = {
  key: string;
  title: string;
  qtyLabel: string;
  amount: number | null;
};

export type OrderEstimateResult = {
  lines: OrderEstimateLine[];
  partialTotal: number;
  total: number | null;
  currencyPrefix: string;
  disclaimer: string | null;
};

/** Match by category or by `Wash & Fold - …` name prefix (some rows may have null category). */
function washFoldRows(services: PartnerServiceLine[]) {
  return services.filter((s) => {
    const cat = (s.category ?? "").trim();
    if (cat === CAT_WASH) return true;
    return /^wash\s*&\s*fold\s*-/i.test(s.name.trim());
  });
}

function pressRows(services: PartnerServiceLine[]) {
  return services.filter((s) => {
    const cat = (s.category ?? "").trim();
    if (cat === CAT_PRESS) return true;
    return /^press\s*-/i.test(s.name.trim());
  });
}

function dryCleanRows(services: PartnerServiceLine[]) {
  return services.filter((s) => {
    const cat = (s.category ?? "").trim();
    if (cat === CAT_DRY) return true;
    return /^dry\s*cleaning\s*-/i.test(s.name.trim());
  });
}

function tailoringRows(services: PartnerServiceLine[]) {
  return services.filter((s) => {
    const cat = (s.category ?? "").trim();
    if (cat === CAT_TAILORING) return true;
    return /^tailoring\s*-/i.test(s.name.trim());
  });
}

function stripWashFoldPrefix(name: string): string {
  return name.replace(/^wash\s*&\s*fold\s*-\s*/i, "").trim();
}

function stripPressPrefix(name: string): string {
  return name.replace(/^press\s*-\s*/i, "").trim();
}

function stripDryCleanPrefix(name: string): string {
  return name.replace(/^dry\s*cleaning\s*-\s*/i, "").trim();
}

function stripTailoringPrefix(name: string): string {
  return name.replace(/^tailoring\s*-\s*/i, "").trim();
}

function washFoldLabelCandidates(def: WashFoldItemDef): string[] {
  const set = new Set<string>([def.name.trim()]);
  for (const lc of MATCH_LOCALES) {
    const onboarding = getStrings(lc).partner.onboarding as Record<string, string>;
    const label = onboarding[def.id]?.trim();
    if (label) set.add(label);
  }
  return [...set];
}

function normalizeGarmentLabel(label: string): string {
  return label.trim().toLowerCase();
}

function washFoldLabelsMatch(left: string, right: string): boolean {
  return normalizeGarmentLabel(left) === normalizeGarmentLabel(right);
}

function tailoringLabelCandidates(def: CatalogItemDef): string[] {
  const set = new Set<string>([def.name.trim()]);
  for (const lc of MATCH_LOCALES) {
    const onboarding = getStrings(lc).partner.onboarding as Record<string, string>;
    const label = onboarding[def.id]?.trim();
    if (label) set.add(label);
  }
  for (const label of [...set]) {
    set.add(label.replace(/ & /g, " and "));
    set.add(label.replace(/ and /gi, " & "));
  }
  return [...set];
}

function matchTailoringByDef(
  rows: PartnerServiceLine[],
  def: CatalogItemDef,
): PartnerServiceLine | null {
  const candidates = tailoringLabelCandidates(def);
  for (const row of rows) {
    const label = stripTailoringPrefix(row.name);
    if (!label || isDroppedTailoringItemLabel(label)) continue;
    if (
      candidates.some(
        (candidate) =>
          normalizeGarmentLabel(label) === normalizeGarmentLabel(candidate),
      )
    ) {
      return row;
    }
  }

  if (def.id === TAILORING_ITEM_SHALWAR_KAMEEZ_ID) {
    return tailoringRowByLabel(rows, "Dress");
  }
  if (def.id === TAILORING_ITEM_SHIRT_PANT_ID) {
    for (const legacyLabel of ["Shirt", "Pants"]) {
      const row = tailoringRowByLabel(rows, legacyLabel);
      if (row && isPositivePrice(parsePriceDisplay(row.price_display))) {
        return row;
      }
    }
  }

  return null;
}

function matchTailoringService(
  rows: PartnerServiceLine[],
  itemName: string,
): PartnerServiceLine | null {
  const lower = itemName.toLowerCase();
  const exact = rows.find((r) => r.name.trim().toLowerCase() === lower);
  if (exact) return exact;
  return (
    rows.find((r) => r.name.toLowerCase().includes(lower)) ??
    rows.find((r) => lower.includes(r.name.trim().toLowerCase())) ??
    null
  );
}

function matchWashFoldService(
  rows: PartnerServiceLine[],
  def: WashFoldItemDef,
): PartnerServiceLine | null {
  const candidates = washFoldLabelCandidates(def);
  for (const row of rows) {
    const label = stripWashFoldPrefix(row.name);
    if (LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) continue;
    if (candidates.some((candidate) => washFoldLabelsMatch(label, candidate))) return row;
  }
  return null;
}

function matchPressService(
  rows: PartnerServiceLine[],
  def: WashFoldItemDef,
): PartnerServiceLine | null {
  const candidates = washFoldLabelCandidates(def);
  for (const row of rows) {
    const label = stripPressPrefix(row.name);
    if (LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) continue;
    if (candidates.some((candidate) => washFoldLabelsMatch(label, candidate))) return row;
  }
  return null;
}

function pressRowByLabel(
  rows: PartnerServiceLine[],
  label: string,
): PartnerServiceLine | null {
  const target = label.trim();
  if (!target) return null;
  for (const row of rows) {
    const stripped = stripPressPrefix(row.name);
    if (LEGACY_WASH_FOLD_PRICE_LABELS.has(stripped)) continue;
    if (washFoldLabelsMatch(stripped, target)) return row;
  }
  return null;
}

function inferCurrencyPrefix(services: PartnerServiceLine[]): string {
  for (const s of services) {
    const p = currencyPrefixFromDisplay(s.price_display);
    if (p) return p;
  }
  return "";
}

export function buildCustomerOrderEstimate(
  draft: CustomerOrderDraft,
  profile: PartnerDetailRow | null,
  services: PartnerServiceLine[],
): OrderEstimateResult {
  const washFold =
    draft.washFold ??
    (draft.selectedServiceIds.includes("washAndFold")
      ? { itemizedQuantities: {}, itemizedInstructions: "" }
      : null);
  const press =
    draft.press ??
    (draft.selectedServiceIds.includes("press")
      ? { itemizedQuantities: {}, itemizedInstructions: "" }
      : null);
  const dryClean =
    draft.dryClean ??
    (draft.selectedServiceIds.includes("dryCleaning")
      ? { itemizedQuantities: {}, itemizedInstructions: "" }
      : null);
  const tailoring =
    draft.tailoring ??
    (draft.selectedServiceIds.includes("tailoring")
      ? { itemizedQuantities: {}, itemizedInstructions: "" }
      : null);

  const lines: OrderEstimateLine[] = [];
  let currencyPrefix = inferCurrencyPrefix(services);
  const disclaimer =
    "This is an estimate. Final amount may change after the launderer counts items at pickup.";

  const addPickupFee = () => {
    if (!draft.pickupDeliveryRequested) return;
    if (!partnerOffersPickupDelivery(profile)) return;
    const raw = profile?.pickup_delivery_amount?.trim() ?? "";
    const fee = parsePriceDisplay(raw);
    if (fee == null || fee <= 0) return;
    if (!currencyPrefix) currencyPrefix = currencyPrefixFromDisplay(raw);
    lines.push({
      key: "pickup_delivery",
      title: "Pickup & delivery",
      qtyLabel: "1×",
      amount: fee,
    });
  };

  if (draft.selectedServiceIds.includes("washAndFold") && washFold) {
    const rows = washFoldRows(services);

    for (const def of listPricedWashFoldDefs(services)) {
      const qty = washFold.itemizedQuantities[def.id] ?? 0;
      if (qty <= 0) continue;
      const row =
        def.id.startsWith("partner_") || !WASH_FOLD_ITEM_DEFS.some((d) => d.id === def.id)
          ? washFoldRowByLabel(rows, def.name)
          : matchWashFoldService(rows, def);
      const unit = row ? parsePriceDisplay(row.price_display) : null;
      if (row && !currencyPrefix) {
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
      }
      const title = row?.name.trim() ?? `Wash & Fold - ${def.name}`;
      lines.push({
        key: `wash_fold_${def.id}`,
        title,
        qtyLabel: def.kind === "package" ? `${qty} pkg` : `${qty}×`,
        amount: unit != null ? Math.round(unit * qty * 100) / 100 : null,
      });
    }
  }

  if (draft.selectedServiceIds.includes("press") && press) {
    const rows = pressRows(services);

    for (const def of listPricedPressDefs(services)) {
      const qty = press.itemizedQuantities[def.id] ?? 0;
      if (qty <= 0) continue;
      const row =
        def.id.startsWith("partner_") || !PRESS_ITEM_DEFS.some((d) => d.id === def.id)
          ? pressRowByLabel(rows, def.name)
          : matchPressService(rows, def);
      const unit = row ? parsePriceDisplay(row.price_display) : null;
      if (row && !currencyPrefix) {
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
      }
      const title = row?.name.trim() ?? `Press - ${def.name}`;
      lines.push({
        key: `press_${def.id}`,
        title,
        qtyLabel: def.kind === "package" ? `${qty} pkg` : `${qty}×`,
        amount: unit != null ? Math.round(unit * qty * 100) / 100 : null,
      });
    }
  }

  if (draft.selectedServiceIds.includes("dryCleaning") && dryClean) {
    const rows = dryCleanRows(services);

    for (const def of listPricedDryCleanDefs(services)) {
      const qty = dryClean.itemizedQuantities[def.id] ?? 0;
      if (qty <= 0) continue;
      const row = dryCleanRowForDef(rows, def);
      const unit = row ? parsePriceDisplay(row.price_display) : null;
      if (row && !currencyPrefix) {
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
      }
      lines.push({
        key: `dry_${def.id}`,
        title: row?.name.trim() ?? `Dry Cleaning - ${def.name}`,
        qtyLabel: `${qty}×`,
        amount: unit != null ? Math.round(unit * qty * 100) / 100 : null,
      });
    }
  }

  if (draft.selectedServiceIds.includes("tailoring") && tailoring) {
    const rows = tailoringRows(services);

    for (const def of listPricedTailoringDefs(services)) {
      const qty = tailoring.itemizedQuantities[def.id] ?? 0;
      if (qty <= 0) continue;
      const row = tailoringRowForDef(rows, def);
      const unit = row ? parsePriceDisplay(row.price_display) : null;
      if (row && !currencyPrefix) {
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
      }
      lines.push({
        key: `tailoring_${def.id}`,
        title: row?.name.trim() ?? `Tailoring - ${def.name}`,
        qtyLabel: `${qty}×`,
        amount: unit != null ? Math.round(unit * qty * 100) / 100 : null,
      });
    }
  }

  addPickupFee();

  const priced = lines.filter((l) => l.amount != null) as (OrderEstimateLine & {
    amount: number;
  })[];
  const hasNull = lines.some((l) => l.amount == null);
  const partialTotal =
    priced.length > 0
      ? Math.round(priced.reduce((s, l) => s + l.amount, 0) * 100) / 100
      : 0;
  const total = hasNull ? null : partialTotal;

  return {
    lines,
    partialTotal,
    total,
    currencyPrefix: currencyPrefix || "",
    disclaimer: lines.length > 0 ? disclaimer : null,
  };
}

function dryCleanRowByLabel(
  rows: PartnerServiceLine[],
  label: string,
): PartnerServiceLine | null {
  const target = label.trim().toLowerCase();
  if (!target) return null;
  for (const row of rows) {
    const stripped = stripDryCleanPrefix(row.name);
    if (stripped.toLowerCase() === target) return row;
  }
  for (const row of rows) {
    const stripped = stripDryCleanPrefix(row.name);
    const norm = stripped.toLowerCase();
    if (norm.includes(target) || target.includes(norm)) return row;
  }
  return null;
}

function tailoringRowByLabel(
  rows: PartnerServiceLine[],
  label: string,
): PartnerServiceLine | null {
  const target = label.trim().toLowerCase();
  if (!target) return null;
  for (const row of rows) {
    const stripped = stripTailoringPrefix(row.name);
    if (stripped.toLowerCase() === target) return row;
  }
  for (const row of rows) {
    const stripped = stripTailoringPrefix(row.name);
    const norm = stripped.toLowerCase();
    if (norm.includes(target) || target.includes(norm)) return row;
  }
  return null;
}

function dryCleanRowForDef(
  rows: PartnerServiceLine[],
  def: CatalogItemDef,
): PartnerServiceLine | null {
  return def.id.startsWith("partner_") ||
    !DRY_CLEAN_ITEM_DEFS.some((d) => d.id === def.id)
    ? dryCleanRowByLabel(rows, def.name)
    : matchDryCleanByDef(rows, def);
}

function tailoringRowForDef(
  rows: PartnerServiceLine[],
  def: CatalogItemDef,
): PartnerServiceLine | null {
  return def.id.startsWith("partner_") ||
    !TAILORING_ITEM_DEFS.some((d) => d.id === def.id)
    ? tailoringRowByLabel(rows, def.name)
    : matchTailoringByDef(rows, def);
}

export function dryCleanUnitForItem(
  services: PartnerServiceLine[],
  def: CatalogItemDef,
): { amount: number | null; priceLabel: string } {
  const rows = dryCleanRows(services);
  const row = dryCleanRowForDef(rows, def);
  if (!row) return { amount: null, priceLabel: "—" };
  const amount = parsePriceDisplay(row.price_display);
  return { amount, priceLabel: row.price_display.trim() || "—" };
}

export function tailoringUnitForItem(
  services: PartnerServiceLine[],
  def: CatalogItemDef,
): { amount: number | null; priceLabel: string } {
  const rows = tailoringRows(services);
  const row = tailoringRowForDef(rows, def);
  if (!row) return { amount: null, priceLabel: "—" };
  const amount = parsePriceDisplay(row.price_display);
  return { amount, priceLabel: row.price_display.trim() || "—" };
}

function washFoldRowByLabel(
  rows: PartnerServiceLine[],
  label: string,
): PartnerServiceLine | null {
  const target = label.trim();
  if (!target) return null;
  for (const row of rows) {
    const stripped = stripWashFoldPrefix(row.name);
    if (LEGACY_WASH_FOLD_PRICE_LABELS.has(stripped)) continue;
    if (washFoldLabelsMatch(stripped, target)) return row;
  }
  return null;
}

function washFoldMatchedRow(
  services: PartnerServiceLine[],
  def: WashFoldItemDef,
): PartnerServiceLine | null {
  const rows = washFoldRows(services);
  if (
    def.id.startsWith("partner_") ||
    !WASH_FOLD_ITEM_DEFS.some((d) => d.id === def.id)
  ) {
    return washFoldRowByLabel(rows, def.name);
  }
  return matchWashFoldService(rows, def);
}

function isPositivePrice(amount: number | null): amount is number {
  return amount != null && amount > 0;
}

/** Partner row counts as a customer-facing wash & fold rate (positive price + label kind). */
function isPricedWashFoldDef(
  services: PartnerServiceLine[],
  def: WashFoldItemDef,
): boolean {
  const row = washFoldMatchedRow(services, def);
  if (!row) return false;
  const label = stripWashFoldPrefix(row.name);
  if (!label || LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) return false;
  const amount = parsePriceDisplay(row.price_display);
  if (!isPositivePrice(amount)) return false;
  const rowIsPackage = isWashFoldPackageLabel(label);
  if (def.kind === "package") return rowIsPackage;
  return !rowIsPackage;
}

export function washFoldUnitForItem(
  services: PartnerServiceLine[],
  def: WashFoldItemDef,
): { amount: number | null; priceLabel: string } {
  const row = washFoldMatchedRow(services, def);
  if (!row) return { amount: null, priceLabel: "—" };
  const amount = parsePriceDisplay(row.price_display);
  if (!isPositivePrice(amount)) return { amount: null, priceLabel: "—" };
  return { amount, priceLabel: row.price_display.trim() || "—" };
}

/** Priced wash & fold lines for customer UI (catalog + partner-specific items with rates). */
export function listPricedWashFoldDefs(
  services: PartnerServiceLine[],
): WashFoldItemDef[] {
  const result: WashFoldItemDef[] = [];
  const seen = new Set<string>();

  for (const def of WASH_FOLD_ITEM_DEFS) {
    if (!isPricedWashFoldDef(services, def)) continue;
    result.push(def);
    seen.add(def.name.trim().toLowerCase());
  }

  for (const row of washFoldRows(services)) {
    const label = stripWashFoldPrefix(row.name);
    if (!label || LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) continue;
    if (isLegacyWashFoldGarmentLabel(label)) continue;
    if (isDroppedWashFoldGarmentLabel(label)) continue;
    if (!isPositivePrice(parsePriceDisplay(row.price_display))) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: `partner_${key.replace(/[^a-z0-9]+/gi, "_")}`,
      name: label,
      kind: isWashFoldPackageLabel(label) ? "package" : "garment",
    });
  }
  return result;
}

/** Priced Press lines — Wash & Fold catalog without towel/socks/undergarment. */
export function listPricedPressDefs(
  services: PartnerServiceLine[],
): WashFoldItemDef[] {
  const result: WashFoldItemDef[] = [];
  const seen = new Set<string>();

  for (const def of PRESS_ITEM_DEFS) {
    if (!isPricedPressDef(services, def)) continue;
    result.push(def);
    seen.add(def.name.trim().toLowerCase());
  }

  for (const row of pressRows(services)) {
    const label = stripPressPrefix(row.name);
    if (!label || LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) continue;
    if (isLegacyWashFoldGarmentLabel(label)) continue;
    if (isPressExcludedGarmentLabel(label)) continue;
    if (!isPositivePrice(parsePriceDisplay(row.price_display))) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: `partner_${key.replace(/[^a-z0-9]+/gi, "_")}`,
      name: label,
      kind: isWashFoldPackageLabel(label) ? "package" : "garment",
    });
  }
  return result;
}

function pressMatchedRow(
  services: PartnerServiceLine[],
  def: WashFoldItemDef,
): PartnerServiceLine | null {
  const rows = pressRows(services);
  if (
    def.id.startsWith("partner_") ||
    !PRESS_ITEM_DEFS.some((d) => d.id === def.id)
  ) {
    return pressRowByLabel(rows, def.name);
  }
  return matchPressService(rows, def);
}

function isPricedPressDef(
  services: PartnerServiceLine[],
  def: WashFoldItemDef,
): boolean {
  const row = pressMatchedRow(services, def);
  if (!row) return false;
  const label = stripPressPrefix(row.name);
  if (!label || LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) return false;
  const amount = parsePriceDisplay(row.price_display);
  if (!isPositivePrice(amount)) return false;
  const rowIsPackage = isWashFoldPackageLabel(label);
  if (def.kind === "package") return rowIsPackage;
  return !rowIsPackage;
}

export function pressUnitForItem(
  services: PartnerServiceLine[],
  def: WashFoldItemDef,
): { amount: number | null; priceLabel: string } {
  const row = pressMatchedRow(services, def);
  if (!row) return { amount: null, priceLabel: "—" };
  const amount = parsePriceDisplay(row.price_display);
  if (!isPositivePrice(amount)) return { amount: null, priceLabel: "—" };
  return { amount, priceLabel: row.price_display.trim() || "—" };
}

/** Priced dry cleaning lines for customer UI (catalog + partner-added items). */
export function listPricedDryCleanDefs(
  services: PartnerServiceLine[],
): DryCleanItemDef[] {
  const result: DryCleanItemDef[] = [];
  const seen = new Set<string>();

  for (const def of DRY_CLEAN_ITEM_DEFS) {
    const unit = dryCleanUnitForItem(services, def);
    if (unit.amount == null || unit.amount <= 0) continue;
    result.push(def);
    for (const candidate of dryCleanLabelCandidates(def)) {
      seen.add(candidate.trim().toLowerCase());
    }
  }

  for (const row of dryCleanRows(services)) {
    const label = stripDryCleanPrefix(row.name);
    if (!label) continue;
    if (isLegacyDryCleanItemLabel(label)) continue;
    if (isDroppedDryCleanItemLabel(label)) continue;
    // Suit packages are only surfaced via catalog ids (combined Suit card on customer).
    if (/suit|سوٹ/i.test(label) && /[23]\s*-?\s*piece|[23]\s*-?\s*پیس/i.test(label)) {
      continue;
    }
    const amount = parsePriceDisplay(row.price_display);
    if (amount == null || amount <= 0) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: `partner_${key.replace(/[^a-z0-9]+/gi, "_")}`,
      name: label,
      kind: "garment",
    });
  }
  return result;
}

/** Suit package defs that this partner has priced (for the combined Suit card). */
export function listPricedDryCleanSuitDefs(
  services: PartnerServiceLine[],
): DryCleanItemDef[] {
  const out: DryCleanItemDef[] = [];
  for (const id of [DRY_CLEAN_SUIT_2_PIECE_ID, DRY_CLEAN_SUIT_3_PIECE_ID] as const) {
    const def = getDryCleanDefById(id);
    if (!def) continue;
    const unit = dryCleanUnitForItem(services, def);
    if (unit.amount == null || unit.amount <= 0) continue;
    out.push(def);
  }
  return out;
}

/** True when partner has any positive dry-cleaning rate. */
export function partnerHasDryCleaningRates(
  services: PartnerServiceLine[],
): boolean {
  return dryCleanRows(services).some((row) => {
    const amount = parsePriceDisplay(row.price_display);
    return amount != null && amount > 0;
  });
}

/** Priced tailoring lines for customer UI (catalog + partner-added items). */
export function listPricedTailoringDefs(
  services: PartnerServiceLine[],
): CatalogItemDef[] {
  const result: CatalogItemDef[] = [];
  const seen = new Set<string>();

  for (const def of TAILORING_ITEM_DEFS) {
    if (tailoringUnitForItem(services, def).amount == null) continue;
    result.push(def);
    seen.add(def.name.trim().toLowerCase());
  }

  for (const row of tailoringRows(services)) {
    const label = stripTailoringPrefix(row.name);
    if (!label) continue;
    if (isDroppedTailoringItemLabel(label)) continue;
    if (parsePriceDisplay(row.price_display) == null) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: `partner_${key.replace(/[^a-z0-9]+/gi, "_")}`,
      name: label,
    });
  }
  return result;
}
