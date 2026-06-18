import type { CustomerOrderDraft, CustomerServiceId } from "@/contexts/customer-order-draft-context";
import { initialWashFoldQuantities } from "@/constants/wash-fold-items";
import type { CustomerOrderDbStatus } from "@/lib/customer-orders";
import {
  buildCustomerOrderHeaderUpdate,
  buildOrderServiceItemRows,
  buildOrderServiceRows,
} from "@/lib/customer-order-payload";
import type { OrderEstimateResult } from "@/lib/customer-order-estimate";
import type { PartnerServiceLine } from "@/lib/partner-discovery";
import { supabase } from "@/lib/supabase";

type OrderForEditRow = {
  id: string;
  partner_id: string;
  status: CustomerOrderDbStatus;
  pickup_date_iso: string | null;
  pickup_day_label: string | null;
  pickup_time_slot_label: string | null;
  pickup_instructions: string;
  delivery_date_iso: string | null;
  delivery_day_label: string | null;
  delivery_time_slot_label: string | null;
  delivery_instructions: string;
};

type ServiceForEditRow = {
  service_type: CustomerServiceId;
  instructions: string;
};

type ItemForEditRow = {
  order_service_id: string;
  service_type: CustomerServiceId;
  item_key: string;
  quantity: number;
};

export function isCustomerOrderEditable(status: CustomerOrderDbStatus): boolean {
  return status === "submitted";
}

export async function fetchCustomerOrderForEdit(
  customerId: string,
  orderId: string,
): Promise<{ draft: CustomerOrderDraft; partnerName: string } | null> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: orderData, error: orderError } = await supabase
    .from("customer_orders")
    .select(
      "id,partner_id,status,pickup_date_iso,pickup_day_label,pickup_time_slot_label,pickup_instructions,delivery_date_iso,delivery_day_label,delivery_time_slot_label,delivery_instructions",
    )
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (orderError) {
    throw new Error(orderError.message);
  }
  if (!orderData) return null;

  const order = orderData as OrderForEditRow;
  if (!isCustomerOrderEditable(order.status)) {
    throw new Error("This order can no longer be edited.");
  }

  const { data: partnerData } = await supabase
    .from("partner_profiles")
    .select("business_name")
    .eq("id", order.partner_id)
    .maybeSingle();
  const partnerName =
    (partnerData as { business_name?: string | null } | null)?.business_name?.trim() ||
    "Launderer";

  const { data: serviceData, error: serviceError } = await supabase
    .from("order_services")
    .select("id,service_type,instructions")
    .eq("order_id", orderId);
  if (serviceError) {
    throw new Error(serviceError.message);
  }

  const serviceRows = (serviceData ?? []) as Array<ServiceForEditRow & { id: string }>;
  const serviceIds = serviceRows.map((row) => row.id);
  const itemsByServiceId = new Map<string, ItemForEditRow[]>();

  if (serviceIds.length > 0) {
    const { data: itemData, error: itemError } = await supabase
      .from("order_service_items")
      .select("order_service_id,service_type,item_key,quantity")
      .in("order_service_id", serviceIds);
    if (itemError) {
      throw new Error(itemError.message);
    }
    for (const item of (itemData ?? []) as ItemForEditRow[]) {
      const list = itemsByServiceId.get(item.order_service_id) ?? [];
      list.push(item);
      itemsByServiceId.set(item.order_service_id, list);
    }
  }

  const selectedServiceIds = serviceRows.map((row) => row.service_type);
  const hasSchedule = Boolean(
    order.pickup_day_label ||
      order.pickup_time_slot_label ||
      order.delivery_day_label ||
      order.delivery_time_slot_label ||
      order.pickup_date_iso ||
      order.delivery_date_iso,
  );

  const washFoldQuantities = { ...initialWashFoldQuantities() };
  let washFoldInstructions = "";
  const dryCleanQuantities: Record<string, number> = {};
  let dryCleanInstructions = "";
  const tailoringQuantities: Record<string, number> = {};
  let tailoringInstructions = "";

  for (const service of serviceRows) {
    const items = itemsByServiceId.get(service.id) ?? [];
    if (service.service_type === "washAndFold") {
      washFoldInstructions = service.instructions?.trim() ?? "";
      for (const item of items) {
        washFoldQuantities[item.item_key] = item.quantity;
      }
    } else if (service.service_type === "dryCleaning") {
      dryCleanInstructions = service.instructions?.trim() ?? "";
      for (const item of items) {
        dryCleanQuantities[item.item_key] = item.quantity;
      }
    } else if (service.service_type === "tailoring") {
      tailoringInstructions = service.instructions?.trim() ?? "";
      for (const item of items) {
        tailoringQuantities[item.item_key] = item.quantity;
      }
    }
  }

  const draft: CustomerOrderDraft = {
    partnerId: order.partner_id,
    partnerName,
    pickupDeliveryRequested: hasSchedule,
    selectedServiceIds,
    washFold: selectedServiceIds.includes("washAndFold")
      ? {
          itemizedQuantities: washFoldQuantities,
          itemizedInstructions: washFoldInstructions,
        }
      : null,
    dryClean: selectedServiceIds.includes("dryCleaning")
      ? {
          itemizedQuantities: dryCleanQuantities,
          itemizedInstructions: dryCleanInstructions,
        }
      : null,
    tailoring: selectedServiceIds.includes("tailoring")
      ? {
          itemizedQuantities: tailoringQuantities,
          itemizedInstructions: tailoringInstructions,
        }
      : null,
    pickup: order.pickup_day_label
      ? {
          dateIso: order.pickup_date_iso ?? "",
          dayLabel: order.pickup_day_label,
          timeSlotLabel: order.pickup_time_slot_label ?? "",
          instructions: order.pickup_instructions ?? "",
        }
      : null,
    delivery: order.delivery_day_label
      ? {
          dateIso: order.delivery_date_iso ?? "",
          dayLabel: order.delivery_day_label,
          timeSlotLabel: order.delivery_time_slot_label ?? "",
          instructions: order.delivery_instructions ?? "",
        }
      : null,
  };

  return { draft, partnerName };
}

type UpdateParams = {
  customerId: string;
  orderId: string;
  draft: CustomerOrderDraft;
  estimate: OrderEstimateResult;
  services: PartnerServiceLine[];
};

export async function updateCustomerOrder({
  customerId,
  orderId,
  draft,
  estimate,
  services,
}: UpdateParams): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!draft.partnerId) {
    return { ok: false, error: "No launderer selected." };
  }
  if (draft.selectedServiceIds.length === 0) {
    return { ok: false, error: "No services selected." };
  }

  const { data: existing, error: existingErr } = await supabase
    .from("customer_orders")
    .select("id,status")
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (existingErr) {
    return { ok: false, error: existingErr.message };
  }
  if (!existing) {
    return { ok: false, error: "Order not found." };
  }
  const status = (existing as { status: CustomerOrderDbStatus }).status;
  if (!isCustomerOrderEditable(status)) {
    return {
      ok: false,
      error: "This order can no longer be edited. Your launderer may have already accepted it.",
    };
  }

  const header = buildCustomerOrderHeaderUpdate(draft, estimate);
  const { error: updateErr } = await supabase
    .from("customer_orders")
    .update(header)
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .eq("status", "submitted");
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  const { error: deleteServicesErr } = await supabase
    .from("order_services")
    .delete()
    .eq("order_id", orderId);
  if (deleteServicesErr) {
    return { ok: false, error: deleteServicesErr.message };
  }

  const servicePayload = buildOrderServiceRows(orderId, draft, estimate);
  const { data: serviceRows, error: serviceErr } = await supabase
    .from("order_services")
    .insert(servicePayload)
    .select("id, service_type");
  if (serviceErr || !serviceRows) {
    return { ok: false, error: serviceErr?.message ?? "Failed to save service rows." };
  }

  const byType = new Map<string, string>();
  for (const row of serviceRows as { id: string; service_type: string }[]) {
    byType.set(row.service_type, row.id);
  }

  const itemPayload = buildOrderServiceItemRows(byType, draft, services);
  if (itemPayload.length > 0) {
    const { error: itemErr } = await supabase.from("order_service_items").insert(itemPayload);
    if (itemErr) {
      return { ok: false, error: itemErr.message };
    }
  }

  return { ok: true };
}
