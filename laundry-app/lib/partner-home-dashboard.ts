import type { DashboardPeriod } from "@/components/dashboard-period-selector";
import { getPeriodCalendarBounds } from "@/lib/dashboard-period-bounds";
import type { PartnerOrderStatus } from "@/lib/partner-orders";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const HOME_SERVICE_KEYS = ["washAndFold", "press", "dryCleaning", "tailoring"] as const;

export type HomeServiceKey = (typeof HOME_SERVICE_KEYS)[number];

export type PartnerHomeOrder = {
  id: string;
  orderRef: string;
  rawStatus: PartnerOrderStatus;
  customerName: string;
  address: string;
  serviceKey: HomeServiceKey | null;
  extraServiceCount: number;
  itemCount: number;
  amount: number;
  pickupWhen: string | null;
  deliveryWhen: string | null;
  orderType: "dropoff" | "delivery";
  timelineIso: string;
  updatedAtIso: string | null;
};

export type PartnerHomeSnapshot = {
  businessName: string;
  addressLine: string;
  photoUrl: string | null;
  orders: PartnerHomeOrder[];
};

export type PartnerHomeMixRow = {
  key: HomeServiceKey;
  count: number;
  percent: number;
};

export type PartnerHomeView = {
  businessName: string;
  addressLine: string;
  photoUrl: string | null;
  newOrders: number;
  activeCount: number;
  completedToday: number;
  earningsToday: number;
  mix: PartnerHomeMixRow[];
  mixTotal: number;
  actionOrders: PartnerHomeOrder[];
  actionCount: number;
  activeOrders: PartnerHomeOrder[];
};

const PREVIEW_LIMIT = 2;
const ACTIVE_STATUSES = new Set<PartnerOrderStatus>(["accepted", "in_progress", "ready"]);

type OrderRow = {
  id: string;
  customer_id: string;
  status: PartnerOrderStatus;
  estimated_total: number | null;
  estimated_partial_total: number | null;
  confirmed_total: number | null;
  pickup_fee: number | null;
  pickup_day_label: string | null;
  pickup_time_slot_label: string | null;
  delivery_day_label: string | null;
  delivery_time_slot_label: string | null;
  submitted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  email: string | null;
};

function asServiceKey(value: string): HomeServiceKey | null {
  return (HOME_SERVICE_KEYS as readonly string[]).includes(value)
    ? (value as HomeServiceKey)
    : null;
}

function formatOrderRef(orderId: string): string {
  return `#${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function personName(profile: ProfileRow | undefined, fallback: string): string {
  if (!profile) return fallback;
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const joined = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  if (profile.email?.trim()) return profile.email.trim();
  return fallback;
}

function addressLine(value: string | null | undefined): string {
  const line = value?.trim().split(/\n/)[0]?.trim() ?? "";
  if (line.length <= 72) return line;
  return `${line.slice(0, 71)}…`;
}

function scheduleWhen(day: string | null, time: string | null): string | null {
  const parts = [day?.trim(), time?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function orderAmount(row: OrderRow): number {
  if (row.confirmed_total != null) return Number(row.confirmed_total);
  const base = row.estimated_total ?? row.estimated_partial_total ?? 0;
  const fee = row.pickup_fee ?? 0;
  return Number(base) + Number(fee);
}

function timelineIso(row: OrderRow): string {
  return row.submitted_at ?? row.created_at ?? row.updated_at ?? new Date(0).toISOString();
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function firstPhoto(images: unknown, imageUrl: string | null): string | null {
  if (Array.isArray(images)) {
    const found = images.find((item) => typeof item === "string" && item.trim().length > 0);
    if (typeof found === "string") return found;
  }
  return imageUrl?.trim() || null;
}

function percents(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map((count) => (count / total) * 100);
  const rounded = raw.map((value) => Math.round(value));
  const drift = 100 - rounded.reduce((sum, value) => sum + value, 0);
  if (drift !== 0) {
    let index = 0;
    raw.forEach((value, i) => {
      if (value > raw[index]) index = i;
    });
    rounded[index] += drift;
  }
  return rounded;
}

function endOfLocalDay(date: Date): number {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

/** Orders still in progress on that calendar day, using the latest status timestamp. */
function countActiveOnDay(orders: PartnerHomeOrder[], day: Date, today: Date): number {
  if (isSameLocalDay(day, today)) {
    return orders.filter((order) => ACTIVE_STATUSES.has(order.rawStatus)).length;
  }
  const end = endOfLocalDay(day);
  return orders.filter((order) => {
    const submitted = parseDate(order.timelineIso);
    if (!submitted || submitted.getTime() > end) return false;
    if (ACTIVE_STATUSES.has(order.rawStatus)) return true;
    if (order.rawStatus === "submitted") return false;
    const updated = parseDate(order.updatedAtIso);
    return updated != null && updated.getTime() > end;
  }).length;
}

export function derivePartnerHomeView(
  snapshot: PartnerHomeSnapshot,
  period: DashboardPeriod,
  now: Date,
  performanceDay: Date = now,
): PartnerHomeView {
  const { start, endExclusive } = getPeriodCalendarBounds(period, now);
  const mixCounts = HOME_SERVICE_KEYS.map((key) => {
    return snapshot.orders.filter((order) => {
      if (order.rawStatus === "cancelled" || order.rawStatus === "rejected") return false;
      if (order.serviceKey !== key) return false;
      const when = parseDate(order.timelineIso);
      if (!when) return false;
      const time = when.getTime();
      return time >= start.getTime() && time < endExclusive.getTime();
    }).length;
  });
  const mixPercents = percents(mixCounts);
  const mix = HOME_SERVICE_KEYS.map((key, index) => ({
    key,
    count: mixCounts[index],
    percent: mixPercents[index],
  }));

  const newOrders = snapshot.orders.filter((order) => {
    if (order.rawStatus === "cancelled" || order.rawStatus === "rejected") return false;
    const when = parseDate(order.timelineIso);
    return when != null && isSameLocalDay(when, performanceDay);
  }).length;

  const activeOrdersAll = snapshot.orders.filter((order) => ACTIVE_STATUSES.has(order.rawStatus));
  const completedTodayOrders = snapshot.orders.filter((order) => {
    if (order.rawStatus !== "completed") return false;
    const when = parseDate(order.updatedAtIso ?? order.timelineIso);
    return when != null && isSameLocalDay(when, performanceDay);
  });

  const actionOrdersAll = snapshot.orders.filter((order) => order.rawStatus === "submitted");

  return {
    businessName: snapshot.businessName,
    addressLine: snapshot.addressLine,
    photoUrl: snapshot.photoUrl,
    newOrders,
    activeCount: countActiveOnDay(snapshot.orders, performanceDay, now),
    completedToday: completedTodayOrders.length,
    earningsToday: completedTodayOrders.reduce((sum, order) => sum + order.amount, 0),
    mix,
    mixTotal: mixCounts.reduce((sum, count) => sum + count, 0),
    actionOrders: actionOrdersAll.slice(0, PREVIEW_LIMIT),
    actionCount: actionOrdersAll.length,
    activeOrders: activeOrdersAll.slice(0, PREVIEW_LIMIT),
  };
}

export async function fetchPartnerHomeSnapshot(
  partnerId: string,
  customerFallback: string,
): Promise<PartnerHomeSnapshot> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      businessName: "",
      addressLine: "",
      photoUrl: null,
      orders: [],
    };
  }

  const [profileResult, ordersResult] = await Promise.all([
    supabase
      .from("partner_profiles")
      .select("business_name,address,image_url,business_images")
      .eq("id", partnerId)
      .maybeSingle<{
        business_name: string | null;
        address: string | null;
        image_url: string | null;
        business_images: unknown;
      }>(),
    supabase
      .from("customer_orders")
      .select(
        "id,customer_id,status,estimated_total,estimated_partial_total,confirmed_total,pickup_fee,pickup_day_label,pickup_time_slot_label,delivery_day_label,delivery_time_slot_label,submitted_at,created_at,updated_at",
      )
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false }),
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);

  const orderRows = (ordersResult.data ?? []) as OrderRow[];
  const orderIds = orderRows.map((row) => row.id);
  const customerIds = Array.from(new Set(orderRows.map((row) => row.customer_id).filter(Boolean)));

  const serviceTypesByOrder = new Map<string, HomeServiceKey[]>();
  const itemCountByOrder = new Map<string, number>();

  if (orderIds.length > 0) {
    const { data: serviceRows } = await supabase
      .from("order_services")
      .select("id,order_id,service_type")
      .in("order_id", orderIds);

    const services = (serviceRows ?? []) as {
      id: string;
      order_id: string;
      service_type: string;
    }[];
    const serviceIdToOrderId = new Map<string, string>();
    for (const row of services) {
      serviceIdToOrderId.set(row.id, row.order_id);
      const key = asServiceKey(row.service_type);
      if (!key) continue;
      const list = serviceTypesByOrder.get(row.order_id) ?? [];
      if (!list.includes(key)) list.push(key);
      serviceTypesByOrder.set(row.order_id, list);
    }

    const serviceIds = services.map((row) => row.id);
    if (serviceIds.length > 0) {
      const { data: itemRows } = await supabase
        .from("order_service_items")
        .select("order_service_id,quantity,confirmed_quantity")
        .in("order_service_id", serviceIds);
      for (const item of (itemRows ?? []) as {
        order_service_id: string;
        quantity: number | null;
        confirmed_quantity: number | null;
      }[]) {
        const orderId = serviceIdToOrderId.get(item.order_service_id);
        if (!orderId) continue;
        const qty = item.confirmed_quantity ?? item.quantity ?? 0;
        itemCountByOrder.set(orderId, (itemCountByOrder.get(orderId) ?? 0) + Number(qty));
      }
    }
  }

  const profiles = new Map<string, ProfileRow>();
  if (customerIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id,full_name,first_name,last_name,address,email")
      .in("id", customerIds);
    for (const row of (profileRows ?? []) as ProfileRow[]) {
      profiles.set(row.id, row);
    }
  }

  const profile = profileResult.data;
  const orders: PartnerHomeOrder[] = orderRows.map((row) => {
    const keys = serviceTypesByOrder.get(row.id) ?? [];
    const pickupWhen = scheduleWhen(row.pickup_day_label, row.pickup_time_slot_label);
    const hasPickup = Boolean(row.pickup_day_label || row.pickup_time_slot_label);
    return {
      id: row.id,
      orderRef: formatOrderRef(row.id),
      rawStatus: row.status,
      customerName: personName(profiles.get(row.customer_id), customerFallback),
      address: addressLine(profiles.get(row.customer_id)?.address),
      serviceKey: keys[0] ?? null,
      extraServiceCount: Math.max(0, keys.length - 1),
      itemCount: itemCountByOrder.get(row.id) ?? 0,
      amount: orderAmount(row),
      pickupWhen,
      deliveryWhen: scheduleWhen(row.delivery_day_label, row.delivery_time_slot_label),
      orderType: hasPickup ? "delivery" : "dropoff",
      timelineIso: timelineIso(row),
      updatedAtIso: row.updated_at,
    };
  });

  return {
    businessName: profile?.business_name?.trim() ?? "",
    addressLine: addressLine(profile?.address),
    photoUrl: firstPhoto(profile?.business_images, profile?.image_url ?? null),
    orders,
  };
}
