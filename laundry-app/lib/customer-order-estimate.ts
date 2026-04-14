import { DRY_CLEAN_ITEM_DEFS } from "@/constants/dry-clean-items";
import { TAILORING_ITEM_DEFS } from "@/constants/tailoring-items";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import type { PartnerDetailRow, PartnerServiceLine } from "@/lib/partner-discovery";
import {
  currencyPrefixFromDisplay,
  parsePriceDisplay,
} from "@/utils/parse-price-display";

const CAT_WASH = "Wash & Fold";
const CAT_DRY = "Dry Cleaning";
const CAT_TAILORING = "Tailoring";

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

function washFoldRows(services: PartnerServiceLine[]) {
  return services.filter((s) => s.category === CAT_WASH);
}

function dryCleanRows(services: PartnerServiceLine[]) {
  return services.filter((s) => s.category === CAT_DRY);
}

function tailoringRows(services: PartnerServiceLine[]) {
  return services.filter((s) => s.category === CAT_TAILORING);
}

function isLikelyPerLbName(name: string): boolean {
  return /\b(lb|lbs|pound|pounds|kg|kilo|kilogram)\b/i.test(name);
}

/** Prefer explicit per-bag rows; avoid weight-based rows so totals match the toggle. */
function pickWashFoldRowForBag(
  rows: PartnerServiceLine[],
): PartnerServiceLine | null {
  if (rows.length === 0) return null;
  const named = rows.find(
    (r) => /\b(bag|sack|load)\b/i.test(r.name) && !isLikelyPerLbName(r.name),
  );
  if (named) return named;
  const nonLb = rows.filter((r) => !isLikelyPerLbName(r.name));
  return nonLb[0] ?? null;
}

/** Prefer explicit per-item rows; avoid weight-based rows. */
function pickWashFoldRowForItem(
  rows: PartnerServiceLine[],
): PartnerServiceLine | null {
  if (rows.length === 0) return null;
  const named = rows.find(
    (r) =>
      /\b(item|piece|garment|shirt|cloth|unit)\b/i.test(r.name) &&
      !isLikelyPerLbName(r.name),
  );
  if (named) return named;
  const nonLb = rows.filter((r) => !isLikelyPerLbName(r.name));
  return nonLb[0] ?? null;
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
      ? {
          bagCount: 1,
          pricingMode: "per_bag" as const,
          estimateIncludeBag: true,
          estimateIncludeItem: false,
          bagDetailsByIndex: {},
        }
      : null);
  const dryClean =
    draft.dryClean ??
    (draft.selectedServiceIds.includes("dryCleaning")
      ? {
          itemizedQuantities: {} as Record<string, number>,
          itemizedInstructions: "",
        }
      : null);
  const tailoring =
    draft.tailoring ??
    (draft.selectedServiceIds.includes("tailoring")
      ? {
          itemizedQuantities: {} as Record<string, number>,
          itemizedInstructions: "",
        }
      : null);

  const lines: OrderEstimateLine[] = [];
  let currencyPrefix = inferCurrencyPrefix(services);
  const disclaimer =
    "Final price may change when the launderer weighs or inspects your items.";

  const addPickupFee = () => {
    if (!draft.pickupDeliveryRequested) return;
    if (!profile?.pickup_delivery_enabled) return;
    /** Only after pickup and delivery are both on the draft (e.g. order summary), not mid-flow. */
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
    const wf = washFold;
    const rows = washFoldRows(services);
    const bagN = Math.max(0, wf.bagCount);
    const itemQty = Math.max(0, wf.bagDetailsByIndex[1]?.itemCount ?? 0);
    const inclBag = wf.estimateIncludeBag;
    const inclItem = wf.estimateIncludeItem;

    const pushBagLineResolved = () => {
      if (bagN <= 0) return;
      const row = pickWashFoldRowForBag(rows);
      if (!row) {
        lines.push({
          key: "wash_fold_bag_no_rate",
          title: "Wash & fold (per bag)",
          qtyLabel: `${bagN} bag(s)`,
          amount: null,
        });
        return;
      }
      const unit = parsePriceDisplay(row.price_display);
      if (!currencyPrefix)
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
      lines.push({
        key: "wash_fold_bag",
        title: row.name.trim() || "Wash & fold (per bag)",
        qtyLabel: `${bagN} bag(s)`,
        amount: unit != null ? Math.round(unit * bagN * 100) / 100 : null,
      });
    };

    const pushItemLineResolved = () => {
      if (itemQty <= 0) return;
      const row = pickWashFoldRowForItem(rows);
      if (!row) {
        lines.push({
          key: "wash_fold_item_no_rate",
          title: "Wash & fold (per item)",
          qtyLabel: `${itemQty} item(s)`,
          amount: null,
        });
        return;
      }
      const unit = parsePriceDisplay(row.price_display);
      if (!currencyPrefix)
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
      lines.push({
        key: "wash_fold_item",
        title: row.name.trim() || "Wash & fold (per item)",
        qtyLabel: `${itemQty} item(s)`,
        amount:
          unit != null ? Math.round(unit * itemQty * 100) / 100 : null,
      });
    };

    if (rows.length === 0) {
      if (inclBag && bagN > 0) {
        lines.push({
          key: "wash_fold_missing_bag",
          title: "Wash & fold (per bag)",
          qtyLabel: `${bagN} bag(s)`,
          amount: null,
        });
      }
      if (inclItem && itemQty > 0) {
        lines.push({
          key: "wash_fold_missing_item",
          title: "Wash & fold (per item)",
          qtyLabel: `${itemQty} item(s)`,
          amount: null,
        });
      }
      if (!inclBag && (!inclItem || itemQty === 0)) {
        lines.push({
          key: "wash_fold_missing",
          title: "Wash & fold",
          qtyLabel: "—",
          amount: null,
        });
      }
    } else {
      if (inclBag && bagN > 0) {
        pushBagLineResolved();
      }
      if (inclItem && itemQty > 0) {
        pushItemLineResolved();
      }
      if (!inclBag && (!inclItem || itemQty === 0)) {
        lines.push({
          key: "wash_fold_missing",
          title: "Wash & fold",
          qtyLabel: "—",
          amount: null,
        });
      }
    }
  }

  if (draft.selectedServiceIds.includes("dryCleaning") && dryClean) {
    const dc = dryClean;
    const rows = dryCleanRows(services);

    for (const def of DRY_CLEAN_ITEM_DEFS) {
      const qty = dc.itemizedQuantities[def.id] ?? 0;
      if (qty <= 0) continue;
      const row = matchDryCleanService(rows, def.name);
      const unit = row ? parsePriceDisplay(row.price_display) : null;
      if (row && !currencyPrefix)
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
      lines.push({
        key: `dry_${def.id}`,
        title: row?.name.trim() ?? def.name,
        qtyLabel: `${qty}×`,
        amount: unit != null ? Math.round(unit * qty * 100) / 100 : null,
      });
    }
  }

  if (draft.selectedServiceIds.includes("tailoring") && tailoring) {
    const t = tailoring;
    const rows = tailoringRows(services);

    for (const def of TAILORING_ITEM_DEFS) {
      const qty = t.itemizedQuantities[def.id] ?? 0;
      if (qty <= 0) continue;
      const row = matchTailoringService(rows, def.name);
      const unit = row ? parsePriceDisplay(row.price_display) : null;
      if (row && !currencyPrefix)
        currencyPrefix = currencyPrefixFromDisplay(row.price_display);
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

/** Unit price for one dry-clean item name (partner list). */
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

/** Unit price for one tailoring item name (partner list). */
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
