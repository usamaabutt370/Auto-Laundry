import "server-only";

import { escapeIlike, isValidUuid, paginatedRange } from "@/features/admin/server/admin-list-query";
import type { AdminListQuery, PaginatedResult } from "@/features/admin/server/admin-list-query";
import type {
  AdminDispute,
  DisputeCategory,
  DisputeStatus,
} from "@/features/admin/types/admin-dispute";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type OrderDisputeRow = {
  id: string;
  order_id: string;
  customer_id: string;
  partner_id: string;
  category: string;
  description: string;
  image_urls: string[] | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type PartnerProfileRow = {
  id: string;
  business_name?: string | null;
};

export async function listOrderDisputesForAdminPaginated(
  input: AdminListQuery,
): Promise<PaginatedResult<AdminDispute>> {
  const supabase = createSupabaseAdminClient();
  const { from, to } = paginatedRange(input.page, input.pageSize);

  let customerIds: string[] = [];
  let partnerIds: string[] = [];
  if (input.query) {
    const q = escapeIlike(input.query);
    const [profilesResult, partnersResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`),
      supabase.from("partner_profiles").select("id").ilike("business_name", `%${q}%`),
    ]);
    if (profilesResult.error) {
      throw new Error(`profiles search failed: ${profilesResult.error.message}`);
    }
    if (partnersResult.error) {
      throw new Error(`partner_profiles search failed: ${partnersResult.error.message}`);
    }
    customerIds = (profilesResult.data ?? []).map((row) => row.id);
    partnerIds = (partnersResult.data ?? []).map((row) => row.id);
  }

  let disputesQuery = supabase
    .from("order_disputes")
    .select(
      "id, order_id, customer_id, partner_id, category, description, image_urls, status, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false, nullsFirst: false });

  const dbStatus = adminDisputeStatusToDb(input.status);
  if (dbStatus) disputesQuery = disputesQuery.eq("status", dbStatus);

  const dbCategory = adminDisputeCategoryToDb(input.category || "all");
  if (dbCategory) disputesQuery = disputesQuery.eq("category", dbCategory);

  if (input.query) {
    const raw = input.query.trim();
    const q = escapeIlike(raw);
    const disputeIds = new Set<string>();

    const idSearches = [
      supabase.from("order_disputes").select("id").ilike("description", `%${q}%`),
    ];
    if (isValidUuid(raw)) {
      idSearches.push(supabase.from("order_disputes").select("id").eq("id", raw));
      idSearches.push(supabase.from("order_disputes").select("id").eq("order_id", raw));
    }
    if (customerIds.length > 0) {
      idSearches.push(supabase.from("order_disputes").select("id").in("customer_id", customerIds));
    }
    if (partnerIds.length > 0) {
      idSearches.push(supabase.from("order_disputes").select("id").in("partner_id", partnerIds));
    }

    const idResults = await Promise.all(idSearches);
    for (const result of idResults) {
      if (result.error) throw new Error(`order_disputes search failed: ${result.error.message}`);
      for (const row of result.data ?? []) disputeIds.add(row.id);
    }

    if (disputeIds.size === 0) {
      return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
    }
    disputesQuery = disputesQuery.in("id", Array.from(disputeIds));
  }

  const disputesResult = await disputesQuery.range(from, to);
  if (disputesResult.error) {
    throw new Error(`order_disputes list failed: ${disputesResult.error.message}`);
  }

  const disputes = disputesResult.data ?? [];
  if (disputes.length === 0) {
    return {
      items: [],
      total: disputesResult.count ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  const pageCustomerIds = [...new Set(disputes.map((row) => row.customer_id).filter(Boolean))] as string[];
  const pagePartnerIds = [...new Set(disputes.map((row) => row.partner_id).filter(Boolean))] as string[];

  const [profilesResult, partnersResult] = await Promise.all([
    pageCustomerIds.length > 0
      ? supabase.from("profiles").select("id, full_name, first_name, last_name").in("id", pageCustomerIds)
      : Promise.resolve({ data: [], error: null }),
    pagePartnerIds.length > 0
      ? supabase.from("partner_profiles").select("id, business_name").in("id", pagePartnerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    throw new Error(`profiles list failed: ${profilesResult.error.message}`);
  }
  if (partnersResult.error) {
    throw new Error(`partner_profiles list failed: ${partnersResult.error.message}`);
  }

  const customerNameById = buildCustomerNameByIdMap(profilesResult.data ?? []);
  const partnerNameById = buildPartnerNameByIdMap(partnersResult.data ?? []);

  return {
    items: disputes.map((row) =>
      mapDisputeRow(row as OrderDisputeRow, {
        customerNameById,
        partnerNameById,
      }),
    ),
    total: disputesResult.count ?? disputes.length,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function listOrderDisputesForAdmin(): Promise<AdminDispute[]> {
  const supabase = createSupabaseAdminClient();

  const [disputesResult, profilesResult, partnersResult] = await Promise.all([
    supabase
      .from("order_disputes")
      .select(
        "id, order_id, customer_id, partner_id, category, description, image_urls, status, created_at, updated_at",
      )
      .order("created_at", { ascending: false, nullsFirst: false }),
    supabase.from("profiles").select("id, full_name, first_name, last_name"),
    supabase.from("partner_profiles").select("id, business_name"),
  ]);

  if (disputesResult.error) {
    throw new Error(`order_disputes list failed: ${disputesResult.error.message}`);
  }
  if (profilesResult.error) {
    throw new Error(`profiles list failed: ${profilesResult.error.message}`);
  }
  if (partnersResult.error) {
    throw new Error(`partner_profiles list failed: ${partnersResult.error.message}`);
  }

  const customerNameById = buildCustomerNameByIdMap(profilesResult.data ?? []);
  const partnerNameById = buildPartnerNameByIdMap(partnersResult.data ?? []);

  return (disputesResult.data ?? []).map((row) =>
    mapDisputeRow(row as OrderDisputeRow, {
      customerNameById,
      partnerNameById,
    }),
  );
}

function mapDisputeRow(
  row: OrderDisputeRow,
  ctx: {
    customerNameById: Map<string, string>;
    partnerNameById: Map<string, string>;
  },
): AdminDispute {
  const summary =
    row.description.trim().length > 80
      ? `${row.description.trim().slice(0, 77)}...`
      : row.description.trim();

  return {
    id: formatDisputeId(row.id),
    orderId: formatOrderRef(row.order_id),
    customer: ctx.customerNameById.get(row.customer_id) ?? "N/A",
    partner: ctx.partnerNameById.get(row.partner_id) ?? "N/A",
    category: normalizeCategory(row.category),
    summary,
    description: row.description.trim(),
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : [],
    status: normalizeStatus(row.status),
    openedAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function formatDisputeId(id: string): string {
  const compact = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `DSP-${compact}`;
}

function formatOrderRef(orderId: string): string {
  const compact = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `ORD-${compact}`;
}

function adminDisputeStatusToDb(status: string): string | null {
  switch (status) {
    case "Open":
      return "open";
    case "Under review":
      return "under_review";
    case "Resolved":
      return "resolved";
    case "Closed":
      return "closed";
    default:
      return null;
  }
}

function adminDisputeCategoryToDb(category: string): string | null {
  switch (category) {
    case "Damaged items":
      return "damaged_items";
    case "Missed pickup":
      return "missed_pickup";
    case "Billing":
      return "billing";
    case "Delivery delay":
      return "delivery_delay";
    case "Wrong items":
      return "wrong_items";
    case "Other":
      return "other";
    default:
      return null;
  }
}

function normalizeCategory(raw: string): DisputeCategory {
  switch (raw) {
    case "damaged_items":
      return "Damaged items";
    case "missed_pickup":
      return "Missed pickup";
    case "billing":
      return "Billing";
    case "delivery_delay":
      return "Delivery delay";
    case "wrong_items":
      return "Wrong items";
    default:
      return "Other";
  }
}

function normalizeStatus(raw: string): DisputeStatus {
  switch (raw) {
    case "under_review":
      return "Under review";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return "Open";
  }
}

function normalizeDate(raw: string | null): string {
  if (!raw) return "N/A";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
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
    const name = row.business_name?.trim();
    map.set(row.id, name || "N/A");
  }
  return map;
}

function buildFullName(
  fullName: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const direct = fullName?.trim();
  if (direct) return direct;
  const merged = `${firstName?.trim() ?? ""} ${lastName?.trim() ?? ""}`.trim();
  return merged || "N/A";
}
