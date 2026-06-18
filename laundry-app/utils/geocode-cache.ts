import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Coordinates } from "@/utils/geocoding";

const STORAGE_KEY = "geocode_cache_v1";

type CacheRecord = Record<string, Coordinates | null>;

export function normalizeGeocodeAddress(address: string): string {
  return address.trim().replace(/\s+/g, " ");
}

export async function loadGeocodeCache(): Promise<Map<string, Coordinates | null>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as CacheRecord;
    const map = new Map<string, Coordinates | null>();
    for (const [address, coords] of Object.entries(parsed)) {
      const key = normalizeGeocodeAddress(address);
      if (!key) continue;
      if (coords == null) {
        map.set(key, null);
        continue;
      }
      const latitude = Number(coords.latitude);
      const longitude = Number(coords.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        map.set(key, null);
        continue;
      }
      map.set(key, { latitude, longitude });
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function persistGeocodeCache(cache: Map<string, Coordinates | null>): Promise<void> {
  const record: CacheRecord = {};
  for (const [address, coords] of cache.entries()) {
    record[address] = coords;
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Best-effort persistence; in-memory cache still helps for this session.
  }
}

export async function persistGeocodeEntry(
  address: string,
  coords: Coordinates | null,
  cache: Map<string, Coordinates | null>,
): Promise<void> {
  const key = normalizeGeocodeAddress(address);
  if (!key) return;
  cache.set(key, coords);
  await persistGeocodeCache(cache);
}
