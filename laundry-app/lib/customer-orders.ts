import { supabase } from "@/lib/supabase";

/** DB values on customer_orders.status */
export type CustomerOrderDbStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "in_progress"
  | "ready"
  | "completed"
  | "rejected"
  | "cancelled";

/** What we show the customer: pending → partner, accepted → working, terminal states. */
export type CustomerOrderDisplayStatus = "pending" | "accepted" | "rejected" | "completed";

export interface CustomerOrderListItem {
  id: string;
  /** Short reference e.g. first 8 chars of UUID */
  orderRef: string;
  partnerId: string;
  partnerName: string;
  /** @deprecated Prefer scheduleLines — kept for any legacy use */
  subtitle: string;
  /** One line per schedule: pickup and/or delivery when set */
  scheduleLines: string[];
  /** Comma-separated service names (Wash & Fold, etc.) */
  servicesSummary: string;
  /** ISO timestamp for placed-on display */
  placedAtIso: string | null;
  estimatedTotalLabel: string;
  /** When pickup fee applies */
  pickupFeeLabel: string | null;
  /** Truncated combined instructions, or null */
  notesPreview: string | null;
  rejectionReasonOption: string | null;
  rejectionReasonDetails: string | null;
  displayStatus: CustomerOrderDisplayStatus;
  rawStatus: CustomerOrderDbStatus;
  updatedAt: string;
}

export interface CustomerOrderDetailLineItem {
  id: string;
  name: string;
  quantity: number;
  estimatedPriceLabel: string;
  preferences: string;
}

export interface CustomerOrderDetailServiceGroup {
  id: string;
  title: string;
  instructions: string;
  estimatedPriceLabel: string;
  items: CustomerOrderDetailLineItem[];
}

export interface CustomerOrderDetailData {
  id: string;
  orderRef: string;
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  partnerAddress: string;
  displayStatus: CustomerOrderDisplayStatus;
  rawStatus: CustomerOrderDbStatus;
  pickupSchedule: string;
  deliverySchedule: string;
  estimatedTotalLabel: string;
  totalItems: number;
  notes: string;
  rejectionReasonOption: string | null;
  rejectionReasonDetails: string | null;
  serviceGroups: CustomerOrderDetailServiceGroup[];
  placedAtIso: string | null;
}

export type CustomerOrderFeedbackType = "feedback" | "complaint" | "suggestion";

export interface CustomerOrderFeedbackInput {
  orderId: string;
  customerId: string;
  partnerId: string;
  rating: number;
  feedbackType: CustomerOrderFeedbackType;
  message: string;
}

type OrderRow = {
  id: string;
  partner_id: string;
  status: CustomerOrderDbStatus;
  estimated_total: number | null;
  estimated_partial_total: number;
  pickup_fee: number | null;
  pickup_day_label: string | null;
  pickup_time_slot_label: string | null;
  pickup_instructions: string;
  delivery_day_label: string | null;
  delivery_time_slot_label: string | null;
  delivery_instructions: string;
  rejection_reason_option: string | null;
  rejection_reason_details: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

type OrderServiceRow = {
  id?: string;
  order_id: string;
  service_type: "washAndFold" | "dryCleaning" | "tailoring";
  instructions?: string;
  estimated_amount?: number | null;
};

type PartnerRow = {
  id: string;
  business_name: string;
  phone_number?: string | null;
  address?: string | null;
};

type CustomerOrderFeedbackRow = {
  id: string;
  order_id: string;
};

type OrderServiceItemDetailRow = {
  id: string;
  order_service_id: string;
  item_name: string;
  quantity: number;
  line_total_amount: number | null;
};

function formatUsd(amount: number): string {
  // Display amounts with `Rs` prefix instead of dollar sign
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs ${formatted}`;
}

function formatSchedule(day: string | null, time: string | null, fallback: string): string {
  if (!day && !time) return fallback;
  return [day, time].filter(Boolean).join(" · ");
}

function serviceTypeLabel(serviceType: OrderServiceRow["service_type"]): string {
  switch (serviceType) {
    case "washAndFold":
      return "Wash & Fold";
    case "dryCleaning":
      return "Dry Cleaning";
    case "tailoring":
      return "Tailoring";
    default:
      return serviceType;
  }
}

function summarizeServiceTypes(types: OrderServiceRow["service_type"][]): string {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const t of types) {
    const label = serviceTypeLabel(t);
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.join(", ");
}

function notesPreview(
  pickup: string,
  delivery: string,
  maxLen = 100,
): string | null {
  const parts = [pickup.trim(), delivery.trim()].filter(Boolean);
  if (parts.length === 0) return null;
  const combined = parts.join(" · ");
  if (combined.length <= maxLen) return combined;
  return `${combined.slice(0, maxLen - 1)}…`;
}

export function mapDbStatusForCustomer(
  status: CustomerOrderDbStatus,
): CustomerOrderDisplayStatus {
  if (status === "submitted" || status === "draft") return "pending";
  if (status === "completed") return "completed";
  if (status === "rejected" || status === "cancelled") return "rejected";
  // accepted, in_progress, ready — partner has taken / is working the order
  return "accepted";
}

async function fetchPartnerNames(partnerIds: string[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(partnerIds.filter(Boolean)));
  if (!supabase || ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("partner_profiles")
    .select("id,business_name")
    .in("id", ids);
  if (error || !data) return new Map();

  return new Map(
    (data as PartnerRow[]).map((row) => [
      row.id,
      row.business_name?.trim() || "Launderer",
    ]),
  );
}

export async function deleteCustomerOrder(orderId: string): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("customer_orders")
    .delete()
    .eq("id", orderId)
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  if (!data?.length) {
    throw new Error("Order could not be deleted. It may not exist or you may not have access.");
  }
}

export async function reassignRejectedCustomerOrder(
  orderId: string,
  newPartnerId: string,
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("customer_orders")
    .update({
      partner_id: newPartnerId,
      status: "submitted",
      rejection_reason_option: null,
      rejection_reason_details: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "rejected")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Only rejected orders can be reassigned.");
  }
}

export async function fetchCustomerOrders(customerId: string): Promise<CustomerOrderListItem[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("customer_orders")
    .select(
      "id,partner_id,status,estimated_total,estimated_partial_total,pickup_fee,pickup_day_label,pickup_time_slot_label,pickup_instructions,delivery_day_label,delivery_time_slot_label,delivery_instructions,rejection_reason_option,rejection_reason_details,submitted_at,created_at,updated_at",
    )
    .eq("customer_id", customerId)
    .neq("status", "draft")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as OrderRow[];
  const partners = await fetchPartnerNames(rows.map((r) => r.partner_id));

  const orderIds = rows.map((r) => r.id);
  const servicesByOrderId = new Map<string, OrderServiceRow["service_type"][]>();

  if (orderIds.length > 0) {
    const { data: svcData, error: svcErr } = await supabase
      .from("order_services")
      .select("order_id,service_type")
      .in("order_id", orderIds);
    if (!svcErr && svcData) {
      for (const row of svcData as OrderServiceRow[]) {
        const list = servicesByOrderId.get(row.order_id) ?? [];
        list.push(row.service_type);
        servicesByOrderId.set(row.order_id, list);
      }
    }
  }

  return rows.map((order) => {
    const hasPickupSlot = Boolean(order.pickup_day_label || order.pickup_time_slot_label);
    const hasDeliverySlot = Boolean(order.delivery_day_label || order.delivery_time_slot_label);

    const scheduleLines: string[] = [];
    if (hasPickupSlot) {
      scheduleLines.push(
        `Pickup · ${formatSchedule(
          order.pickup_day_label,
          order.pickup_time_slot_label,
          "TBD",
        )}`,
      );
    }
    if (hasDeliverySlot) {
      scheduleLines.push(
        `Delivery · ${formatSchedule(
          order.delivery_day_label,
          order.delivery_time_slot_label,
          "TBD",
        )}`,
      );
    }

    const hasPickup = Boolean(order.pickup_day_label || order.pickup_time_slot_label);
    const subtitle = hasPickup
      ? `Pickup ${formatSchedule(
          order.pickup_day_label,
          order.pickup_time_slot_label,
          "schedule TBD",
        )}`
      : `Delivery ${formatSchedule(
          order.delivery_day_label,
          order.delivery_time_slot_label,
          "schedule TBD",
        )}`;

    const svcTypes = servicesByOrderId.get(order.id) ?? [];
    const servicesSummary = summarizeServiceTypes(svcTypes);

    const total = order.estimated_total ?? order.estimated_partial_total ?? 0;
    const fee = order.pickup_fee;
    const pickupFeeLabel =
      fee != null && fee > 0 ? formatUsd(fee) : null;

    return {
      id: order.id,
      orderRef: order.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
      partnerId: order.partner_id,
      partnerName: partners.get(order.partner_id) ?? "Launderer",
      subtitle,
      scheduleLines,
      servicesSummary,
      placedAtIso: order.submitted_at ?? order.created_at,
      estimatedTotalLabel: formatUsd(total),
      pickupFeeLabel,
      notesPreview: notesPreview(order.pickup_instructions, order.delivery_instructions),
      rejectionReasonOption: order.rejection_reason_option?.trim() || null,
      rejectionReasonDetails: order.rejection_reason_details?.trim() || null,
      displayStatus: mapDbStatusForCustomer(order.status),
      rawStatus: order.status,
      updatedAt: order.updated_at,
    };
  });
}

export async function findOrdersMissingFeedback(
  customerId: string,
  completedOrderIds: string[],
): Promise<Set<string>> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  if (completedOrderIds.length === 0) {
    return new Set();
  }

  const uniqueOrderIds = Array.from(new Set(completedOrderIds));
  const { data, error } = await supabase
    .from("customer_order_feedback")
    .select("order_id")
    .eq("customer_id", customerId)
    .in("order_id", uniqueOrderIds);
  if (error) {
    throw new Error(error.message);
  }

  const submitted = new Set(
    ((data ?? []) as Array<{ order_id: string }>).map((row) => row.order_id),
  );
  return new Set(uniqueOrderIds.filter((id) => !submitted.has(id)));
}

export async function fetchCustomerOrderDetail(
  customerId: string,
  orderId: string,
): Promise<CustomerOrderDetailData | null> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("customer_orders")
    .select(
      "id,partner_id,status,estimated_total,estimated_partial_total,pickup_day_label,pickup_time_slot_label,pickup_instructions,delivery_day_label,delivery_time_slot_label,delivery_instructions,rejection_reason_option,rejection_reason_details,submitted_at,created_at",
    )
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  const order = data as OrderRow & { customer_id?: string };

  const { data: partnerData } = await supabase
    .from("partner_profiles")
    .select("id,business_name,phone_number,address")
    .eq("id", order.partner_id)
    .maybeSingle();
  const partner = (partnerData as PartnerRow | null) ?? null;

  const { data: serviceData, error: serviceError } = await supabase
    .from("order_services")
    .select("id,order_id,service_type,instructions,estimated_amount")
    .eq("order_id", order.id);
  if (serviceError) {
    throw new Error(serviceError.message);
  }
  const serviceRows = (serviceData ?? []) as Array<
    Required<Pick<OrderServiceRow, "id" | "order_id" | "service_type">> &
      Pick<OrderServiceRow, "instructions" | "estimated_amount">
  >;

  const serviceIds = serviceRows.map((row) => row.id);
  const itemsByServiceId = new Map<string, OrderServiceItemDetailRow[]>();
  if (serviceIds.length > 0) {
    const { data: itemData, error: itemError } = await supabase
      .from("order_service_items")
      .select("id,order_service_id,item_name,quantity,line_total_amount")
      .in("order_service_id", serviceIds);
    if (itemError) {
      throw new Error(itemError.message);
    }
    for (const item of (itemData ?? []) as OrderServiceItemDetailRow[]) {
      const list = itemsByServiceId.get(item.order_service_id) ?? [];
      list.push(item);
      itemsByServiceId.set(item.order_service_id, list);
    }
  }

  const serviceGroups: CustomerOrderDetailServiceGroup[] = serviceRows.map((service) => {
    const serviceItems = itemsByServiceId.get(service.id) ?? [];
    const fallbackAmount = service.estimated_amount ?? 0;
    const items: CustomerOrderDetailLineItem[] =
      serviceItems.length > 0
        ? serviceItems.map((item) => ({
            id: item.id,
            name: item.item_name,
            quantity: item.quantity,
            estimatedPriceLabel: formatUsd(item.line_total_amount ?? 0),
            preferences: service.instructions?.trim() || "None",
          }))
        : [
            {
              id: service.id,
              name: serviceTypeLabel(service.service_type),
              quantity: 0,
              estimatedPriceLabel: formatUsd(fallbackAmount),
              preferences: service.instructions?.trim() || "None",
            },
          ];

    return {
      id: service.id,
      title: serviceTypeLabel(service.service_type),
      instructions: service.instructions?.trim() || "No special instructions",
      estimatedPriceLabel: formatUsd(fallbackAmount),
      items,
    };
  });

  const notes = Array.from(
    new Set(serviceGroups.map((group) => group.instructions).filter(Boolean)),
  ).join("\n");
  const totalItems = serviceGroups.reduce(
    (sum, group) =>
      sum + group.items.reduce((innerSum, item) => innerSum + (item.quantity > 0 ? item.quantity : 0), 0),
    0,
  );
  const totalAmount = order.estimated_total ?? order.estimated_partial_total ?? 0;

  return {
    id: order.id,
    orderRef: order.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
    partnerId: order.partner_id,
    partnerName: partner?.business_name?.trim() || "Launderer",
    partnerPhone: partner?.phone_number?.trim() || "Not provided",
    partnerAddress: partner?.address?.trim() || "Address not available",
    displayStatus: mapDbStatusForCustomer(order.status),
    rawStatus: order.status,
    pickupSchedule: formatSchedule(
      order.pickup_day_label,
      order.pickup_time_slot_label,
      "Not scheduled",
    ),
    deliverySchedule: formatSchedule(
      order.delivery_day_label,
      order.delivery_time_slot_label,
      "Not scheduled",
    ),
    estimatedTotalLabel: formatUsd(totalAmount),
    totalItems,
    notes: notes || "No special instructions",
    rejectionReasonOption: order.rejection_reason_option?.trim() || null,
    rejectionReasonDetails: order.rejection_reason_details?.trim() || null,
    serviceGroups,
    placedAtIso: order.submitted_at ?? order.created_at,
  };
}

export async function hasCustomerOrderFeedback(
  customerId: string,
  orderId: string,
): Promise<boolean> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("customer_order_feedback")
    .select("id,order_id")
    .eq("customer_id", customerId)
    .eq("order_id", orderId)
    .maybeSingle<CustomerOrderFeedbackRow>();
  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function submitCustomerOrderFeedback(
  input: CustomerOrderFeedbackInput,
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  if (!input.message.trim()) {
    throw new Error("Please add your feedback.");
  }
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Please choose a rating between 1 and 5.");
  }

  const { error } = await supabase.from("customer_order_feedback").insert({
    order_id: input.orderId,
    customer_id: input.customerId,
    partner_id: input.partnerId,
    rating: input.rating,
    feedback_type: input.feedbackType,
    message: input.message.trim(),
  });
  if (error) {
    throw new Error(error.message);
  }
}
