import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type OrderRow = Database["public"]["Tables"]["customer_orders"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PartnerOnboardingRow = Database["public"]["Tables"]["partner_onboarding_requests"]["Row"];
type PartnerProfileRow = Database["public"]["Tables"]["partner_profiles"]["Row"];

export type DashboardAttentionItem = {
  label: string;
  value: number;
  href: string;
  tone: "default" | "warning" | "danger";
};

export type DashboardRecentOrder = {
  id: string;
  customerName: string;
  status: string;
  createdAt: string;
};

export type DashboardRecentKycSubmission = {
  id: string;
  partnerName: string;
  businessName: string;
  submittedAt: string;
  status: string;
};

export type AdminDashboardData = {
  quickStats: {
    totalOrders: number;
    activeOrders: number;
    totalCustomers: number;
    totalPartners: number;
  };
  needsAttention: DashboardAttentionItem[];
  recentOrders: DashboardRecentOrder[];
  recentKycSubmissions: DashboardRecentKycSubmission[];
};

const ACTIVE_ORDER_STATUSES = new Set(["submitted", "accepted", "in_progress"]);

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createSupabaseAdminClient();

  const [
    totalOrdersResult,
    activeOrdersResult,
    totalCustomersResult,
    totalPartnersResult,
    pendingKycResult,
    openDisputesResult,
    lowCreditPartnersResult,
    recentOrdersResult,
    recentKycResult,
  ] = await Promise.all([
    supabase.from("customer_orders").select("id", { count: "exact", head: true }),
    supabase
      .from("customer_orders")
      .select("id", { count: "exact", head: true })
      .in("status", Array.from(ACTIVE_ORDER_STATUSES)),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer"),
    supabase
      .from("partner_onboarding_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("partner_onboarding_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase
      .from("order_disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("partner_credit_accounts")
      .select("partner_id", { count: "exact", head: true })
      .lt("balance", 200),
    supabase
      .from("customer_orders")
      .select("id, customer_id, status, created_at")
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from("partner_onboarding_requests")
      .select("id, user_id, status, submitted_at")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  ensureNoError(totalOrdersResult.error, "total orders");
  ensureNoError(activeOrdersResult.error, "active orders");
  ensureNoError(totalCustomersResult.error, "total customers");
  ensureNoError(totalPartnersResult.error, "total partners");
  ensureNoError(pendingKycResult.error, "pending kyc");
  ensureNoError(openDisputesResult.error, "open disputes");
  ensureNoError(recentOrdersResult.error, "recent orders");
  ensureNoError(recentKycResult.error, "recent kyc submissions");

  if (lowCreditPartnersResult.error && !isMissingTable(lowCreditPartnersResult.error)) {
    throw new Error(`Failed to load low credit partners: ${lowCreditPartnersResult.error.message}`);
  }

  const recentOrders = await buildRecentOrders(supabase, recentOrdersResult.data ?? []);
  const recentKycSubmissions = await buildRecentKycSubmissions(supabase, recentKycResult.data ?? []);

  const pendingKycCount = pendingKycResult.count ?? 0;
  const openDisputesCount = openDisputesResult.count ?? 0;
  const lowCreditPartnersCount = lowCreditPartnersResult.count ?? 0;

  return {
    quickStats: {
      totalOrders: totalOrdersResult.count ?? 0,
      activeOrders: activeOrdersResult.count ?? 0,
      totalCustomers: totalCustomersResult.count ?? 0,
      totalPartners: totalPartnersResult.count ?? 0,
    },
    needsAttention: [
      {
        label: "Pending KYC",
        value: pendingKycCount,
        href: "/partner-kyc",
        tone: pendingKycCount > 0 ? "warning" : "default",
      },
      {
        label: "Open Disputes",
        value: openDisputesCount,
        href: "/disputes",
        tone: openDisputesCount > 0 ? "danger" : "default",
      },
      {
        label: "Low Credit Partners",
        value: lowCreditPartnersCount,
        href: "/credits",
        tone: "default",
      },
    ],
    recentOrders,
    recentKycSubmissions,
  };
}

async function buildRecentOrders(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  orderRows: OrderRow[],
): Promise<DashboardRecentOrder[]> {
  const customerIds = Array.from(
    new Set(orderRows.map((row) => asText(row.customer_id)).filter(Boolean)),
  );

  let profilesById = new Map<string, ProfileRow>();
  if (customerIds.length > 0) {
    const profilesResult = await supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name")
      .in("id", customerIds);

    ensureNoError(profilesResult.error, "recent order customers");
    profilesById = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  }

  return orderRows.map((row) => {
    const customerId = asText(row.customer_id);
    const profile = customerId ? profilesById.get(customerId) : null;
    return {
      id: asText(row.id) || "N/A",
      customerName: buildProfileName(profile),
      status: normalizeOrderStatus(row.status),
      createdAt: normalizeDate(asText(row.created_at)),
    };
  });
}

async function buildRecentKycSubmissions(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  requestRows: PartnerOnboardingRow[],
): Promise<DashboardRecentKycSubmission[]> {
  const userIds = Array.from(new Set(requestRows.map((row) => asText(row.user_id)).filter(Boolean)));

  let profilesById = new Map<string, ProfileRow>();
  let partnerProfilesById = new Map<string, PartnerProfileRow>();

  if (userIds.length > 0) {
    const [profilesResult, partnerProfilesResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, first_name, last_name").in("id", userIds),
      supabase.from("partner_profiles").select("id, business_name").in("id", userIds),
    ]);

    ensureNoError(profilesResult.error, "recent kyc profile names");
    ensureNoError(partnerProfilesResult.error, "recent kyc business names");

    profilesById = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
    partnerProfilesById = new Map((partnerProfilesResult.data ?? []).map((row) => [row.id, row]));
  }

  return requestRows.map((row) => {
    const userId = asText(row.user_id);
    const profile = userId ? profilesById.get(userId) : null;
    const partnerProfile = userId ? partnerProfilesById.get(userId) : null;

    return {
      id: asText(row.id) || "N/A",
      partnerName: buildProfileName(profile),
      businessName: asText(partnerProfile?.business_name) || "N/A",
      submittedAt: normalizeDate(asText(row.submitted_at)),
      status: normalizeKycStatus(row.status),
    };
  });
}

function buildProfileName(profile?: ProfileRow | null): string {
  if (!profile) return "N/A";
  const fullName = asText(profile.full_name);
  if (fullName) return fullName;

  const firstName = asText(profile.first_name);
  const lastName = asText(profile.last_name);
  const merged = `${firstName} ${lastName}`.trim();
  return merged || "N/A";
}

function normalizeOrderStatus(raw: string | null | undefined): string {
  const status = asText(raw).toLowerCase();
  if (!status) return "N/A";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeKycStatus(raw: string | null | undefined): string {
  const status = asText(raw).toLowerCase();
  if (!status) return "N/A";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function normalizeDate(raw: string): string {
  if (!raw) return "N/A";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toISOString().slice(0, 10);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function ensureNoError(
  error: { message: string } | null,
  label: string,
): void {
  if (error) throw new Error(`Failed to load ${label}: ${error.message}`);
}

function isMissingTable(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || message.includes("does not exist");
}
