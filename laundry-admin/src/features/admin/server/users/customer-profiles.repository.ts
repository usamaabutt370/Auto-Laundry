import "server-only";

import { escapeIlike, isValidUuid, paginatedRange } from "@/features/admin/server/admin-list-query";
import type { AdminListQuery, PaginatedResult } from "@/features/admin/server/admin-list-query";
import type { AdminUser } from "@/features/admin/types/admin-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type CustomerOrderRow = Database["public"]["Tables"]["customer_orders"]["Row"];
type PartnerOnboardingRequestRow =
  Database["public"]["Tables"]["partner_onboarding_requests"]["Row"];

export async function listCustomerProfilesForAdminPaginated(
  input: AdminListQuery,
): Promise<PaginatedResult<AdminUser>> {
  const supabase = createSupabaseAdminClient();
  const { from, to } = paginatedRange(input.page, input.pageSize);

  let profilesQuery = supabase
    .from("profiles")
    .select("id, email, phone, full_name, first_name, last_name, role, created_at", { count: "exact" })
    .eq("role", "customer")
    .order("created_at", { ascending: false, nullsFirst: false });

  if (input.query) {
    const raw = input.query.trim();
    if (isValidUuid(raw)) {
      profilesQuery = profilesQuery.eq("id", raw);
    } else {
      const q = escapeIlike(raw);
      profilesQuery = profilesQuery.or(
        `email.ilike.%${q}%,phone.ilike.%${q}%,full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`,
      );
    }
  }

  const profilesResult = await profilesQuery.range(from, to);
  if (profilesResult.error) {
    throw new Error(`profiles list failed: ${profilesResult.error.message}`);
  }

  const profiles = profilesResult.data ?? [];
  if (profiles.length === 0) {
    return {
      items: [],
      total: profilesResult.count ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  const userIds = profiles.map((row) => row.id);
  const [ordersResult, onboardingResult] = await Promise.all([
    supabase.from("customer_orders").select("id, customer_id").in("customer_id", userIds),
    supabase
      .from("partner_onboarding_requests")
      .select("id, user_id, status, submitted_at, reviewed_at, created_at, updated_at")
      .in("user_id", userIds),
  ]);

  if (ordersResult.error) {
    throw new Error(`customer_orders list failed: ${ordersResult.error.message}`);
  }
  if (onboardingResult.error) {
    throw new Error(`partner_onboarding_requests list failed: ${onboardingResult.error.message}`);
  }

  const orderCountsByCustomer = buildOrderCountMap(ordersResult.data ?? []);
  const onboardingStatusByUser = buildOnboardingStatusMap(onboardingResult.data ?? []);

  return {
    items: profiles.map((row) => mapProfileRow(row, orderCountsByCustomer, onboardingStatusByUser)),
    total: profilesResult.count ?? profiles.length,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function listCustomerProfilesForAdmin(): Promise<AdminUser[]> {
  const supabase = createSupabaseAdminClient();

  const profilesResult = await supabase
    .from("profiles")
    .select("id, email, phone, full_name, first_name, last_name, role, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false, nullsFirst: false });

  if (profilesResult.error) {
    throw new Error(`profiles list failed: ${profilesResult.error.message}`);
  }

  const ordersResult = await supabase.from("customer_orders").select("id, customer_id");

  if (ordersResult.error) {
    throw new Error(`customer_orders list failed: ${ordersResult.error.message}`);
  }

  const onboardingResult = await supabase
    .from("partner_onboarding_requests")
    .select("id, user_id, status, submitted_at, reviewed_at, created_at, updated_at");

  const orderCountsByCustomer = buildOrderCountMap(ordersResult.data ?? []);
  if (onboardingResult.error) {
    throw new Error(
      `partner_onboarding_requests list failed: ${onboardingResult.error.message}`,
    );
  }
  const onboardingStatusByUser = buildOnboardingStatusMap(onboardingResult.data ?? []);

  return (profilesResult.data ?? []).map((row) =>
    mapProfileRow(row, orderCountsByCustomer, onboardingStatusByUser),
  );
}

function mapProfileRow(
  row: ProfileRow,
  orderCountsByCustomer: Map<string, number>,
  onboardingStatusByUser: Map<string, AdminUser["status"]>,
): AdminUser {
  const firstName = asText(row.first_name);
  const lastName = asText(row.last_name);
  const mergedName = `${firstName} ${lastName}`.trim();

  const email = firstDefinedText(row.email);
  const phone = firstDefinedText(row.phone);
  const joinedAt = firstDefinedText(row.created_at);

  return {
    id: firstDefinedText(row.id) || "unknown",
    name: firstDefinedText(row.full_name, mergedName, "Unknown user") || "Unknown user",
    email: email || "N/A",
    phone: phone || "N/A",
    status: onboardingStatusByUser.get(row.id) ?? "N/A",
    orders: orderCountsByCustomer.get(row.id) ?? 0,
    joinedAt: normalizeDate(joinedAt),
  };
}

function buildOrderCountMap(rows: CustomerOrderRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.customer_id) continue;
    map.set(row.customer_id, (map.get(row.customer_id) ?? 0) + 1);
  }
  return map;
}

function buildOnboardingStatusMap(
  rows: PartnerOnboardingRequestRow[],
): Map<string, AdminUser["status"]> {
  const latestByUser = new Map<string, PartnerOnboardingRequestRow>();

  for (const row of rows) {
    if (!row.user_id) continue;
    const existing = latestByUser.get(row.user_id);
    if (!existing) {
      latestByUser.set(row.user_id, row);
      continue;
    }

    const existingTime = requestSortTime(existing);
    const currentTime = requestSortTime(row);
    if (currentTime > existingTime) {
      latestByUser.set(row.user_id, row);
    }
  }

  const map = new Map<string, AdminUser["status"]>();
  for (const [userId, row] of latestByUser.entries()) {
    map.set(userId, normalizeOnboardingStatus(row.status));
  }
  return map;
}

function requestSortTime(row: PartnerOnboardingRequestRow): number {
  const raw =
    firstDefinedText(row.reviewed_at, row.submitted_at, row.updated_at, row.created_at) ?? "";
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeOnboardingStatus(raw: string | null | undefined): AdminUser["status"] {
  const status = (raw ?? "").toLowerCase();
  if (status === "pending") return "Pending";
  if (status === "approved") return "Active";
  if (status === "rejected") return "Blocked";
  return "N/A";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstDefinedText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeDate(value: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}
