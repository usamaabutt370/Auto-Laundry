import "server-only";

import type {
  CreditRequest,
  CreditRequestStatus,
  CreditTransaction,
  CreditTransactionType,
  UserCreditBalance,
} from "@/features/admin/types/admin-credits";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type PartnerCreditAccountRow = Database["public"]["Tables"]["partner_credit_accounts"]["Row"];
type PartnerCreditLedgerRow = Database["public"]["Tables"]["partner_credit_ledger"]["Row"];
type PartnerCreditRequestRow = Database["public"]["Tables"]["partner_credit_requests"]["Row"];
type PartnerProfileRow = Database["public"]["Tables"]["partner_profiles"]["Row"];

export async function listPartnerCreditsForAdmin(): Promise<{
  transactions: CreditTransaction[];
  requests: CreditRequest[];
  balances: UserCreditBalance[];
}> {
  const supabase = createSupabaseAdminClient();

  const [accountsResult, ledgerResult, partnersResult, requestsResult] = await Promise.all([
    supabase
      .from("partner_credit_accounts")
      .select("partner_id, balance, total_earned, total_spent, created_at, updated_at")
      .order("updated_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("partner_credit_ledger")
      .select("id, partner_id, event_type, delta, balance_after, note, metadata, created_at")
      .order("created_at", { ascending: false, nullsFirst: false }),
    supabase.from("partner_profiles").select("id, business_name, phone_number"),
    supabase
      .from("partner_credit_requests")
      .select("id, partner_id, amount_requested, status, requested_at, whatsapp_note, created_at"),
  ]);

  if (accountsResult.error) {
    throw new Error(`partner_credit_accounts list failed: ${accountsResult.error.message}`);
  }
  if (ledgerResult.error) {
    throw new Error(`partner_credit_ledger list failed: ${ledgerResult.error.message}`);
  }
  if (partnersResult.error) {
    throw new Error(`partner_profiles list failed: ${partnersResult.error.message}`);
  }

  const requestsRows: PartnerCreditRequestRow[] =
    requestsResult.error && isMissingTable(requestsResult.error)
      ? []
      : requestsResult.error
        ? (() => {
            throw new Error(`partner_credit_requests list failed: ${requestsResult.error.message}`);
          })()
        : (requestsResult.data ?? []);

  const partnerMetaById = buildPartnerMetaByIdMap(partnersResult.data ?? []);

  const balances = (accountsResult.data ?? []).map((row) => mapBalanceRow(row, partnerMetaById));
  const transactions = (ledgerResult.data ?? []).map((row) => mapLedgerRow(row, partnerMetaById));
  const requests = requestsRows.map((row) => mapRequestRow(row, partnerMetaById));

  return { transactions, requests, balances };
}

export async function addCreditsToPartnerAccount(input: {
  partnerId: string;
  amount: number;
  note?: string | null;
}): Promise<{ transaction: CreditTransaction; balance: UserCreditBalance }> {
  const supabase = createSupabaseAdminClient();
  const partnerId = input.partnerId.trim();
  const amount = Math.trunc(input.amount);
  if (!partnerId) throw new Error("partnerId is required.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be a positive integer.");

  const nowIso = new Date().toISOString();

  const [accountResult, partnerResult] = await Promise.all([
    supabase
      .from("partner_credit_accounts")
      .select("partner_id, balance, updated_at")
      .eq("partner_id", partnerId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("partner_profiles")
      .select("id, business_name, phone_number")
      .eq("id", partnerId)
      .maybeSingle(),
  ]);

  if (accountResult.error) {
    throw new Error(`partner_credit_accounts detail failed: ${accountResult.error.message}`);
  }
  if (partnerResult.error) {
    throw new Error(`partner_profiles detail failed: ${partnerResult.error.message}`);
  }

  const previousBalance = toNumber(accountResult.data?.balance) ?? 0;
  const newBalance = previousBalance + amount;

  if (accountResult.data) {
    const updateResult = await supabase
      .from("partner_credit_accounts")
      .update({
        balance: newBalance,
        updated_at: nowIso,
      })
      .eq("partner_id", partnerId);
    if (updateResult.error) {
      throw new Error(`partner_credit_accounts update failed: ${updateResult.error.message}`);
    }
  } else {
    const insertResult = await supabase.from("partner_credit_accounts").insert({
      partner_id: partnerId,
      balance: newBalance,
      updated_at: nowIso,
    });
    if (insertResult.error) {
      throw new Error(`partner_credit_accounts insert failed: ${insertResult.error.message}`);
    }
  }

  const ledgerNote = asText(input.note) || `Admin top-up: +${amount} credits`;
  const ledgerInsert = await supabase
    .from("partner_credit_ledger")
    .insert({
      partner_id: partnerId,
      event_type: "admin_topup",
      delta: amount,
      balance_after: newBalance,
      note: ledgerNote,
      metadata: { source: "admin_panel" },
      created_at: nowIso,
    })
    .select("id, partner_id, event_type, delta, balance_after, note, metadata, created_at")
    .limit(1)
    .single();

  if (ledgerInsert.error) {
    const message = ledgerInsert.error.message ?? "Unknown ledger insert error";
    if (message.toLowerCase().includes("event_type_check")) {
      throw new Error(
        "partner_credit_ledger insert failed: event_type 'admin_topup' is not allowed by DB constraint. Please update partner_credit_ledger_event_type_check.",
      );
    }
    throw new Error(`partner_credit_ledger insert failed: ${message}`);
  }

  const partnerName = asText(partnerResult.data?.business_name) || "Unknown partner";
  const partnerPhone = asText(partnerResult.data?.phone_number) || "N/A";

  const transaction = mapLedgerRow(
    ledgerInsert.data as PartnerCreditLedgerRow,
    new Map([[partnerId, { name: partnerName, phone: partnerPhone }]]),
  );
  const balance: UserCreditBalance = {
    userId: partnerId,
    userName: partnerName,
    userPhone: partnerPhone,
    balance: newBalance,
    lastTopupAt: nowIso.slice(0, 10),
  };

  return { transaction, balance };
}

export async function setPartnerCreditBalance(input: {
  partnerId: string;
  newBalance: number;
  note?: string | null;
}): Promise<{ transaction: CreditTransaction | null; balance: UserCreditBalance }> {
  const supabase = createSupabaseAdminClient();
  const partnerId = input.partnerId.trim();
  const nextBalance = Math.trunc(input.newBalance);
  if (!partnerId) throw new Error("partnerId is required.");
  if (!Number.isFinite(nextBalance) || nextBalance < 0) {
    throw new Error("newBalance must be a non-negative integer.");
  }

  const nowIso = new Date().toISOString();
  const [accountResult, partnerResult] = await Promise.all([
    supabase
      .from("partner_credit_accounts")
      .select("partner_id, balance, updated_at")
      .eq("partner_id", partnerId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("partner_profiles")
      .select("id, business_name, phone_number")
      .eq("id", partnerId)
      .maybeSingle(),
  ]);

  if (accountResult.error) {
    throw new Error(`partner_credit_accounts detail failed: ${accountResult.error.message}`);
  }
  if (partnerResult.error) {
    throw new Error(`partner_profiles detail failed: ${partnerResult.error.message}`);
  }

  const previousBalance = toNumber(accountResult.data?.balance) ?? 0;
  const delta = nextBalance - previousBalance;

  if (accountResult.data) {
    const updateResult = await supabase
      .from("partner_credit_accounts")
      .update({
        balance: nextBalance,
        updated_at: nowIso,
      })
      .eq("partner_id", partnerId);
    if (updateResult.error) {
      throw new Error(`partner_credit_accounts update failed: ${updateResult.error.message}`);
    }
  } else {
    const insertResult = await supabase.from("partner_credit_accounts").insert({
      partner_id: partnerId,
      balance: nextBalance,
      updated_at: nowIso,
    });
    if (insertResult.error) {
      throw new Error(`partner_credit_accounts insert failed: ${insertResult.error.message}`);
    }
  }

  const partnerName = asText(partnerResult.data?.business_name) || "Unknown partner";
  const partnerPhone = asText(partnerResult.data?.phone_number) || "N/A";
  const balance: UserCreditBalance = {
    userId: partnerId,
    userName: partnerName,
    userPhone: partnerPhone,
    balance: nextBalance,
    lastTopupAt: nowIso.slice(0, 10),
  };

  if (delta === 0) {
    return { transaction: null, balance };
  }

  const ledgerNote = asText(input.note) || `Admin edited balance from ${previousBalance} to ${nextBalance}`;
  const ledgerInsert = await supabase
    .from("partner_credit_ledger")
    .insert({
      partner_id: partnerId,
      event_type: "admin_topup",
      delta,
      balance_after: nextBalance,
      note: ledgerNote,
      metadata: { source: "admin_panel", action: "edit_balance" },
      created_at: nowIso,
    })
    .select("id, partner_id, event_type, delta, balance_after, note, metadata, created_at")
    .limit(1)
    .single();

  if (ledgerInsert.error) {
    throw new Error(`partner_credit_ledger insert failed: ${ledgerInsert.error.message}`);
  }

  const transaction = mapLedgerRow(
    ledgerInsert.data as PartnerCreditLedgerRow,
    new Map([[partnerId, { name: partnerName, phone: partnerPhone }]]),
  );
  return { transaction, balance };
}

function mapBalanceRow(
  row: PartnerCreditAccountRow,
  partnerMetaById: Map<string, { name: string; phone: string }>,
): UserCreditBalance {
  const partnerId = asText(row.partner_id) || "unknown-partner";
  const partnerMeta = partnerMetaById.get(partnerId);
  return {
    userId: partnerId,
    userName: partnerMeta?.name ?? "Unknown partner",
    userPhone: partnerMeta?.phone ?? "N/A",
    balance: toNumber(row.balance) ?? 0,
    lastTopupAt: normalizeDateOrNull(row.updated_at),
  };
}

function mapLedgerRow(
  row: PartnerCreditLedgerRow,
  partnerMetaById: Map<string, { name: string; phone: string }>,
): CreditTransaction {
  const partnerId = asText(row.partner_id) || "unknown-partner";
  const partnerMeta = partnerMetaById.get(partnerId);
  const amount = toNumber(row.delta) ?? 0;
  const eventType = normalizeTransactionType(row.event_type, amount);
  return {
    id: asText(row.id) || `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    userId: partnerId,
    userName: partnerMeta?.name ?? "Unknown partner",
    userPhone: partnerMeta?.phone ?? "N/A",
    amount,
    type: eventType,
    note: asText(row.note) || `Partner credit ${eventType}`,
    adminName: "Admin",
    reference: null,
    createdAt: normalizeDate(row.created_at),
  };
}

function mapRequestRow(
  row: PartnerCreditRequestRow,
  partnerMetaById: Map<string, { name: string; phone: string }>,
): CreditRequest {
  const partnerId = asText(row.partner_id) || "unknown-partner";
  const partnerMeta = partnerMetaById.get(partnerId);
  return {
    id: asText(row.id) || `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    userId: partnerId,
    userName: partnerMeta?.name ?? "Unknown partner",
    userPhone: partnerMeta?.phone ?? "N/A",
    amountRequested: toNumber(row.amount_requested) ?? 0,
    status: normalizeRequestStatus(row.status),
    requestedAt: normalizeDate(firstDefinedText(row.requested_at, row.created_at)),
    whatsappNote: asText(row.whatsapp_note) || null,
  };
}

function buildPartnerMetaByIdMap(rows: PartnerProfileRow[]): Map<string, { name: string; phone: string }> {
  const map = new Map<string, { name: string; phone: string }>();
  for (const row of rows) {
    const id = asText(row.id);
    if (!id) continue;
    map.set(id, {
      name: asText(row.business_name) || "Unknown partner",
      phone: asText(row.phone_number) || "N/A",
    });
  }
  return map;
}

function normalizeTransactionType(raw: unknown, amount: number): CreditTransactionType {
  const value = asText(raw).toLowerCase();
  if (value.includes("topup") || value.includes("top_up") || value.includes("deposit")) return "topup";
  if (value.includes("refund")) return "refund";
  if (value.includes("adjust")) return "adjustment";
  if (value.includes("usage") || value.includes("spend") || value.includes("deduct")) return "usage";
  return amount >= 0 ? "topup" : "usage";
}

function normalizeRequestStatus(raw: unknown): CreditRequestStatus {
  const value = asText(raw).toLowerCase();
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "pending";
}

function normalizeDateOrNull(raw: unknown): string | null {
  const d = normalizeDate(raw);
  return d === "N/A" ? null : d;
}

function normalizeDate(raw: unknown): string {
  const text = asText(raw);
  if (!text) return "N/A";
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return text;
  return d.toISOString().slice(0, 10);
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

function firstDefinedText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return "";
}

function isMissingTable(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || message.includes("does not exist");
}
