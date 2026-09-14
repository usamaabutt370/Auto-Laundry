import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@laundry_saved_provider_ids";

async function readIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export async function isProviderSaved(partnerId: string): Promise<boolean> {
  if (!partnerId) return false;
  const ids = await readIds();
  return ids.includes(partnerId);
}

export async function toggleSavedProvider(partnerId: string): Promise<boolean> {
  if (!partnerId) return false;
  const ids = await readIds();
  const exists = ids.includes(partnerId);
  const next = exists ? ids.filter((id) => id !== partnerId) : [...ids, partnerId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return !exists;
}
