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
  displayStatus: CustomerOrderDisplayStatus;
  rawStatus: CustomerOrderDbStatus;
  updatedAt: string;
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
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

type OrderServiceRow = {
  order_id: string;
  service_type: "washAndFold" | "dryCleaning" | "tailoring";
};

type PartnerRow = {
  id: string;
  business_name: string;
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
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
      "id,partner_id,status,estimated_total,estimated_partial_total,pickup_fee,pickup_day_label,pickup_time_slot_label,pickup_instructions,delivery_day_label,delivery_time_slot_label,delivery_instructions,submitted_at,created_at,updated_at",
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
      partnerName: partners.get(order.partner_id) ?? "Launderer",
      subtitle,
      scheduleLines,
      servicesSummary,
      placedAtIso: order.submitted_at ?? order.created_at,
      estimatedTotalLabel: formatUsd(total),
      pickupFeeLabel,
      notesPreview: notesPreview(order.pickup_instructions, order.delivery_instructions),
      displayStatus: mapDbStatusForCustomer(order.status),
      rawStatus: order.status,
      updatedAt: order.updated_at,
    };
  });
}
