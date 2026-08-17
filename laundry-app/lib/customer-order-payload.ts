import type { CustomerOrderDraft, CustomerServiceId } from "@/contexts/customer-order-draft-context";
import {
  dryCleanUnitForItem,
  listPricedDryCleanDefs,
  listPricedPressDefs,
  listPricedTailoringDefs,
  listPricedWashFoldDefs,
  pressUnitForItem,
  tailoringUnitForItem,
  washFoldUnitForItem,
  type OrderEstimateResult,
} from "@/lib/customer-order-estimate";
import type { PartnerServiceLine } from "@/lib/partner-discovery";

function sumEstimateByPrefix(estimate: OrderEstimateResult, prefix: string): number | null {
  const lines = estimate.lines.filter(
    (line) => line.key.startsWith(prefix) && line.amount != null,
  );
  if (lines.length === 0) return null;
  const total = lines.reduce((acc, line) => acc + (line.amount ?? 0), 0);
  return Math.round(total * 100) / 100;
}

function totalItemCountForService(
  draft: CustomerOrderDraft,
  serviceType: CustomerServiceId,
): number {
  if (serviceType === "washAndFold") {
    return Object.values(draft.washFold?.itemizedQuantities ?? {}).reduce(
      (acc, qty) => acc + Math.max(0, qty),
      0,
    );
  }
  if (serviceType === "press") {
    return Object.values(draft.press?.itemizedQuantities ?? {}).reduce(
      (acc, qty) => acc + Math.max(0, qty),
      0,
    );
  }
  if (serviceType === "dryCleaning") {
    return Object.values(draft.dryClean?.itemizedQuantities ?? {}).reduce(
      (acc, qty) => acc + Math.max(0, qty),
      0,
    );
  }
  return Object.values(draft.tailoring?.itemizedQuantities ?? {}).reduce(
    (acc, qty) => acc + Math.max(0, qty),
    0,
  );
}

function instructionsForService(
  draft: CustomerOrderDraft,
  serviceType: CustomerServiceId,
): string {
  if (serviceType === "washAndFold") {
    return draft.washFold?.itemizedInstructions?.trim() ?? "";
  }
  if (serviceType === "press") {
    return draft.press?.itemizedInstructions?.trim() ?? "";
  }
  if (serviceType === "dryCleaning") {
    return draft.dryClean?.itemizedInstructions?.trim() ?? "";
  }
  return draft.tailoring?.itemizedInstructions?.trim() ?? "";
}

function estimatedAmountForService(
  draft: CustomerOrderDraft,
  estimate: OrderEstimateResult,
  serviceType: CustomerServiceId,
): number | null {
  if (serviceType === "washAndFold") {
    return sumEstimateByPrefix(estimate, "wash_fold");
  }
  if (serviceType === "press") {
    return sumEstimateByPrefix(estimate, "press_");
  }
  if (serviceType === "dryCleaning") {
    return sumEstimateByPrefix(estimate, "dry_");
  }
  return sumEstimateByPrefix(estimate, "tailoring_");
}

export type OrderServiceInsertRow = {
  order_id: string;
  service_type: CustomerServiceId;
  pricing_mode: "per_item";
  total_item_count: number;
  instructions: string;
  estimated_amount: number | null;
};

export type OrderServiceItemInsertRow = {
  order_service_id: string;
  service_type: CustomerServiceId;
  item_key: string;
  item_name: string;
  quantity: number;
  unit_price_display: string | null;
  unit_price_amount: number | null;
  line_total_amount: number | null;
};

export function buildOrderServiceRows(
  orderId: string,
  draft: CustomerOrderDraft,
  estimate: OrderEstimateResult,
): OrderServiceInsertRow[] {
  return draft.selectedServiceIds.map((serviceType) => ({
    order_id: orderId,
    service_type: serviceType,
    pricing_mode: "per_item" as const,
    total_item_count: totalItemCountForService(draft, serviceType),
    instructions: instructionsForService(draft, serviceType),
    estimated_amount: estimatedAmountForService(draft, estimate, serviceType),
  }));
}

export function buildOrderServiceItemRows(
  byType: Map<string, string>,
  draft: CustomerOrderDraft,
  services: PartnerServiceLine[],
): OrderServiceItemInsertRow[] {
  const itemPayload: OrderServiceItemInsertRow[] = [];

  const washServiceId = byType.get("washAndFold");
  if (washServiceId && draft.washFold) {
    for (const def of listPricedWashFoldDefs(services)) {
      const quantity = draft.washFold.itemizedQuantities[def.id] ?? 0;
      if (quantity <= 0) continue;
      const unit = washFoldUnitForItem(services, def);
      itemPayload.push({
        order_service_id: washServiceId,
        service_type: "washAndFold",
        item_key: def.id,
        item_name: def.name,
        quantity,
        unit_price_display: unit.priceLabel === "—" ? null : unit.priceLabel,
        unit_price_amount: unit.amount,
        line_total_amount:
          unit.amount != null ? Math.round(unit.amount * quantity * 100) / 100 : null,
      });
    }
  }

  const dryServiceId = byType.get("dryCleaning");
  if (dryServiceId && draft.dryClean) {
    for (const def of listPricedDryCleanDefs(services)) {
      const quantity = draft.dryClean.itemizedQuantities[def.id] ?? 0;
      if (quantity <= 0) continue;
      const unit = dryCleanUnitForItem(services, def);
      itemPayload.push({
        order_service_id: dryServiceId,
        service_type: "dryCleaning",
        item_key: def.id,
        item_name: def.name,
        quantity,
        unit_price_display: unit.priceLabel === "—" ? null : unit.priceLabel,
        unit_price_amount: unit.amount,
        line_total_amount:
          unit.amount != null ? Math.round(unit.amount * quantity * 100) / 100 : null,
      });
    }
  }

  const pressServiceId = byType.get("press");
  if (pressServiceId && draft.press) {
    for (const def of listPricedPressDefs(services)) {
      const quantity = draft.press.itemizedQuantities[def.id] ?? 0;
      if (quantity <= 0) continue;
      const unit = pressUnitForItem(services, def);
      itemPayload.push({
        order_service_id: pressServiceId,
        service_type: "press",
        item_key: def.id,
        item_name: def.name,
        quantity,
        unit_price_display: unit.priceLabel === "—" ? null : unit.priceLabel,
        unit_price_amount: unit.amount,
        line_total_amount:
          unit.amount != null ? Math.round(unit.amount * quantity * 100) / 100 : null,
      });
    }
  }

  const tailoringServiceId = byType.get("tailoring");
  if (tailoringServiceId && draft.tailoring) {
    for (const def of listPricedTailoringDefs(services)) {
      const quantity = draft.tailoring.itemizedQuantities[def.id] ?? 0;
      if (quantity <= 0) continue;
      const unit = tailoringUnitForItem(services, def);
      itemPayload.push({
        order_service_id: tailoringServiceId,
        service_type: "tailoring",
        item_key: def.id,
        item_name: def.name,
        quantity,
        unit_price_display: unit.priceLabel === "—" ? null : unit.priceLabel,
        unit_price_amount: unit.amount,
        line_total_amount:
          unit.amount != null ? Math.round(unit.amount * quantity * 100) / 100 : null,
      });
    }
  }

  return itemPayload;
}

export function buildCustomerOrderHeaderUpdate(
  draft: CustomerOrderDraft,
  estimate: OrderEstimateResult,
): Record<string, unknown> {
  const pickupFee =
    estimate.lines.find((line) => line.key === "pickup_delivery")?.amount ?? null;

  return {
    currency_prefix: estimate.currencyPrefix ?? "",
    estimated_partial_total: estimate.partialTotal ?? 0,
    estimated_total: estimate.total,
    pickup_fee: pickupFee,
    pickup_date_iso: draft.pickupDeliveryRequested ? draft.pickup?.dateIso ?? null : null,
    pickup_day_label: draft.pickupDeliveryRequested ? draft.pickup?.dayLabel ?? null : null,
    pickup_time_slot_label: draft.pickupDeliveryRequested
      ? draft.pickup?.timeSlotLabel ?? null
      : null,
    pickup_instructions: draft.pickupDeliveryRequested
      ? draft.pickup?.instructions?.trim() ?? ""
      : "",
    delivery_date_iso: draft.pickupDeliveryRequested ? draft.delivery?.dateIso ?? null : null,
    delivery_day_label: draft.pickupDeliveryRequested
      ? draft.delivery?.dayLabel ?? null
      : null,
    delivery_time_slot_label: draft.pickupDeliveryRequested
      ? draft.delivery?.timeSlotLabel ?? null
      : null,
    delivery_instructions: draft.pickupDeliveryRequested
      ? draft.delivery?.instructions?.trim() ?? ""
      : "",
  };
}
