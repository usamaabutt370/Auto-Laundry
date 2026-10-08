import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_KEY = "@laundry_recent_provider_visits";
/** Keep at most 5; visiting a 6th drops the oldest. */
const MAX_RECENT = 5;
const HOME_RECENT_VISIBLE = 5;

export type RecentProviderVisit = {
  partnerId: string;
  visitedAt: string;
  fulfillmentMode?: "dropoff" | "pickupDelivery";
};

export { HOME_RECENT_VISIBLE };

export async function getRecentProviderVisits(): Promise<RecentProviderVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const visits: RecentProviderVisit[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<RecentProviderVisit>;
      if (typeof row.partnerId !== "string" || !row.partnerId.trim()) continue;
      const mode =
        row.fulfillmentMode === "pickupDelivery" || row.fulfillmentMode === "dropoff"
          ? row.fulfillmentMode
          : undefined;
      visits.push({
        partnerId: row.partnerId.trim(),
        visitedAt:
          typeof row.visitedAt === "string" && row.visitedAt
            ? row.visitedAt
            : new Date(0).toISOString(),
        fulfillmentMode: mode,
      });
    }
    return visits.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export async function recordRecentProviderVisit(
  partnerId: string,
  fulfillmentMode?: "dropoff" | "pickupDelivery",
): Promise<void> {
  const id = partnerId.trim();
  if (!id) return;

  const existing = await getRecentProviderVisits();
  const next: RecentProviderVisit[] = [
    {
      partnerId: id,
      visitedAt: new Date().toISOString(),
      fulfillmentMode,
    },
    ...existing.filter((item) => item.partnerId !== id),
  ].slice(0, MAX_RECENT);

  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore persistence errors */
  }
}

export async function getRecentProviderIds(): Promise<string[]> {
  const visits = await getRecentProviderVisits();
  return visits.map((item) => item.partnerId);
}

export async function removeRecentProviderVisit(partnerId: string): Promise<void> {
  const id = partnerId.trim();
  if (!id) return;

  const existing = await getRecentProviderVisits();
  const next = existing.filter((item) => item.partnerId !== id);
  if (next.length === existing.length) return;

  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore persistence errors */
  }
}
