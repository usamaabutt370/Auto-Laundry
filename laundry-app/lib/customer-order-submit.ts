import { DRY_CLEAN_ITEM_DEFS } from "@/constants/dry-clean-items";
import { TAILORING_ITEM_DEFS } from "@/constants/tailoring-items";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import {
  dryCleanUnitForItem,
  tailoringUnitForItem,
  type OrderEstimateResult,
} from "@/lib/customer-order-estimate";
import type { PartnerServiceLine } from "@/lib/partner-discovery";
import { supabase } from "@/lib/supabase";

type SubmitParams = {
  customerId: string;
  draft: CustomerOrderDraft;
  estimate: OrderEstimateResult;
  services: PartnerServiceLine[];
};

export type PendingOrderResult = {
  orderId: string;
  amountToCharge: number;
  currencyPrefix: string;
};

function sumEstimateByPrefix(estimate: OrderEstimateResult, prefix: string): number | null {
  const lines = estimate.lines.filter(
    (line) => line.key.startsWith(prefix) && line.amount != null,
  );
  if (lines.length === 0) return null;
  const total = lines.reduce((acc, line) => acc + (line.amount ?? 0), 0);
  return Math.round(total * 100) / 100;
}

export async function createPendingCustomerOrder({
  customerId,
  draft,
  estimate,
  services,
}: SubmitParams): Promise<
  { ok: true; data: PendingOrderResult } | { ok: false; error: string }
> {
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!draft.partnerId) {
    return { ok: false, error: "No launderer selected." };
  }
  if (draft.selectedServiceIds.length === 0) {
    return { ok: false, error: "No services selected." };
  }
  const amountToCharge = estimate.total ?? estimate.partialTotal;
  if (!amountToCharge || amountToCharge <= 0) {
    return { ok: false, error: "Unable to calculate payable amount for this order." };
  }

  const pickupFee =
    estimate.lines.find((line) => line.key === "pickup_delivery")?.amount ?? null;

  const { data: orderRow, error: orderErr } = await supabase
    .from("customer_orders")
    .insert({
      customer_id: customerId,
      partner_id: draft.partnerId,
      status: "draft",
      payment_status: "pending",
      currency_prefix: estimate.currencyPrefix ?? "",
      estimated_partial_total: estimate.partialTotal ?? 0,
      estimated_total: estimate.total,
      pickup_fee: pickupFee,
      pickup_date_iso: draft.pickupDeliveryRequested ? draft.pickup?.dateIso ?? null : null,
      pickup_day_label: draft.pickupDeliveryRequested
        ? draft.pickup?.dayLabel ?? null
        : null,
      pickup_time_slot_label: draft.pickupDeliveryRequested
        ? draft.pickup?.timeSlotLabel ?? null
        : null,
      pickup_instructions: draft.pickupDeliveryRequested
        ? draft.pickup?.instructions?.trim() ?? ""
        : "",
      delivery_date_iso: draft.pickupDeliveryRequested
        ? draft.delivery?.dateIso ?? null
        : null,
      delivery_day_label: draft.pickupDeliveryRequested
        ? draft.delivery?.dayLabel ?? null
        : null,
      delivery_time_slot_label: draft.pickupDeliveryRequested
        ? draft.delivery?.timeSlotLabel ?? null
        : null,
      delivery_instructions: draft.pickupDeliveryRequested
        ? draft.delivery?.instructions?.trim() ?? ""
        : "",
      submitted_at: null,
    })
    .select("id")
    .single<{ id: string }>();

  if (orderErr || !orderRow?.id) {
    return { ok: false, error: orderErr?.message ?? "Failed to create order." };
  }

  const orderId = orderRow.id;
  const cleanup = async () => {
    await supabase.from("customer_orders").delete().eq("id", orderId);
  };

  const servicePayload = draft.selectedServiceIds.map((serviceType) => ({
    order_id: orderId,
    service_type: serviceType,
    pricing_mode: "per_item",
    total_item_count:
      serviceType === "washAndFold"
        ? draft.washFold?.pricingMode === "per_item"
          ? draft.washFold?.bagDetailsByIndex[1]?.itemCount ?? 0
          : draft.washFold?.bagCount ?? 0
        : serviceType === "dryCleaning"
          ? DRY_CLEAN_ITEM_DEFS.reduce(
              (acc, def) => acc + (draft.dryClean?.itemizedQuantities[def.id] ?? 0),
              0,
            )
          : TAILORING_ITEM_DEFS.reduce(
              (acc, def) => acc + (draft.tailoring?.itemizedQuantities[def.id] ?? 0),
              0,
            ),
    instructions:
      serviceType === "washAndFold"
        ? draft.washFold?.bagDetailsByIndex[1]?.instructions?.trim() ?? ""
        : serviceType === "dryCleaning"
          ? draft.dryClean?.itemizedInstructions?.trim() ?? ""
          : draft.tailoring?.itemizedInstructions?.trim() ?? "",
    estimated_amount:
      serviceType === "washAndFold"
        ? sumEstimateByPrefix(estimate, "wash_fold")
        : serviceType === "dryCleaning"
          ? sumEstimateByPrefix(estimate, "dry_")
          : sumEstimateByPrefix(estimate, "tailoring_"),
  }));

  const { data: serviceRows, error: serviceErr } = await supabase
    .from("order_services")
    .insert(servicePayload)
    .select("id, service_type");

  if (serviceErr || !serviceRows) {
    await cleanup();
    return { ok: false, error: serviceErr?.message ?? "Failed to save service rows." };
  }

  const byType = new Map<string, string>();
  for (const row of serviceRows as { id: string; service_type: string }[]) {
    byType.set(row.service_type, row.id);
  }

  const itemPayload: {
    order_service_id: string;
    service_type: "dryCleaning" | "tailoring";
    item_key: string;
    item_name: string;
    quantity: number;
    unit_price_display: string | null;
    unit_price_amount: number | null;
    line_total_amount: number | null;
  }[] = [];

  const dryServiceId = byType.get("dryCleaning");
  if (dryServiceId && draft.dryClean) {
    for (const def of DRY_CLEAN_ITEM_DEFS) {
      const quantity = draft.dryClean.itemizedQuantities[def.id] ?? 0;
      if (quantity <= 0) continue;
      const unit = dryCleanUnitForItem(services, def.name);
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

  const tailoringServiceId = byType.get("tailoring");
  if (tailoringServiceId && draft.tailoring) {
    for (const def of TAILORING_ITEM_DEFS) {
      const quantity = draft.tailoring.itemizedQuantities[def.id] ?? 0;
      if (quantity <= 0) continue;
      const unit = tailoringUnitForItem(services, def.name);
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

  if (itemPayload.length > 0) {
    const { error: itemErr } = await supabase.from("order_service_items").insert(itemPayload);
    if (itemErr) {
      await cleanup();
      return { ok: false, error: itemErr.message };
    }
  }

  return {
    ok: true,
    data: {
      orderId,
      amountToCharge,
      currencyPrefix: estimate.currencyPrefix || "",
    },
  };
}

export async function markOrderPaid(
  orderId: string,
  paymentIntentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase
    .from("customer_orders")
    .update({
      status: "submitted",
      payment_status: "paid",
      payment_method_type: "card",
      payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markOrderPaymentFailed(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase
    .from("customer_orders")
    .update({
      payment_status: "failed",
    })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
