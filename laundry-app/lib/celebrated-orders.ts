import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "@laundry_celebrated_orders";
const MAX_IDS = 200;
/** Older completions are history, not news — don't celebrate them. */
const CELEBRATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const sessionCelebrated = new Set<string>();

function storageKey(userId: string) {
  return `${KEY_PREFIX}:${userId}`;
}

export function isRecentlyCompleted(updatedAt: string | null | undefined, now = Date.now()) {
  if (!updatedAt) return false;
  const time = new Date(updatedAt).getTime();
  return Number.isFinite(time) && now - time <= CELEBRATION_WINDOW_MS;
}

export async function getCelebratedOrderIds(userId: string): Promise<Set<string>> {
  const ids = new Set(sessionCelebrated);
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (typeof id === "string" && id) ids.add(id);
      }
    }
  } catch {
    /* fall back to session-only ids */
  }
  return ids;
}

export async function markOrdersCelebrated(userId: string, orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return;
  orderIds.forEach((id) => sessionCelebrated.add(id));
  const existing = await getCelebratedOrderIds(userId);
  const next = [...orderIds, ...[...existing].filter((id) => !orderIds.includes(id))].slice(
    0,
    MAX_IDS,
  );
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    /* ignore persistence errors */
  }
}
