import { fetchPartnerRiders } from "@/lib/partner-riders";
import { supabase } from "@/lib/supabase";

export type PickupRiderValidationResult =
  | { ok: true }
  | { ok: false; reason: "no_riders" | "no_responsibility" };

export async function fetchPartnerPickupDeliveryEnabled(userId: string): Promise<boolean> {
  if (!supabase || !userId) return false;

  const { data, error } = await supabase
    .from("partner_profiles")
    .select("pickup_delivery_enabled")
    .eq("id", userId)
    .maybeSingle<{ pickup_delivery_enabled: boolean | null }>();

  if (error) {
    console.warn("[partner-pickup-rider-requirements] profile lookup failed:", error.message);
    return false;
  }

  return Boolean(data?.pickup_delivery_enabled);
}

export async function validatePickupRiderRequirements(
  userId: string,
  pickupEnabled: boolean,
): Promise<PickupRiderValidationResult> {
  if (!pickupEnabled) return { ok: true };
  if (!supabase) return { ok: false, reason: "no_riders" };

  const existingRiders = await fetchPartnerRiders(userId);
  const validRiders = existingRiders.filter(
    (rider) =>
      rider.name.trim().length > 0 &&
      rider.phone.trim().length > 0 &&
      rider.photoUrl.trim().length > 0,
  );

  if (validRiders.length === 0) {
    return { ok: false, reason: "no_riders" };
  }

  const { data: partnerProfile, error } = await supabase
    .from("partner_profiles")
    .select("riders_responsibility_accepted_at")
    .eq("id", userId)
    .maybeSingle<{ riders_responsibility_accepted_at: string | null }>();

  if (error) {
    console.warn("[partner-pickup-rider-requirements] responsibility lookup failed:", error.message);
    return { ok: false, reason: "no_responsibility" };
  }

  if (!partnerProfile?.riders_responsibility_accepted_at) {
    return { ok: false, reason: "no_responsibility" };
  }

  return { ok: true };
}
