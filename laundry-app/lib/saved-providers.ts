import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";

type FavouriteRow = { partner_id: string };

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const {
    data: { session },
  } = await getSession();
  return session?.user?.id ?? null;
}

export async function getSavedProviderIds(): Promise<string[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("customer_favourite_providers")
    .select("partner_id")
    .eq("customer_id", userId);

  if (error || !data) return [];
  return (data as FavouriteRow[])
    .map((row) => row.partner_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function getSavedProviderMap(): Promise<Record<string, boolean>> {
  const ids = await getSavedProviderIds();
  const map: Record<string, boolean> = {};
  for (const id of ids) map[id] = true;
  return map;
}

export async function isProviderSaved(partnerId: string): Promise<boolean> {
  if (!partnerId) return false;
  const userId = await currentUserId();
  if (!userId) return false;

  const { data, error } = await supabase
    .from("customer_favourite_providers")
    .select("partner_id")
    .eq("customer_id", userId)
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

/** Returns true when the provider is favourited after the toggle. */
export async function toggleSavedProvider(partnerId: string): Promise<boolean> {
  if (!partnerId) return false;
  const userId = await currentUserId();
  if (!userId) return false;

  const currentlySaved = await isProviderSaved(partnerId);

  if (currentlySaved) {
    const { error } = await supabase
      .from("customer_favourite_providers")
      .delete()
      .eq("customer_id", userId)
      .eq("partner_id", partnerId);
    if (error) return true;
    return false;
  }

  const { error } = await supabase.from("customer_favourite_providers").insert({
    customer_id: userId,
    partner_id: partnerId,
  });
  if (error) {
    // Unique race: treat as favourited.
    if (error.code === "23505") return true;
    return false;
  }
  return true;
}
