import { supabase } from "@/lib/supabase";

export async function fetchVerifiedPartnerIds(
  partnerIds: string[],
): Promise<Set<string>> {
  if (!supabase || partnerIds.length === 0) return new Set();

  const uniqueIds = Array.from(new Set(partnerIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("partner_onboarding_requests")
    .select("user_id")
    .in("user_id", uniqueIds)
    .eq("status", "approved");

  if (error) {
    console.warn("[partner-verification] fetch failed:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.user_id as string));
}

export async function isPartnerVerified(partnerId: string): Promise<boolean> {
  if (!partnerId) return false;
  const verified = await fetchVerifiedPartnerIds([partnerId]);
  return verified.has(partnerId);
}
