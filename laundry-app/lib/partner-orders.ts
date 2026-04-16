import { supabase } from "@/lib/supabase";

export type PartnerOrderStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "ready"
  | "completed"
  | "cancelled";

export type PartnerOrderCardStatus = "pending" | "accepted" | "rejected";

export interface PartnerOrderListItem {
  id: string;
  customerName: string;
  initial: string;
  avatarUrl?: string | null;
  subtitle: string;
  status: PartnerOrderCardStatus;
  rawStatus: PartnerOrderStatus;
  rightIcon: "scooter" | "bag";
}

export interface PartnerOrderDetailBag {
  id: string;
  label: string;
  service: string;
  weight: string;
  numItems: string;
  preferences: string;
  estimatedPrice: string;
}

export interface PartnerOrderServiceGroup {
  id: string;
  title: string;
  instructions: string;
  estimatedPrice: string;
  items: PartnerOrderDetailBag[];
}

export interface PartnerOrderDetailData {
  orderId: string;
  orderNumber: string;
  status: PartnerOrderCardStatus;
  rawStatus: PartnerOrderStatus;
  clientName: string;
  clientInitial: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  cityStateZip: string;
  pickup: string;
  delivery: string;
  courier: string;
  estimatedTotal: string;
  totalItems: string;
  servicesSummary: string;
  notes: string;
  bags: PartnerOrderDetailBag[];
  serviceGroups: PartnerOrderServiceGroup[];
}

type CustomerOrderRow = {
  id: string;
  customer_id: string;
  status: PartnerOrderStatus;
  estimated_total: number | null;
  estimated_partial_total: number;
  pickup_day_label: string | null;
  pickup_time_slot_label: string | null;
  delivery_day_label: string | null;
  delivery_time_slot_label: string | null;
};

type OrderServiceRow = {
  id: string;
  service_type: "washAndFold" | "dryCleaning" | "tailoring";
  instructions: string;
  estimated_amount: number | null;
  order_service_items?: OrderServiceItemRow[] | null;
};

type OrderServiceItemRow = {
  id: string;
  item_name: string;
  quantity: number;
  line_total_amount: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  email?: string | null;
  image_url?: string | null;
};

function mapToCardStatus(status: PartnerOrderStatus): PartnerOrderCardStatus {
  if (status === "submitted") return "pending";
  if (status === "rejected" || status === "cancelled") return "rejected";
  return "accepted";
}

function formatPersonName(profile: ProfileRow | null | undefined): string {
  if (!profile) return "Customer";
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const joined = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  if (profile.email?.trim()) return profile.email.trim();
  return "Customer";
}

function firstInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "C";
}

function formatSchedule(day: string | null, time: string | null, fallback: string): string {
  if (!day && !time) return fallback;
  return [day, time].filter(Boolean).join(" at ");
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

async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, ProfileRow>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!supabase || ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,first_name,last_name,phone,address,email,image_url")
    .in("id", ids);
  if (error || !data) return new Map();

  return new Map((data as ProfileRow[]).map((row) => [row.id, row]));
}

export async function fetchPartnerOrders(): Promise<PartnerOrderListItem[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("customer_orders")
    .select(
      "id,customer_id,status,pickup_day_label,pickup_time_slot_label,delivery_day_label,delivery_time_slot_label",
    )
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  const orders = (data ?? []) as CustomerOrderRow[];
  const profiles = await fetchProfilesByIds(orders.map((order) => order.customer_id));

  return orders.map((order) => {
    const profile = profiles.get(order.customer_id);
    const customerName = formatPersonName(profile);
    const hasPickup = Boolean(order.pickup_day_label || order.pickup_time_slot_label);
    return {
      id: order.id,
      customerName,
      initial: firstInitial(customerName),
      avatarUrl: profile?.image_url ?? null,
      subtitle: hasPickup
        ? `Pickup ${formatSchedule(
            order.pickup_day_label,
            order.pickup_time_slot_label,
            "Schedule pending",
          )}`
        : `Delivery ${formatSchedule(
            order.delivery_day_label,
            order.delivery_time_slot_label,
            "Schedule pending",
          )}`,
      status: mapToCardStatus(order.status),
      rawStatus: order.status,
      rightIcon: hasPickup ? "scooter" : "bag",
    };
  });
}

export async function fetchPartnerOrderDetail(
  orderId: string,
): Promise<PartnerOrderDetailData | null> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("customer_orders")
    .select(
      "id,customer_id,status,estimated_total,estimated_partial_total,pickup_day_label,pickup_time_slot_label,delivery_day_label,delivery_time_slot_label",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  const order = data as CustomerOrderRow;
  const { data: serviceData, error: serviceError } = await supabase
    .from("order_services")
    .select("id,service_type,instructions,estimated_amount")
    .eq("order_id", orderId);
  if (serviceError) {
    throw new Error(serviceError.message);
  }

  const serviceRows = (serviceData ?? []) as OrderServiceRow[];
  const serviceIds = serviceRows.map((row) => row.id);
  const orderServiceItemsByServiceId = new Map<string, OrderServiceItemRow[]>();

  if (serviceIds.length > 0) {
    const { data: itemData, error: itemError } = await supabase
      .from("order_service_items")
      .select("id,order_service_id,item_name,quantity,line_total_amount")
      .in("order_service_id", serviceIds);
    if (itemError) {
      throw new Error(itemError.message);
    }

    for (const item of (itemData ?? []) as Array<
      OrderServiceItemRow & { order_service_id: string }
    >) {
      const existing = orderServiceItemsByServiceId.get(item.order_service_id) ?? [];
      existing.push(item);
      orderServiceItemsByServiceId.set(item.order_service_id, existing);
    }
  }

  const profiles = await fetchProfilesByIds([order.customer_id]);
  const customerProfile = profiles.get(order.customer_id);
  const customerName = formatPersonName(customerProfile);
  const serviceGroups: PartnerOrderServiceGroup[] = serviceRows.map((serviceRow, index) => {
    const itemRows = orderServiceItemsByServiceId.get(serviceRow.id) ?? [];
    const items: PartnerOrderDetailBag[] =
      itemRows.length > 0
        ? itemRows.map((itemRow) => ({
            id: itemRow.id,
            label: itemRow.item_name,
            service: serviceTypeLabel(serviceRow.service_type),
            weight: "N/A",
            numItems: String(itemRow.quantity),
            preferences: serviceRow.instructions?.trim() || "None",
            estimatedPrice: String(
              itemRow.line_total_amount ?? serviceRow.estimated_amount ?? 0,
            ),
          }))
        : [
            {
              id: serviceRow.id,
              label: serviceTypeLabel(serviceRow.service_type),
              service: serviceTypeLabel(serviceRow.service_type),
              weight: "Pending at intake",
              numItems: "0",
              preferences: serviceRow.instructions?.trim() || "None",
              estimatedPrice: String(serviceRow.estimated_amount ?? 0),
            },
          ];

    return {
      id: serviceRow.id,
      title: serviceTypeLabel(serviceRow.service_type),
      instructions: serviceRow.instructions?.trim() || "No special instructions",
      estimatedPrice: String(serviceRow.estimated_amount ?? 0),
      items,
    };
  });

  const bags: PartnerOrderDetailBag[] =
    serviceGroups.length > 0
      ? serviceGroups.flatMap((group) => group.items)
      : [
          {
            id: order.id,
            label: "Order",
            service: "Laundry order",
            weight: "Pending at intake",
            numItems: "0",
            preferences: "None",
            estimatedPrice: String(order.estimated_total ?? order.estimated_partial_total ?? 0),
          },
        ];

  const totalItems = bags.reduce((sum, bag) => sum + Number.parseInt(bag.numItems, 10) || 0, 0);
  const servicesSummary =
    serviceGroups.length > 0
      ? serviceGroups.map((group) => group.title).join(", ")
      : "Laundry order";
  const notes = serviceGroups
    .map((group) => group.instructions)
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
    .join("\n");

  return {
    orderId: order.id,
    orderNumber: order.id.slice(0, 8).toUpperCase(),
    status: mapToCardStatus(order.status),
    rawStatus: order.status,
    clientName: customerName,
    clientInitial: firstInitial(customerName),
    phone: customerProfile?.phone?.trim() || "Not provided",
    addressLine1: customerProfile?.address?.trim() || "Address not available",
    addressLine2: "",
    cityStateZip: "",
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
    courier: "Not Yet Assigned",
    estimatedTotal: String(order.estimated_total ?? order.estimated_partial_total ?? 0),
    totalItems: String(totalItems),
    servicesSummary,
    notes: notes || "No special instructions",
    bags,
    serviceGroups,
  };
}
