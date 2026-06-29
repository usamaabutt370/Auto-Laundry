import {
  ensureOrderConversation,
  sendRiderAssignmentMessage,
  type RiderAssignmentMetadata,
} from "@/lib/chat";
import { partnerUpdateOrderStatus } from "@/lib/partner-order-status";
import { fetchPartnerRiders, type PartnerRider } from "@/lib/partner-riders";
import { isPartnerVerified } from "@/lib/partner-verification";
import { supabase } from "@/lib/supabase";

export function partnerOrderNeedsRider(order: { orderType: "dropoff" | "delivery" }): boolean {
  return order.orderType === "delivery";
}

export function partnerOrderDetailNeedsRider(pickup: string): boolean {
  const normalized = pickup.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "not scheduled";
}

type OrderSummaryRow = {
  id: string;
  customer_id: string;
  partner_id: string;
  estimated_total: number | null;
  estimated_partial_total: number | null;
  pickup_day_label: string | null;
  pickup_time_slot_label: string | null;
  delivery_day_label: string | null;
  delivery_time_slot_label: string | null;
};

type PartnerProfileRow = {
  business_name: string | null;
};

type CustomerProfileRow = {
  address: string | null;
};

function formatSchedule(
  dayLabel: string | null,
  timeLabel: string | null,
  fallback: string,
): string {
  const day = dayLabel?.trim();
  const time = timeLabel?.trim();
  if (day && time) return `${day} at ${time}`;
  if (day) return day;
  if (time) return time;
  return fallback;
}

function formatMoney(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs ${formatted}`;
}

function formatOrderRef(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

async function fetchOrderAssignmentContext(orderId: string, partnerId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: order, error: orderError } = await supabase
    .from("customer_orders")
    .select(
      "id,customer_id,partner_id,estimated_total,estimated_partial_total,pickup_day_label,pickup_time_slot_label,delivery_day_label,delivery_time_slot_label",
    )
    .eq("id", orderId)
    .eq("partner_id", partnerId)
    .maybeSingle<OrderSummaryRow>();
  if (orderError) throw new Error(orderError.message);
  if (!order) throw new Error("Order not found.");

  const { data: serviceRows, error: serviceError } = await supabase
    .from("order_services")
    .select("service_type")
    .eq("order_id", orderId);
  if (serviceError) throw new Error(serviceError.message);

  const serviceLabels = (serviceRows ?? []).map((row) => {
    switch ((row as { service_type: string }).service_type) {
      case "washAndFold":
        return "Wash & Fold";
      case "dryCleaning":
        return "Dry Cleaning";
      case "tailoring":
        return "Tailoring";
      default:
        return "Laundry";
    }
  });
  const servicesSummary = Array.from(new Set(serviceLabels)).join(", ") || "Laundry order";

  const [{ data: partnerProfile }, { data: customerProfile }, partnerVerified] = await Promise.all([
    supabase
      .from("partner_profiles")
      .select("business_name")
      .eq("id", partnerId)
      .maybeSingle<PartnerProfileRow>(),
    supabase
      .from("profiles")
      .select("address")
      .eq("id", order.customer_id)
      .maybeSingle<CustomerProfileRow>(),
    isPartnerVerified(partnerId),
  ]);

  const total = order.estimated_total ?? order.estimated_partial_total ?? 0;

  return {
    order,
    servicesSummary,
    partnerName: partnerProfile?.business_name?.trim() || "Laundry Captain",
    partnerVerified,
    address: customerProfile?.address?.trim() || "Address not available",
    estimatedTotal: formatMoney(total),
    pickup: formatSchedule(
      order.pickup_day_label,
      order.pickup_time_slot_label,
      "Not scheduled",
    ),
    delivery: formatSchedule(
      order.delivery_day_label,
      order.delivery_time_slot_label,
      "Not scheduled",
    ),
  };
}

function isMissingAssignedRiderColumnError(message: string): boolean {
  return message.toLowerCase().includes("assigned_rider");
}

async function assignOrderRiderOnOrder(
  orderId: string,
  partnerId: string,
  rider: PartnerRider,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("customer_orders")
    .update({
      assigned_rider_id: rider.id,
      assigned_rider_name: rider.name,
      assigned_rider_phone: rider.phone,
      assigned_rider_photo_url: rider.photoUrl,
    })
    .eq("id", orderId)
    .eq("partner_id", partnerId);

  if (error && !isMissingAssignedRiderColumnError(error.message)) {
    throw new Error(error.message);
  }
}

export async function acceptOrderWithRider(params: {
  orderId: string;
  partnerId: string;
  riderId: string;
}): Promise<void> {
  const riders = await fetchPartnerRiders(params.partnerId);
  const rider = riders.find((item) => item.id === params.riderId);
  if (!rider) {
    throw new Error("Selected rider was not found.");
  }

  await partnerUpdateOrderStatus(params.orderId, "accepted", undefined, params.riderId);
  await assignOrderRiderOnOrder(params.orderId, params.partnerId, rider);
  await notifyCustomerRiderAssigned({
    orderId: params.orderId,
    partnerId: params.partnerId,
    rider,
  });
}

export async function notifyCustomerRiderAssigned(params: {
  orderId: string;
  partnerId: string;
  rider: PartnerRider;
}): Promise<void> {
  const context = await fetchOrderAssignmentContext(params.orderId, params.partnerId);
  const conversationId = await ensureOrderConversation(
    params.orderId,
    params.partnerId,
    "launderer",
  );

  const metadata: RiderAssignmentMetadata = {
    riderName: params.rider.name,
    riderPhotoUrl: params.rider.photoUrl,
    partnerName: context.partnerName,
    partnerVerified: context.partnerVerified,
    orderId: params.orderId,
    orderNumber: formatOrderRef(params.orderId),
    servicesSummary: context.servicesSummary,
    estimatedTotal: context.estimatedTotal,
    pickup: context.pickup,
    delivery: context.delivery,
    address: context.address,
  };

  await sendRiderAssignmentMessage(
    conversationId,
    params.partnerId,
    "Your pickup rider has been assigned. You can track your order from here.",
    metadata,
  );
}
