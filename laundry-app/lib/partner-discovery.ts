import type { LaundererServiceType } from "@/constants/launderers";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fetchVerifiedPartnerIds } from "@/lib/partner-verification";
import { parsePriceDisplay } from "@/utils/parse-price-display";
import { bestOfferForCategories } from "@/utils/partner-offers";

export type PartnerFulfillmentMode = "dropoff" | "pickupDelivery";

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
  ratingAvg: number | null;
  ratingCount: number;
  offerPercent: number | null;
  offerCode: string | null;
  serviceTypes: LaundererServiceType[];
  minPrice: number | null;
  verified: boolean;
  fulfillmentMode?: PartnerFulfillmentMode;
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
    ratingAvg: row.ratingAvg ?? null,
    ratingCount: row.ratingCount ?? 0,
    offerPercent: row.offerPercent ?? null,
    offerCode: row.offerCode ?? null,
    serviceTypes: row.serviceTypes ?? [],
    minPrice: row.minPrice ?? null,
    verified: row.verified ?? false,
    fulfillmentMode: amount.length > 0 ? "pickupDelivery" : "dropoff",
  };
}

function withDiscoveryDefaults<T extends PartnerPublicRow>(row: T): T {
  return {
    ...row,
    ratingAvg: row.ratingAvg ?? null,
    ratingCount: row.ratingCount ?? 0,
    offerPercent: row.offerPercent ?? null,
    offerCode: row.offerCode ?? null,
    serviceTypes: row.serviceTypes ?? [],
    minPrice: row.minPrice ?? null,
    verified: row.verified ?? false,
  };
}

async function attachDiscoveryExtras<T extends PartnerPublicRow>(rows: T[]): Promise<T[]> {
  if (!supabase || rows.length === 0) {
    return rows.map((row) => withDiscoveryDefaults(row));
  }
  const ids = rows.map((row) => row.id);
  const [ratingsResult, servicesResult, verifiedIds] = await Promise.all([
    supabase.rpc("partner_rating_stats", { partner_ids: ids }),
    supabase.from("partner_services").select("user_id, category, price_display").in("user_id", ids),
    fetchVerifiedPartnerIds(ids),
  ]);

  const ratingById = new Map<string, { avg: number; count: number }>();
  for (const row of (ratingsResult.data ?? []) as Array<{
    partner_id?: string;
    avg_rating?: number | string;
    review_count?: number;
  }>) {
    if (!row.partner_id) continue;
    ratingById.set(row.partner_id, {
      avg: Number(row.avg_rating),
      count: Number(row.review_count) || 0,
    });
  }

  const categoriesById = new Map<string, string[]>();
  const pricesById = new Map<string, string[]>();
  for (const row of (servicesResult.data ?? []) as Array<{
    user_id?: string;
    category?: string | null;
    price_display?: string | null;
  }>) {
    if (!row.user_id) continue;
    const categories = categoriesById.get(row.user_id) ?? [];
    const prices = pricesById.get(row.user_id) ?? [];
    categories.push(row.category ?? "");
    prices.push(row.price_display ?? "");
    categoriesById.set(row.user_id, categories);
    pricesById.set(row.user_id, prices);
  }

  return rows.map((row) => {
    const rating = ratingById.get(row.id);
    const reviewCount = rating?.count ?? 0;
    const reviewAvg = rating && Number.isFinite(rating.avg) ? rating.avg : null;
    const categories = categoriesById.get(row.id) ?? [];
    const offer = bestOfferForCategories(categories);
    return {
      ...row,
      ratingAvg: reviewCount > 0 && reviewAvg != null ? reviewAvg : 1,
      ratingCount: reviewCount > 0 ? reviewCount : 1,
      offerPercent: offer?.percent ?? null,
      offerCode: offer?.code ?? null,
      serviceTypes: serviceCategoriesToTypes(categories, pricesById.get(row.id)),
      minPrice: minPricedService(categories, pricesById.get(row.id) ?? []),
      verified: verifiedIds.size === 0 ? true : verifiedIds.has(row.id),
    };
  });
}

function minPricedService(categories: string[], prices: string[]): number | null {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < prices.length; i++) {
    if ((categories[i] ?? "").trim() === "Pickup & Delivery") continue;
    const amount = parsePriceDisplay(prices[i] ?? "");
    if (amount == null || amount <= 0) continue;
    if (amount < min) min = amount;
  }
  return Number.isFinite(min) ? min : null;
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

  return { data: await attachDiscoveryExtras(rows), error: null };
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
  const rows = (data ?? [])
    .filter((r) => typeof r.business_name === "string" && r.business_name.trim().length > 0)
    .map((r) => withDiscoveryDefaults(r as unknown as PartnerPublicRow));
  return { data: await attachDiscoveryExtras(rows), error: null };
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
  const rows = (data ?? [])
    .filter((r) => {
      if (typeof r.business_name !== "string" || r.business_name.trim().length === 0) {
        return false;
      }
      const amount = typeof r.pickup_delivery_amount === "string" ? r.pickup_delivery_amount.trim() : "";
      return mode === "pickupDelivery" ? amount.length > 0 : amount.length === 0;
    })
    .map((r) => withDiscoveryDefaults(r as unknown as PartnerPublicRow));
  return { data: await attachDiscoveryExtras(rows), error: null };
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

  const [enriched] = await attachDiscoveryExtras([
    withDiscoveryDefaults(profile as PartnerPublicRow),
  ]);
  const offer = bestOfferForCategories((serviceRows ?? []).map((row) => row.category));

  return {
    profile: {
      ...(profile as PartnerDetailRow),
      ratingAvg: enriched?.ratingAvg ?? null,
      ratingCount: enriched?.ratingCount ?? 0,
      offerPercent: offer?.percent ?? enriched?.offerPercent ?? null,
      offerCode: offer?.code ?? enriched?.offerCode ?? null,
      minPrice: enriched?.minPrice ?? null,
      verified: enriched?.verified ?? false,
    },
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
    if (c === "Press") out.add("press");
  }
  return Array.from(out);
}
