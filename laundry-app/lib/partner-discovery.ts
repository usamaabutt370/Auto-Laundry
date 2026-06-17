import type { LaundererServiceType } from "@/constants/launderers";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { parsePriceDisplay } from "@/utils/parse-price-display";

export type PartnerPublicRow = {
  id: string;
  business_name: string;
  phone_number: string | null;
  available_time: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  business_images: string[] | null;
  updated_at: string | null;
};

export type PartnerDetailRow = PartnerPublicRow & {
  business_description: string | null;
  pickup_delivery_enabled: boolean | null;
  pickup_delivery_amount: string | null;
};

export type PartnerServiceLine = {
  name: string;
  price_display: string;
  category: string | null;
};

export type PartnerFulfillmentMode = "dropoff" | "pickupDelivery";

export type PartnerMapMarkerRow = PartnerPublicRow & {
  fulfillmentMode: PartnerFulfillmentMode;
};

function isValidPartnerName(row: { business_name?: unknown }): boolean {
  return typeof row.business_name === "string" && row.business_name.trim().length > 0;
}

function toMapMarker(
  row: PartnerPublicRow & { pickup_delivery_amount?: string | null },
): PartnerMapMarkerRow | null {
  if (!isValidPartnerName(row)) return null;
  const amount =
    typeof row.pickup_delivery_amount === "string" ? row.pickup_delivery_amount.trim() : "";
  return {
    id: row.id,
    business_name: row.business_name,
    phone_number: row.phone_number,
    available_time: row.available_time,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    image_url: row.image_url,
    business_images: row.business_images,
    updated_at: row.updated_at,
    fulfillmentMode: amount.length > 0 ? "pickupDelivery" : "dropoff",
  };
}

/** Single-query partner fetch for the customer home map. */
export async function fetchMapPartners(): Promise<{
  data: PartnerMapMarkerRow[] | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("partner_profiles")
    .select(
      "id, business_name, phone_number, available_time, address, latitude, longitude, image_url, business_images, updated_at, pickup_delivery_amount",
    )
    .order("business_name", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = (data ?? [])
    .map((row) => toMapMarker(row as PartnerPublicRow & { pickup_delivery_amount?: string | null }))
    .filter((row): row is PartnerMapMarkerRow => row != null);

  return { data: rows, error: null };
}

export function partnerOffersPickupDelivery(
  profile:
    | Pick<PartnerDetailRow, "pickup_delivery_enabled" | "pickup_delivery_amount">
    | null
    | undefined,
): boolean {
  if (!profile) return false;
  if (profile.pickup_delivery_enabled) return true;
  return Boolean(profile.pickup_delivery_amount?.trim());
}

/** Partners who offer pickup & delivery (for customer Pick Up & Delivery list). */
export async function fetchPickupPartners(): Promise<{
  data: PartnerPublicRow[] | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }
  const { data, error } = await supabase
    .from("partner_profiles")
    .select(
      "id, business_name, phone_number, available_time, address, latitude, longitude, image_url, business_images, updated_at"
    )
    .eq("pickup_delivery_enabled", true)
    .order("business_name", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  // RLS policy "Partner profiles: authenticated can read verified discovery partners"
  // already filters to approved-only rows at the DB level.
  const rows = (data ?? []).filter(
    (r) => typeof r.business_name === "string" && r.business_name.trim().length > 0
  ) as PartnerPublicRow[];
  return { data: rows, error: null };
}

/** Partners filtered by fulfillment mode for customer home buttons. */
export async function fetchPartnersByFulfillmentMode(
  mode: PartnerFulfillmentMode,
): Promise<{
  data: PartnerPublicRow[] | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("partner_profiles")
    .select(
      "id, business_name, phone_number, available_time, address, latitude, longitude, image_url, business_images, updated_at, pickup_delivery_amount",
    )
    .order("business_name", { ascending: true });

  if (mode === "pickupDelivery") {
    query = query.neq("pickup_delivery_amount", "");
  } else {
    query = query.or("pickup_delivery_amount.is.null,pickup_delivery_amount.eq.");
  }

  const { data, error } = await query;
  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []).filter((r) => {
    if (typeof r.business_name !== "string" || r.business_name.trim().length === 0) {
      return false;
    }
    const amount = typeof r.pickup_delivery_amount === "string" ? r.pickup_delivery_amount.trim() : "";
    return mode === "pickupDelivery" ? amount.length > 0 : amount.length === 0;
  }) as PartnerPublicRow[];
  return { data: rows, error: null };
}

export async function fetchPartnerDetail(partnerId: string): Promise<{
  profile: PartnerDetailRow | null;
  services: PartnerServiceLine[];
  error: string | null;
}> {
  if (!isSupabaseConfigured() || !supabase || !partnerId) {
    return { profile: null, services: [], error: null };
  }
  const { data: profile, error: pErr } = await supabase
    .from("partner_profiles")
    .select(
      "id, business_name, business_description, phone_number, available_time, address, latitude, longitude, image_url, business_images, updated_at, pickup_delivery_enabled, pickup_delivery_amount"
    )
    .eq("id", partnerId)
    .maybeSingle<PartnerDetailRow>();

  if (pErr) {
    return { profile: null, services: [], error: pErr.message };
  }
  if (!profile) {
    return { profile: null, services: [], error: null };
  }

  const { data: serviceRows, error: sErr } = await supabase
    .from("partner_services")
    .select("name, price_display, category")
    .eq("user_id", partnerId)
    .order("created_at", { ascending: true });

  if (sErr) {
    return { profile, services: [], error: sErr.message };
  }

  return {
    profile,
    services: (serviceRows ?? []) as PartnerServiceLine[],
    error: null,
  };
}

export function serviceCategoriesToTypes(
  categories: (string | null | undefined)[],
  priceDisplays?: (string | null | undefined)[]
): LaundererServiceType[] {
  const out = new Set<LaundererServiceType>();
  for (const [idx, raw] of categories.entries()) {
    const priceRaw = priceDisplays?.[idx] ?? "";
    if (priceDisplays && parsePriceDisplay(priceRaw ?? "") == null) continue;
    const c = (raw ?? "").trim();
    if (c === "Wash & Fold") out.add("washAndFold");
    if (c === "Dry Cleaning") out.add("dryCleaning");
    if (c === "Tailoring") out.add("tailoring");
  }
  return Array.from(out);
}
