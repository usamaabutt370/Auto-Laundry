import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AdminPartnerKycDetail,
  AdminPartnerKycListItem,
  PartnerKycSnapshot,
  PartnerOnboardingStatus,
} from "@/features/admin/types/admin-partner-kyc";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PartnerOnboardingRequestRow =
  Database["public"]["Tables"]["partner_onboarding_requests"]["Row"];

export async function listPartnerKycRequestsForAdmin(): Promise<AdminPartnerKycListItem[]> {
  const supabase = createSupabaseAdminClient();
  const [profilesResult, partnerProfilesResult, requestsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, first_name, last_name, email, phone, role"),
    supabase.from("partner_profiles").select("*"),
    supabase
      .from("partner_onboarding_requests")
      .select("id, user_id, status, submitted_at, reviewed_at, reviewed_by, updated_at, notes")
      .order("updated_at", { ascending: false, nullsFirst: false }),
  ]);

  if (profilesResult.error) throw new Error(`profiles list failed: ${profilesResult.error.message}`);
  if (partnerProfilesResult.error) {
    throw new Error(`partner_profiles list failed: ${partnerProfilesResult.error.message}`);
  }
  if (requestsResult.error) {
    throw new Error(`partner_onboarding_requests list failed: ${requestsResult.error.message}`);
  }

  const profilesById = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
  const partnerProfilesById = new Map((partnerProfilesResult.data ?? []).map((p) => [p.id, p]));
  const latestRequestByUserId = buildLatestRequestByUserMap(requestsResult.data ?? []);

  const allPartnerIds = new Set<string>();
  for (const partner of partnerProfilesById.values()) allPartnerIds.add(partner.id);
  for (const [userId] of latestRequestByUserId.entries()) allPartnerIds.add(userId);
  for (const profile of profilesById.values()) {
    if (asText(profile.role).toLowerCase() === "launderer") allPartnerIds.add(profile.id);
  }

  const list: AdminPartnerKycListItem[] = Array.from(allPartnerIds).map((userId) => {
    const req = latestRequestByUserId.get(userId);
    const profile = profilesById.get(userId);
    const partnerProfile = partnerProfilesById.get(userId);
    return {
      userId,
      partnerName:
        (profile ? buildFullName(profile) : null) ??
        readSnapshotText(req?.notes, "businessProfile", "contactName") ??
        "N/A",
      businessName:
        asText(partnerProfile?.business_name) ||
        readSnapshotText(req?.notes, "businessProfile", "businessName") ||
        "N/A",
      email: asText(profile?.email) || "N/A",
      phone: asText(profile?.phone) || "N/A",
      status: resolvePartnerStatus(partnerProfile?.status, req?.status),
      submittedAt: asTextOrNull(req?.submitted_at),
      reviewedAt: asTextOrNull(req?.reviewed_at),
      reviewedBy: asTextOrNull(req?.reviewed_by),
    };
  });

  return list.sort((a, b) => sortIsoDesc(a.submittedAt, b.submittedAt));
}

export async function getPartnerKycDetailForAdmin(userId: string): Promise<AdminPartnerKycDetail | null> {
  const supabase = createSupabaseAdminClient();
  const [profileResult, partnerProfileResult, servicesResult, requestsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, email, phone, role, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("partner_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("partner_services")
      .select("id, user_id, name, category, price_display, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true, nullsFirst: true }),
    supabase
      .from("partner_onboarding_requests")
      .select(
        "id, user_id, status, submitted_at, reviewed_at, reviewed_by, rejection_reason, notes, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw new Error(`profiles detail failed: ${profileResult.error.message}`);
  if (partnerProfileResult.error) {
    throw new Error(`partner_profiles detail failed: ${partnerProfileResult.error.message}`);
  }
  if (servicesResult.error) throw new Error(`partner_services list failed: ${servicesResult.error.message}`);
  if (requestsResult.error) {
    throw new Error(`partner_onboarding_requests detail failed: ${requestsResult.error.message}`);
  }

  const profile = profileResult.data;
  if (!profile) return null;
  const request = requestsResult.data;

  return {
    userId,
    profile: {
      fullName: buildFullName(profile) || "N/A",
      firstName: asTextOrNull(profile.first_name),
      lastName: asTextOrNull(profile.last_name),
      email: asTextOrNull(profile.email),
      phone: asTextOrNull(profile.phone),
      role: asTextOrNull(profile.role),
      createdAt: asTextOrNull(profile.created_at),
    },
    business: {
      businessName:
        asTextOrNull(partnerProfileResult.data?.business_name) ??
        readSnapshotText(request?.notes, "businessProfile", "businessName"),
      businessDescription:
        asTextOrNull(partnerProfileResult.data?.business_description) ??
        readSnapshotText(request?.notes, "businessProfile", "businessDescription"),
      pickupDeliveryEnabled:
        typeof partnerProfileResult.data?.pickup_delivery_enabled === "boolean"
          ? partnerProfileResult.data.pickup_delivery_enabled
          : typeof readSnapshotValue(request?.notes, "servicePricing", "pickupDeliveryEnabled") === "boolean"
            ? (readSnapshotValue(request?.notes, "servicePricing", "pickupDeliveryEnabled") as boolean)
            : null,
      pickupDeliveryAmount:
        asTextOrNull(partnerProfileResult.data?.pickup_delivery_amount) ??
        readSnapshotText(request?.notes, "servicePricing", "pickupDeliveryAmount"),
    },
    services: buildServiceRows(servicesResult.data ?? [], request?.notes),
    request: {
      id: asTextOrNull(request?.id),
      status: resolvePartnerStatus(partnerProfileResult.data?.status, request?.status),
      submittedAt: asTextOrNull(request?.submitted_at),
      reviewedAt: asTextOrNull(request?.reviewed_at),
      reviewedBy: asTextOrNull(request?.reviewed_by),
      rejectionReason: asTextOrNull(request?.rejection_reason),
      updatedAt: asTextOrNull(request?.updated_at),
      notes: parseSnapshot(request?.notes),
      notesRaw: request?.notes ?? null,
    },
  };
}

export async function approvePartnerKycRequest(input: {
  userId: string;
  reviewedBy?: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const upsertResult = await supabase
    .from("partner_onboarding_requests")
    .upsert({
      user_id: input.userId,
      status: "approved",
      reviewed_at: now,
      reviewed_by: input.reviewedBy ?? null,
      rejection_reason: null,
      updated_at: now,
    }, { onConflict: "user_id" });

  if (upsertResult.error) {
    throw new Error(`approve partner_onboarding_requests failed: ${upsertResult.error.message}`);
  }

  const profileStatusResult = await supabase
    .from("partner_profiles")
    .update({
      status: "approved",
      updated_at: now,
    })
    .eq("id", input.userId);

  if (profileStatusResult.error && !isMissingPartnerStatusColumnError(profileStatusResult.error)) {
    throw new Error(`approve partner_profiles status failed: ${profileStatusResult.error.message}`);
  }
}

export async function rejectPartnerKycRequest(input: {
  userId: string;
  reason: string;
  reviewedBy?: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const upsertResult = await supabase
    .from("partner_onboarding_requests")
    .upsert({
      user_id: input.userId,
      status: "rejected",
      reviewed_at: now,
      reviewed_by: input.reviewedBy ?? null,
      rejection_reason: input.reason,
      updated_at: now,
    }, { onConflict: "user_id" });

  if (upsertResult.error) {
    throw new Error(`reject partner_onboarding_requests failed: ${upsertResult.error.message}`);
  }

  const profileStatusResult = await supabase
    .from("partner_profiles")
    .update({
      status: "rejected",
      updated_at: now,
    })
    .eq("id", input.userId);

  if (profileStatusResult.error && !isMissingPartnerStatusColumnError(profileStatusResult.error)) {
    throw new Error(`reject partner_profiles status failed: ${profileStatusResult.error.message}`);
  }
}

function buildLatestRequestByUserMap(
  rows: PartnerOnboardingRequestRow[],
): Map<string, PartnerOnboardingRequestRow> {
  const map = new Map<string, PartnerOnboardingRequestRow>();
  for (const row of rows) {
    if (!row.user_id) continue;
    const current = map.get(row.user_id);
    if (!current || sortIsoDesc(row.updated_at, current.updated_at) < 0) {
      map.set(row.user_id, row);
    }
  }
  return map;
}

function buildServiceRows(
  rows: Array<{ id: string; name?: string | null; category?: string | null; price_display?: string | null }>,
  notes: unknown,
): AdminPartnerKycDetail["services"] {
  if (rows.length > 0) {
    return rows.map((row) => ({
      id: row.id,
      name: asText(row.name) || "N/A",
      category: asTextOrNull(row.category),
      priceDisplay: asTextOrNull(row.price_display),
    }));
  }

  const snapshotLines = readSnapshotValue(notes, "serviceLines");
  if (!Array.isArray(snapshotLines)) return [];
  return snapshotLines.map((line, idx) => {
    const item = isObject(line) ? line : {};
    return {
      id: `snapshot-${idx + 1}`,
      name: asText(item.name) || asText(item.serviceName) || "N/A",
      category: asTextOrNull(item.category),
      priceDisplay: asTextOrNull(item.price_display) ?? asTextOrNull(item.priceDisplay),
    };
  });
}

function buildFullName(row: ProfileRow): string {
  const fromParts = `${asText(row.first_name)} ${asText(row.last_name)}`.trim();
  if (fromParts) return fromParts;
  const fullName = asText(row.full_name);
  if (fullName) return fullName;
  return "";
}

function normalizeStatus(raw: unknown): PartnerOnboardingStatus {
  const value = asText(raw).toLowerCase();
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  // Both legacy workflow states map to pending in admin UX.
  if (value === "submitted" || value === "draft" || value === "pending") return "pending";
  return "pending";
}

function resolvePartnerStatus(
  partnerProfileStatus: unknown,
  onboardingStatus: unknown,
): PartnerOnboardingStatus {
  const fromPartnerProfile = normalizeStatus(partnerProfileStatus);
  if (fromPartnerProfile !== "pending") return fromPartnerProfile;
  return normalizeStatus(onboardingStatus);
}

function isMissingPartnerStatusColumnError(error: { code?: string | null; message?: string | null }): boolean {
  const message = (error.message ?? "").toLowerCase();
  return error.code === "42703" || message.includes("column") && message.includes("status") && message.includes("does not exist");
}

function parseSnapshot(value: unknown): PartnerKycSnapshot | null {
  if (!isObject(value)) return null;
  return {
    businessProfile: isObject(value.businessProfile) ? value.businessProfile : null,
    servicePricing: isObject(value.servicePricing) ? value.servicePricing : null,
    serviceLines: Array.isArray(value.serviceLines) ? value.serviceLines : null,
  };
}

function readSnapshotValue(value: unknown, ...path: string[]): unknown {
  if (!isObject(value)) return null;
  let current: unknown = value;
  for (const key of path) {
    if (!isObject(current) || !(key in current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function readSnapshotText(value: unknown, ...path: string[]): string | null {
  return asTextOrNull(readSnapshotValue(value, ...path));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sortIsoDesc(a: unknown, b: unknown): number {
  const ta = Date.parse(asText(a));
  const tb = Date.parse(asText(b));
  const va = Number.isNaN(ta) ? 0 : ta;
  const vb = Number.isNaN(tb) ? 0 : tb;
  return vb - va;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTextOrNull(value: unknown): string | null {
  const text = asText(value);
  return text || null;
}
