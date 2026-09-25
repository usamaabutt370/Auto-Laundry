import { fetchVerifiedPartnerIds } from "@/lib/partner-verification";
import type { PartnerFulfillmentMode } from "@/lib/partner-discovery";
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
  partnerVerified: boolean;
  partnerImageUrl: string | null;
  partnerAddress: string | null;
  partnerRatingAvg: number | null;
  partnerRatingCount: number;
  /** @deprecated Prefer scheduleLines — kept for any legacy use */
  subtitle: string;
  /** One line per schedule: pickup and/or delivery when set */
  scheduleLines: string[];
  pickupDayLabel: string | null;
  pickupTimeLabel: string | null;
  deliveryDayLabel: string | null;
  deliveryTimeLabel: string | null;
  /** Customer address used for pickup location on the card */
  customerPickupAddress: string | null;
  /** Comma-separated service names (Wash & Fold, etc.) */
  servicesSummary: string;
  /** Top item lines for the card preview */
  itemPreview: { name: string; quantity: number; priceLabel: string | null }[];
  addOnCount: number;
  /** ISO timestamp for placed-on display */
  placedAtIso: string | null;
  estimatedTotalLabel: string;
  /** When pickup fee applies */
  pickupFeeLabel: string | null;
  /** Truncated combined instructions, or null */
  notesPreview: string | null;
  rejectionReasonOption: string | null;
  rejectionReasonDetails: string | null;
  fulfillmentMode: PartnerFulfillmentMode;
  displayStatus: CustomerOrderDisplayStatus;
  rawStatus: CustomerOrderDbStatus;
  updatedAt: string;
}

export interface CustomerOrderDetailLineItem {
  id: string;
  name: string;
  quantity: number;
  confirmedQuantity: number | null;
  estimatedPriceLabel: string;
  confirmedPriceLabel: string | null;
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
  partnerVerified: boolean;
  partnerPhone: string;
  partnerAddress: string;
  partnerImageUrl: string | null;
  partnerRatingAvg: number | null;
  partnerRatingCount: number;
  partnerAvailableTime: string | null;
  partnerLatitude: number | null;
  partnerLongitude: number | null;
  displayStatus: CustomerOrderDisplayStatus;
  rawStatus: CustomerOrderDbStatus;
  pickupSchedule: string;
  deliverySchedule: string;
  pickupDayLabel: string | null;
  pickupTimeLabel: string | null;
  deliveryDayLabel: string | null;
  deliveryTimeLabel: string | null;
  customerPickupAddress: string | null;
  estimatedTotalLabel: string;
  confirmedTotalLabel: string | null;
  confirmedAt: string | null;
  pickupFee: number | null;
  pickupFeeLabel: string | null;
  grandTotalLabel: string;
  totalItems: number;
  notes: string | null;
  rejectionReasonOption: string | null;
  rejectionReasonDetails: string | null;
  fulfillmentMode: PartnerFulfillmentMode;
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
  confirmed_total: number | null;
  confirmed_at: string | null;
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
  service_type: "washAndFold" | "dryCleaning" | "tailoring" | "press";
  instructions?: string;
  estimated_amount?: number | null;
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
  confirmed_quantity: number | null;
  line_total_amount: number | null;
  confirmed_line_total_amount: number | null;
};

function inferOrderFulfillmentMode(order: {
  pickup_fee?: number | null;
  pickup_day_label?: string | null;
  pickup_time_slot_label?: string | null;
  delivery_day_label?: string | null;
  delivery_time_slot_label?: string | null;
}): PartnerFulfillmentMode {
  const hasPickupDelivery =
    (order.pickup_fee != null && order.pickup_fee > 0) ||
    Boolean(order.pickup_day_label?.trim()) ||
    Boolean(order.pickup_time_slot_label?.trim()) ||
    Boolean(order.delivery_day_label?.trim()) ||
    Boolean(order.delivery_time_slot_label?.trim());
  return hasPickupDelivery ? "pickupDelivery" : "dropoff";
}

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
    case "press":
      return "Ironing & Press";
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

type PartnerRow = {
  id: string;
  business_name: string;
  phone_number?: string | null;
  address?: string | null;
  image_url?: string | null;
  business_images?: string[] | null;
  updated_at?: string | null;
  available_time?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type PartnerListMeta = {
  name: string;
  imageUrl: string | null;
  address: string | null;
};

async function fetchPartnerListMeta(
  partnerIds: string[],
): Promise<Map<string, PartnerListMeta>> {
  const ids = Array.from(new Set(partnerIds.filter(Boolean)));
  if (!supabase || ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("partner_profiles")
    .select("id,business_name,address,image_url,business_images,updated_at")
    .in("id", ids);
  if (error || !data) return new Map();

  const map = new Map<string, PartnerListMeta>();
  for (const row of data as PartnerRow[]) {
    const images = Array.isArray(row.business_images)
      ? row.business_images.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];
    const imageUrl =
      images[0] ??
      (row.image_url?.trim()
        ? `${row.image_url.trim()}${row.updated_at ? `?t=${encodeURIComponent(row.updated_at)}` : ""}`
        : null);
    map.set(row.id, {
      name: row.business_name?.trim() || "Laundry Captain",
      imageUrl,
      address: row.address?.trim() || null,
    });
  }
  return map;
}

async function fetchPartnerRatingStats(
  partnerIds: string[],
): Promise<Map<string, { avg: number; count: number }>> {
  const ids = Array.from(new Set(partnerIds.filter(Boolean)));
  if (!supabase || ids.length === 0) return new Map();

  const { data, error } = await supabase.rpc("partner_rating_stats", {
    partner_ids: ids,
  });
  if (error || !data) return new Map();

  const map = new Map<string, { avg: number; count: number }>();
  for (const row of data as Array<{
    partner_id?: string;
    avg_rating?: number | string;
    review_count?: number;
  }>) {
    if (!row.partner_id) continue;
    const count = Number(row.review_count) || 0;
    const avg = Number(row.avg_rating);
    if (count <= 0 || !Number.isFinite(avg)) continue;
    map.set(row.partner_id, { avg, count });
  }
  return map;
}

function countAddOnsFromInstructions(instructions: string | null | undefined): number {
  if (!instructions) return 0;
  const match = instructions.match(/Add-ons:\s*(.+)/i);
  if (!match) return 0;
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean).length;
}

async function fetchPartnerNames(partnerIds: string[]): Promise<Map<string, string>> {
  const meta = await fetchPartnerListMeta(partnerIds);
  return new Map(Array.from(meta.entries()).map(([id, value]) => [id, value.name]));
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

  const { error } = await supabase.rpc("customer_reassign_rejected_order", {
    p_order_id: orderId,
    p_new_partner_id: newPartnerId,
  });

  if (error) {
    throw new Error(error.message);
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
  const partnerIds = rows.map((r) => r.partner_id);
  const [partners, verifiedPartnerIds, ratings, customerProfile] = await Promise.all([
    fetchPartnerListMeta(partnerIds),
    fetchVerifiedPartnerIds(partnerIds),
    fetchPartnerRatingStats(partnerIds),
    supabase
      .from("profiles")
      .select("address")
      .eq("id", customerId)
      .maybeSingle<{ address: string | null }>(),
  ]);
  const customerPickupAddress = customerProfile.data?.address?.trim() || null;

  const orderIds = rows.map((r) => r.id);
  const servicesByOrderId = new Map<
    string,
    Array<{
      id: string;
      service_type: OrderServiceRow["service_type"];
      instructions: string;
    }>
  >();

  if (orderIds.length > 0) {
    const { data: svcData, error: svcErr } = await supabase
      .from("order_services")
      .select("id,order_id,service_type,instructions")
      .in("order_id", orderIds);
    if (!svcErr && svcData) {
      for (const row of svcData as Array<
        Required<Pick<OrderServiceRow, "id" | "order_id" | "service_type">> & {
          instructions?: string | null;
        }
      >) {
        const list = servicesByOrderId.get(row.order_id) ?? [];
        list.push({
          id: row.id,
          service_type: row.service_type,
          instructions: row.instructions ?? "",
        });
        servicesByOrderId.set(row.order_id, list);
      }
    }
  }

  const serviceIds = Array.from(servicesByOrderId.values())
    .flat()
    .map((service) => service.id);
  const itemsByServiceId = new Map<
    string,
    Array<{ name: string; quantity: number; priceLabel: string | null }>
  >();
  if (serviceIds.length > 0) {
    const { data: itemData, error: itemErr } = await supabase
      .from("order_service_items")
      .select("order_service_id,item_name,quantity,line_total_amount")
      .in("order_service_id", serviceIds);
    if (!itemErr && itemData) {
      for (const item of itemData as Array<{
        order_service_id: string;
        item_name: string;
        quantity: number;
        line_total_amount: number | null;
      }>) {
        const list = itemsByServiceId.get(item.order_service_id) ?? [];
        list.push({
          name: item.item_name,
          quantity: item.quantity,
          priceLabel:
            item.line_total_amount != null && Number.isFinite(item.line_total_amount)
              ? formatUsd(item.line_total_amount)
              : null,
        });
        itemsByServiceId.set(item.order_service_id, list);
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

    const orderServices = servicesByOrderId.get(order.id) ?? [];
    const servicesSummary = summarizeServiceTypes(
      orderServices.map((service) => service.service_type),
    );
    const itemPreview = orderServices
      .flatMap((service) => itemsByServiceId.get(service.id) ?? [])
      .slice(0, 4);
    const addOnCount = orderServices.reduce(
      (sum, service) => sum + countAddOnsFromInstructions(service.instructions),
      0,
    );

    const total = order.estimated_total ?? order.estimated_partial_total ?? 0;
    const fee = order.pickup_fee;
    const pickupFeeLabel =
      fee != null && fee > 0 ? formatUsd(fee) : null;
    const partner = partners.get(order.partner_id);
    const rating = ratings.get(order.partner_id);

    return {
      id: order.id,
      orderRef: order.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
      partnerId: order.partner_id,
      partnerName: partner?.name ?? "Launderer",
      partnerVerified: verifiedPartnerIds.has(order.partner_id),
      partnerImageUrl: partner?.imageUrl ?? null,
      partnerAddress: partner?.address ?? null,
      partnerRatingAvg: rating?.avg ?? null,
      partnerRatingCount: rating?.count ?? 0,
      subtitle,
      scheduleLines,
      pickupDayLabel: order.pickup_day_label?.trim() || null,
      pickupTimeLabel: order.pickup_time_slot_label?.trim() || null,
      deliveryDayLabel: order.delivery_day_label?.trim() || null,
      deliveryTimeLabel: order.delivery_time_slot_label?.trim() || null,
      customerPickupAddress,
      servicesSummary,
      itemPreview,
      addOnCount,
      placedAtIso: order.submitted_at ?? order.created_at,
      estimatedTotalLabel: formatUsd(total),
      pickupFeeLabel,
      notesPreview: notesPreview(order.pickup_instructions, order.delivery_instructions),
      rejectionReasonOption: order.rejection_reason_option?.trim() || null,
      rejectionReasonDetails: order.rejection_reason_details?.trim() || null,
      fulfillmentMode: inferOrderFulfillmentMode(order),
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
      "id,partner_id,status,estimated_total,estimated_partial_total,confirmed_total,confirmed_at,pickup_fee,pickup_day_label,pickup_time_slot_label,pickup_instructions,delivery_day_label,delivery_time_slot_label,delivery_instructions,rejection_reason_option,rejection_reason_details,submitted_at,created_at",
    )
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  const order = data as OrderRow & { customer_id?: string };

  const [{ data: partnerData }, verifiedPartnerIds, ratings, customerProfile] =
    await Promise.all([
      supabase
        .from("partner_profiles")
        .select(
          "id,business_name,phone_number,address,image_url,business_images,updated_at,available_time,latitude,longitude",
        )
        .eq("id", order.partner_id)
        .maybeSingle(),
      fetchVerifiedPartnerIds([order.partner_id]),
      fetchPartnerRatingStats([order.partner_id]),
      supabase
        .from("profiles")
        .select("address")
        .eq("id", customerId)
        .maybeSingle<{ address: string | null }>(),
    ]);
  const partner = (partnerData as PartnerRow | null) ?? null;
  const rating = ratings.get(order.partner_id);
  const partnerImages = Array.isArray(partner?.business_images)
    ? partner.business_images.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];
  const partnerImageUrl =
    partnerImages[0] ??
    (partner?.image_url?.trim()
      ? `${partner.image_url.trim()}${
          partner.updated_at ? `?t=${encodeURIComponent(partner.updated_at)}` : ""
        }`
      : null);
  const partnerLatitude = Number(partner?.latitude);
  const partnerLongitude = Number(partner?.longitude);

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
      .select(
        "id,order_service_id,item_name,quantity,confirmed_quantity,line_total_amount,confirmed_line_total_amount",
      )
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

  const serviceGroups: CustomerOrderDetailServiceGroup[] = serviceRows
    .filter((service) => {
      const hasItems = (itemsByServiceId.get(service.id) ?? []).length > 0;
      const hasAmount = (service.estimated_amount ?? 0) > 0;
      return hasItems || hasAmount;
    })
    .map((service) => {
    const serviceItems = itemsByServiceId.get(service.id) ?? [];
    const fallbackAmount = service.estimated_amount ?? 0;
    const items: CustomerOrderDetailLineItem[] =
      serviceItems.length > 0
        ? serviceItems.map((item) => ({
          id: item.id,
          name: item.item_name,
          quantity: item.quantity,
          confirmedQuantity: item.confirmed_quantity,
          estimatedPriceLabel: formatUsd(item.line_total_amount ?? 0),
          confirmedPriceLabel:
            item.confirmed_line_total_amount != null
              ? formatUsd(item.confirmed_line_total_amount)
              : null,
          preferences: service.instructions?.trim() || "None",
        }))
        : [
          {
            id: service.id,
            name: serviceTypeLabel(service.service_type),
            quantity: 0,
            confirmedQuantity: null,
            estimatedPriceLabel: formatUsd(fallbackAmount),
            confirmedPriceLabel: null,
            preferences: service.instructions?.trim() || "None",
          },
        ];

    return {
      id: service.id,
      title: serviceTypeLabel(service.service_type),
      instructions: service.instructions?.trim() || "",
      estimatedPriceLabel: formatUsd(fallbackAmount),
      items,
    };
  });

  const notes = Array.from(
    new Set(serviceGroups.map((group) => group.instructions).filter(Boolean)),
  ).join("\n");
  const totalItems = serviceGroups.reduce(
    (sum, group) =>
      sum +
      group.items.reduce(
        (innerSum, item) => innerSum + Math.max(0, item.confirmedQuantity ?? item.quantity),
        0,
      ),
    0,
  );
  const totalAmount = order.estimated_total ?? order.estimated_partial_total ?? 0;
  const confirmedTotal =
    order.confirmed_total != null ? formatUsd(order.confirmed_total) : null;
  const pickupFee = order.pickup_fee != null && order.pickup_fee > 0 ? order.pickup_fee : null;
  const grandTotal = order.confirmed_total != null
    ? order.confirmed_total
    : totalAmount + (pickupFee ?? 0);

  return {
    id: order.id,
    orderRef: order.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
    partnerId: order.partner_id,
    partnerName: partner?.business_name?.trim() || "Laundry Captain",
    partnerVerified: verifiedPartnerIds.has(order.partner_id),
    partnerPhone: partner?.phone_number?.trim() || "Not provided",
    partnerAddress: partner?.address?.trim() || "Address not available",
    partnerImageUrl,
    partnerRatingAvg: rating?.avg ?? null,
    partnerRatingCount: rating?.count ?? 0,
    partnerAvailableTime: partner?.available_time?.trim() || null,
    partnerLatitude: Number.isFinite(partnerLatitude) ? partnerLatitude : null,
    partnerLongitude: Number.isFinite(partnerLongitude) ? partnerLongitude : null,
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
    pickupDayLabel: order.pickup_day_label?.trim() || null,
    pickupTimeLabel: order.pickup_time_slot_label?.trim() || null,
    deliveryDayLabel: order.delivery_day_label?.trim() || null,
    deliveryTimeLabel: order.delivery_time_slot_label?.trim() || null,
    customerPickupAddress: customerProfile.data?.address?.trim() || null,
    estimatedTotalLabel: formatUsd(totalAmount),
    confirmedTotalLabel: confirmedTotal,
    confirmedAt: order.confirmed_at,
    pickupFee,
    pickupFeeLabel: pickupFee != null ? formatUsd(pickupFee) : null,
    grandTotalLabel: formatUsd(grandTotal),
    totalItems,
    notes: notes || null,
    rejectionReasonOption: order.rejection_reason_option?.trim() || null,
    rejectionReasonDetails: order.rejection_reason_details?.trim() || null,
    fulfillmentMode: inferOrderFulfillmentMode(order),
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

export async function findLatestCustomerOrderIdWithPartner(
  customerId: string,
  partnerId: string,
): Promise<string | null> {
  if (!supabase || !customerId || !partnerId) return null;
  const { data, error } = await supabase
    .from("customer_orders")
    .select("id")
    .eq("customer_id", customerId)
    .eq("partner_id", partnerId)
    .not("status", "in", "(draft,cancelled)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (error) return null;
  return data?.id ?? null;
}
