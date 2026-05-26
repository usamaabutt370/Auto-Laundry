import { DRY_CLEAN_ITEM_DEFS } from "@/constants/dry-clean-items";
import { TAILORING_ITEM_DEFS } from "@/constants/tailoring-items";
import {
  WASH_FOLD_ITEM_DEFS,
  type WashFoldItemDef,
} from "@/constants/wash-fold-items";
import {
  isWashFoldPackageLabel,
  LEGACY_WASH_FOLD_PRICE_LABELS,
} from "@/constants/partner-wash-fold-items";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import type { PartnerDetailRow, PartnerServiceLine } from "@/lib/partner-discovery";
import { getStrings, type LocaleCode } from "@/locales";
import {
  currencyPrefixFromDisplay,
  parsePriceDisplay,
} from "@/utils/parse-price-display";

const CAT_WASH = "Wash & Fold";
const CAT_DRY = "Dry Cleaning";
const CAT_TAILORING = "Tailoring";

const MATCH_LOCALES: LocaleCode[] = ["en", "ur"];

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

function dryCleanRows(services: PartnerServiceLine[]) {
  return services.filter((s) => s.category === CAT_DRY);
}

function tailoringRows(services: PartnerServiceLine[]) {
  return services.filter((s) => s.category === CAT_TAILORING);
}

function stripWashFoldPrefix(name: string): string {
  return name.replace(/^wash\s*&\s*fold\s*-\s*/i, "").trim();
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

function matchDryCleanService(
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
  const candidates = washFoldLabelCandidates(def).map((c) => c.toLowerCase());
  for (const row of rows) {
    const label = stripWashFoldPrefix(row.name);
    if (LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) continue;
    const norm = label.toLowerCase();
    if (candidates.some((c) => c === norm)) return row;
  }
  for (const row of rows) {
    const label = stripWashFoldPrefix(row.name);
    if (LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) continue;
    const norm = label.toLowerCase();
    if (candidates.some((c) => norm.includes(c) || c.includes(norm))) return row;
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
    if (!profile?.pickup_delivery_enabled) return;
    if (draft.pickup == null || draft.delivery == null) return;
    const raw = profile.pickup_delivery_amount?.trim() ?? "";
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

  if (draft.selectedServiceIds.includes("dryCleaning") && dryClean) {
    const rows = dryCleanRows(services);

    for (const def of DRY_CLEAN_ITEM_DEFS) {
      const qty = dryClean.itemizedQuantities[def.id] ?? 0;
      if (qty <= 0) continue;
      const row = matchDryCleanService(rows, def.name);
      const unit = row ? parsePriceDisplay(row.price_display) : null;
      if (row && !currencyPrefix) {
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
      }
      lines.push({
        key: `dry_${def.id}`,
        title: row?.name.trim() ?? def.name,
        qtyLabel: `${qty}×`,
        amount: unit != null ? Math.round(unit * qty * 100) / 100 : null,
      });
    }
  }

  if (draft.selectedServiceIds.includes("tailoring") && tailoring) {
    const rows = tailoringRows(services);

    for (const def of TAILORING_ITEM_DEFS) {
      const qty = tailoring.itemizedQuantities[def.id] ?? 0;
      if (qty <= 0) continue;
      const row = matchTailoringService(rows, def.name);
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

export function dryCleanUnitForItem(
  services: PartnerServiceLine[],
  itemName: string,
): { amount: number | null; priceLabel: string } {
  const rows = dryCleanRows(services);
  const row = matchDryCleanService(rows, itemName);
  if (!row) return { amount: null, priceLabel: "—" };
  const amount = parsePriceDisplay(row.price_display);
  return { amount, priceLabel: row.price_display.trim() || "—" };
}

export function tailoringUnitForItem(
  services: PartnerServiceLine[],
  itemName: string,
): { amount: number | null; priceLabel: string } {
  const rows = tailoringRows(services);
  const row = matchTailoringService(rows, itemName);
  if (!row) return { amount: null, priceLabel: "—" };
  const amount = parsePriceDisplay(row.price_display);
  return { amount, priceLabel: row.price_display.trim() || "—" };
}

function washFoldRowByLabel(
  rows: PartnerServiceLine[],
  label: string,
): PartnerServiceLine | null {
  const target = label.trim().toLowerCase();
  if (!target) return null;
  for (const row of rows) {
    const stripped = stripWashFoldPrefix(row.name);
    if (LEGACY_WASH_FOLD_PRICE_LABELS.has(stripped)) continue;
    if (stripped.toLowerCase() === target) return row;
  }
  for (const row of rows) {
    const stripped = stripWashFoldPrefix(row.name);
    if (LEGACY_WASH_FOLD_PRICE_LABELS.has(stripped)) continue;
    const norm = stripped.toLowerCase();
    if (norm.includes(target) || target.includes(norm)) return row;
  }
  return null;
}

export function washFoldUnitForItem(
  services: PartnerServiceLine[],
  def: WashFoldItemDef,
): { amount: number | null; priceLabel: string } {
  const rows = washFoldRows(services);
  const row =
    def.id.startsWith("partner_") || !WASH_FOLD_ITEM_DEFS.some((d) => d.id === def.id)
      ? washFoldRowByLabel(rows, def.name)
      : matchWashFoldService(rows, def);
  if (!row) return { amount: null, priceLabel: "—" };
  const amount = parsePriceDisplay(row.price_display);
  return { amount, priceLabel: row.price_display.trim() || "—" };
}

/** Priced wash & fold lines for customer UI (catalog match, then any DB row with a rate). */
export function listPricedWashFoldDefs(
  services: PartnerServiceLine[],
): WashFoldItemDef[] {
  const fromCatalog = WASH_FOLD_ITEM_DEFS.filter(
    (def) => washFoldUnitForItem(services, def).amount != null,
  );
  if (fromCatalog.length > 0) return fromCatalog;

  const rows = washFoldRows(services);
  const dynamic: WashFoldItemDef[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const label = stripWashFoldPrefix(row.name);
    if (!label || LEGACY_WASH_FOLD_PRICE_LABELS.has(label)) continue;
    if (parsePriceDisplay(row.price_display) == null) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dynamic.push({
      id: `partner_${key.replace(/[^a-z0-9]+/gi, "_")}`,
      name: label,
      kind: isWashFoldPackageLabel({ id: "", label }) ? "package" : "garment",
    });
  }
  return dynamic;
}
