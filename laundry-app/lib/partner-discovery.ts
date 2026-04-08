import type { LaundererServiceType } from "@/constants/launderers";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PartnerPublicRow = {
  id: string;
  business_name: string;
  phone_number: string | null;
  available_time: string | null;
  address: string | null;
  image_url: string | null;
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
      "id, business_name, phone_number, available_time, address, image_url, updated_at"
    )
    .eq("pickup_delivery_enabled", true)
    .order("business_name", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []).filter(
    (r) => typeof r.business_name === "string" && r.business_name.trim().length > 0
  ) as PartnerPublicRow[];
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
      "id, business_name, business_description, phone_number, available_time, address, image_url, updated_at, pickup_delivery_enabled, pickup_delivery_amount"
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
  categories: (string | null | undefined)[]
): LaundererServiceType[] {
  const out = new Set<LaundererServiceType>();
  for (const raw of categories) {
    const c = (raw ?? "").trim();
    if (c === "Wash & Fold") out.add("washAndFold");
    if (c === "Dry Cleaning") out.add("dryCleaning");
    if (c === "Tailoring") out.add("tailoring");
  }
  return Array.from(out);
}
