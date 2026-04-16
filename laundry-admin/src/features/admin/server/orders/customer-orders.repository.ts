import "server-only";

import type { AdminOrder, OrderStatus, ShippingService } from "@/features/admin/types/admin-order";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type CustomerOrderRow = Database["public"]["Tables"]["customer_orders"]["Row"];
type OrderServiceRow = Database["public"]["Tables"]["order_services"]["Row"];
type OrderServiceItemRow = Database["public"]["Tables"]["order_service_items"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PartnerProfileRow = Database["public"]["Tables"]["partner_profiles"]["Row"];

export async function listCustomerOrdersForAdmin(): Promise<AdminOrder[]> {
  const supabase = createSupabaseAdminClient();

  const [ordersResult, servicesResult, serviceItemsResult, profilesResult, partnersResult] =
    await Promise.all([
      supabase
        .from("customer_orders")
        .select(
          "id, customer_id, partner_id, status, currency_prefix, estimated_total, delivery_time_slot_label, created_at",
        )
        .order("created_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("order_services")
        .select("id, order_id, service_type, estimated_amount, total_item_count, created_at"),
      supabase.from("order_service_items").select("id, order_service_id, quantity"),
      supabase.from("profiles").select("id, full_name, first_name, last_name"),
      supabase.from("partner_profiles").select("id, business_name"),
    ]);

  if (ordersResult.error) throw new Error(`customer_orders list failed: ${ordersResult.error.message}`);
  if (servicesResult.error) throw new Error(`order_services list failed: ${servicesResult.error.message}`);
  if (serviceItemsResult.error) {
    throw new Error(`order_service_items list failed: ${serviceItemsResult.error.message}`);
  }
  if (profilesResult.error) throw new Error(`profiles list failed: ${profilesResult.error.message}`);
  if (partnersResult.error) throw new Error(`partner_profiles list failed: ${partnersResult.error.message}`);

  const servicesByOrder = buildServicesByOrderMap(servicesResult.data ?? []);
  const itemCountByService = buildItemCountByServiceMap(serviceItemsResult.data ?? []);
  const customerNameById = buildCustomerNameByIdMap(profilesResult.data ?? []);
  const partnerNameById = buildPartnerNameByIdMap(partnersResult.data ?? []);

  return (ordersResult.data ?? []).map((order, index) =>
    mapOrderRow(order, index, {
      servicesByOrder,
      itemCountByService,
      customerNameById,
      partnerNameById,
    }),
  );
}

function mapOrderRow(
  order: CustomerOrderRow,
  index: number,
  ctx: {
    servicesByOrder: Map<string, OrderServiceRow[]>;
    itemCountByService: Map<string, number>;
    customerNameById: Map<string, string>;
    partnerNameById: Map<string, string>;
  },
): AdminOrder {
  const services = ctx.servicesByOrder.get(order.id) ?? [];
  const serviceNames = unique(services.map((s) => asText(s.service_type)).filter(Boolean));
  const itemCountFromServices = services.reduce((sum, s) => sum + (toNumber(s.total_item_count) ?? 0), 0);
  const itemCountFromItems = services.reduce(
    (sum, s) => sum + (ctx.itemCountByService.get(s.id) ?? 0),
    0,
  );
  const itemCount = itemCountFromServices || itemCountFromItems || 0;
  const firstService = services[0];

  return {
    id: order.id,
    orderNumber: String(100000 + index + 1),
    customer: ctx.customerNameById.get(order.customer_id ?? "") ?? "N/A",
    partner: ctx.partnerNameById.get(order.partner_id ?? "") ?? "N/A",
    items: serviceNames.join(", ") || "N/A",
    itemCount,
    shippingService: normalizeShippingService(order.delivery_time_slot_label),
    trackingCode: "N/A",
    total: formatMoney(order.currency_prefix, toNumber(order.estimated_total) ?? toNumber(firstService?.estimated_amount) ?? 0),
    status: normalizeOrderStatus(order.status),
    createdAt: normalizeDate(order.created_at),
  };
}

function buildServicesByOrderMap(rows: OrderServiceRow[]): Map<string, OrderServiceRow[]> {
  const map = new Map<string, OrderServiceRow[]>();
  for (const row of rows) {
    const list = map.get(row.order_id ?? "") ?? [];
    list.push(row);
    map.set(row.order_id ?? "", list);
  }
  return map;
}

function buildItemCountByServiceMap(rows: OrderServiceItemRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.order_service_id) continue;
    map.set(row.order_service_id, (map.get(row.order_service_id) ?? 0) + (toNumber(row.quantity) ?? 1));
  }
  return map;
}

function buildCustomerNameByIdMap(rows: ProfileRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.id, buildFullName(row.full_name, row.first_name, row.last_name));
  }
  return map;
}

function buildPartnerNameByIdMap(rows: PartnerProfileRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.id, asText(row.business_name) || "N/A");
  }
  return map;
}

function buildFullName(fullName: unknown, firstName: unknown, lastName: unknown): string {
  const direct = asText(fullName);
  if (direct) return direct;
  const merged = `${asText(firstName)} ${asText(lastName)}`.trim();
  return merged || "N/A";
}

function normalizeOrderStatus(raw: unknown): OrderStatus {
  const status = asText(raw).toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  switch (status) {
    case "placed":
      return "Placed";
    case "accepted":
      return "Accepted";
    case "in_progress":
      return "In Progress";
    case "ready":
      return "Ready";
    case "delivered":
      return "Delivered";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default:
      return "N/A";
  }
}

function normalizeShippingService(raw: unknown): ShippingService {
  const value = asText(raw).toLowerCase().replaceAll("_", " ");
  if (value.includes("express")) return "Express";
  if (value.includes("priority")) return "Priority";
  return "Standard";
}

function normalizeDate(raw: unknown): string {
  const text = asText(raw);
  if (!text) return "N/A";
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return text;
  return d.toISOString().slice(0, 10);
}

function formatMoney(prefix: unknown, amount: number): string {
  const currency = asText(prefix) || "$";
  return `${currency}${amount.toFixed(2)}`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
