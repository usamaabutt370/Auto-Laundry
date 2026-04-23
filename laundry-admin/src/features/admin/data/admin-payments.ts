import type { AdminOrder, OrderStatus } from "@/features/admin/types/admin-order";
import type {
  AdminPayment,
  EscrowStatus,
  PaymentKind,
  PaymentStatus,
  PaymentTiming,
  PayoutStatus,
} from "@/features/admin/types/admin-payment";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { listCustomerOrdersForAdmin } from "@/features/admin/server/orders/customer-orders.repository";

export type {
  AdminPayment,
  EscrowStatus,
  PaymentKind,
  PaymentStatus,
  PaymentTiming,
  PayoutStatus,
} from "@/features/admin/types/admin-payment";

export async function getAdminPayments(): Promise<AdminPayment[]> {
  const tableRows = await listOrderPaymentsFromDatabase();
  if (tableRows && tableRows.length > 0) {
    return tableRows;
  }

  const orders = await listCustomerOrdersForAdmin();
  return orders.map(mapOrderToPayment);
}

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

async function listOrderPaymentsFromDatabase(): Promise<AdminPayment[] | null> {
  const supabase = createSupabaseAdminClient();
  const [paymentsResult, ordersResult, profilesResult, partnersResult] = await Promise.all([
    supabase
      .from("order_payments")
      .select(
        "id, order_id, payment_intent_id, transaction_id, method_type, method_label, currency, gross_amount, commission_rate, commission_amount, partner_net_amount, payment_timing, payment_status, escrow_status, payout_status, charged_at, order_completed_at, payout_processed_at, refunded_at, dispute_id, created_at, updated_at",
      )
      .order("updated_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("customer_orders")
      .select("id, customer_id, partner_id, status, currency_prefix, estimated_total, created_at"),
    supabase.from("profiles").select("id, full_name, first_name, last_name"),
    supabase.from("partner_profiles").select("id, business_name"),
  ]);

  if (paymentsResult.error) {
    if (isOrderPaymentsMissing(paymentsResult.error)) return null;
    throw new Error(`order_payments list failed: ${paymentsResult.error.message}`);
  }
  if (ordersResult.error) throw new Error(`customer_orders list failed: ${ordersResult.error.message}`);
  if (profilesResult.error) throw new Error(`profiles list failed: ${profilesResult.error.message}`);
  if (partnersResult.error) throw new Error(`partner_profiles list failed: ${partnersResult.error.message}`);

  const rows = paymentsResult.data ?? [];
  if (rows.length === 0) return [];

  const ordersById = new Map((ordersResult.data ?? []).map((o) => [o.id, o]));
  const customerNameById = new Map((profilesResult.data ?? []).map((p) => [p.id, buildFullName(p)]));
  const partnerNameById = new Map((partnersResult.data ?? []).map((p) => [p.id, asText(p.business_name) || "N/A"]));

  return rows.map((row) => {
    const order = ordersById.get(row.order_id ?? "");
    const gross = toNumber(row.gross_amount) ?? toNumber(order?.estimated_total) ?? 0;
    const commissionRate = toNumber(row.commission_rate) ?? 0.1;
    const commissionAmount = toNumber(row.commission_amount) ?? round2(gross * commissionRate);
    const partnerNet = toNumber(row.partner_net_amount) ?? round2(gross - commissionAmount);
    const paymentStatus = normalizePaymentStatus(row.payment_status);
    const paymentTiming = normalizePaymentTiming(row.payment_timing);
    const createdAt = firstValidDate(row.created_at, order?.created_at);
    const updatedAt = firstValidDate(row.updated_at, row.created_at, order?.created_at);

    return {
      id: asText(row.id) || `PAY-${asText(row.order_id).slice(0, 8).toUpperCase()}`,
      orderId: asText(row.order_id) || asText(order?.id) || "N/A",
      customer: customerNameById.get(order?.customer_id ?? "") ?? "N/A",
      partner: partnerNameById.get(order?.partner_id ?? "") ?? "N/A",
      kind: mapPaymentKind(paymentTiming, paymentStatus),
      amount: formatMoney(gross, row.currency),
      grossAmount: formatMoney(gross, row.currency),
      commissionRate,
      commissionAmount: formatMoney(commissionAmount, row.currency),
      partnerNet: formatMoney(partnerNet, row.currency),
      method: asText(row.method_label) || asText(row.transaction_id) || "N/A",
      methodType: normalizeMethodType(row.method_type),
      status: paymentStatus,
      paymentTiming,
      escrowStatus: normalizeEscrowStatus(row.escrow_status),
      payoutStatus: normalizePayoutStatus(row.payout_status),
      createdAt,
      updatedAt,
      orderCompletedAt: normalizeDateOrNull(row.order_completed_at),
      payoutProcessedAt: normalizeDateOrNull(row.payout_processed_at),
      disputeId: asText(row.dispute_id) || null,
    };
  });
}

function mapOrderToPayment(order: AdminOrder): AdminPayment {
  const gross = parseMoney(order.total);
  const commissionRate = 0.1;
  const commission = round2(gross * commissionRate);
  const partnerNet = round2(gross - commission);
  const paymentStatus = mapPaymentStatus(order.status);
  const paymentTiming = mapPaymentTiming(order.status);
  const escrowStatus = mapEscrowStatus(order.status);
  const payoutStatus = mapPayoutStatus(order.status);
  const created = normalizeDate(order.createdAt);

  return {
    id: `PAY-${order.id.slice(0, 8).toUpperCase()}`,
    orderId: order.id,
    customer: order.customer,
    partner: order.partner,
    kind: mapPaymentKind(paymentTiming, paymentStatus),
    amount: formatMoney(gross),
    grossAmount: formatMoney(gross),
    commissionRate,
    commissionAmount: formatMoney(commission),
    partnerNet: formatMoney(partnerNet),
    method: "N/A",
    methodType: "Card",
    status: paymentStatus,
    paymentTiming,
    escrowStatus,
    payoutStatus,
    createdAt: created,
    updatedAt: created,
    orderCompletedAt: order.status === "Delivered" ? created : null,
    payoutProcessedAt: order.status === "Delivered" ? created : null,
    disputeId: order.status === "Cancelled" ? `DSP-${order.id.slice(0, 6).toUpperCase()}` : null,
  };
}

function mapPaymentKind(timing: PaymentTiming, status: PaymentStatus): PaymentKind {
  if (status === "Refunded") return "Refund";
  if (timing === "Paid at completion") return "Settlement charge";
  return "Escrow charge";
}

function mapPaymentStatus(status: OrderStatus): PaymentStatus {
  if (status === "Delivered") return "Succeeded";
  if (status === "Cancelled") return "Refunded";
  if (status === "N/A") return "Failed";
  return "Pending";
}

function mapPaymentTiming(status: OrderStatus): PaymentTiming {
  return status === "Delivered" ? "Paid at completion" : "Paid at order";
}

function mapEscrowStatus(status: OrderStatus): EscrowStatus {
  if (status === "Delivered") return "Released";
  if (status === "Cancelled") return "Refunded";
  if (status === "N/A") return "Failed";
  if (status === "Ready") return "Ready for payout";
  return "In escrow";
}

function mapPayoutStatus(status: OrderStatus): PayoutStatus {
  if (status === "Delivered") return "Sent";
  if (status === "Ready") return "Ready";
  if (status === "Cancelled") return "On hold";
  if (status === "N/A") return "Failed";
  return "Not ready";
}

function parseMoney(value: string): number {
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizePaymentStatus(raw: unknown): PaymentStatus {
  const value = asText(raw).toLowerCase().replaceAll("_", " ");
  if (value === "succeeded") return "Succeeded";
  if (value === "failed") return "Failed";
  if (value === "refunded") return "Refunded";
  return "Pending";
}

function normalizePaymentTiming(raw: unknown): PaymentTiming {
  const value = asText(raw).toLowerCase().replaceAll("_", " ");
  if (value.includes("completion")) return "Paid at completion";
  return "Paid at order";
}

function normalizeEscrowStatus(raw: unknown): EscrowStatus {
  const value = asText(raw).toLowerCase().replaceAll("_", " ");
  if (value === "awaiting payment") return "Awaiting payment";
  if (value === "ready for payout") return "Ready for payout";
  if (value === "released") return "Released";
  if (value === "refunded") return "Refunded";
  if (value === "failed") return "Failed";
  return "In escrow";
}

function normalizePayoutStatus(raw: unknown): PayoutStatus {
  const value = asText(raw).toLowerCase().replaceAll("_", " ");
  if (value === "ready") return "Ready";
  if (value === "sent") return "Sent";
  if (value === "on hold") return "On hold";
  if (value === "failed") return "Failed";
  return "Not ready";
}

function normalizeMethodType(raw: unknown): AdminPayment["methodType"] {
  const value = asText(raw).toLowerCase();
  if (value === "wallet") return "Wallet";
  if (value === "bank") return "Bank";
  return "Card";
}

function formatMoney(value: number, currencyRaw?: unknown): string {
  const currency = asText(currencyRaw).toUpperCase();
  const symbol = currency === "USD" || !currency ? "$" : `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
}

function normalizeDateOrNull(value: unknown): string | null {
  const text = normalizeDate(value);
  return text === "N/A" ? null : text;
}

function normalizeDate(value: unknown): string {
  const raw = asText(value);
  if (!raw) return "N/A";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

function firstValidDate(...values: unknown[]): string {
  for (const value of values) {
    const normalized = normalizeDate(value);
    if (normalized !== "N/A") return normalized;
  }
  return "N/A";
}

function isOrderPaymentsMissing(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || message.includes("order_payments");
}

function buildFullName(row: ProfileRow): string {
  const full = asText(row.full_name);
  if (full) return full;
  const merged = `${asText(row.first_name)} ${asText(row.last_name)}`.trim();
  return merged || "N/A";
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
