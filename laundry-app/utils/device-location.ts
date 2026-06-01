import type { Coordinates } from "@/utils/geocoding";

export type DeviceLocationStatus = "granted" | "denied" | "unavailable";

export type DeviceLocationResult = {
  coords: Coordinates | null;
  status: DeviceLocationStatus;
};

function toCoordinates(
  location: { coords?: { latitude?: number; longitude?: number }; latitude?: number; longitude?: number } | null | undefined,
): Coordinates | null {
  const coords =
    location && "coords" in location
      ? location.coords
      : (location as { latitude?: number; longitude?: number } | null | undefined);
  const latitude = Number(coords?.latitude);
  const longitude = Number(coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/**
 * Requests foreground location permission and returns device coordinates when available.
 * Returns null when permission is denied or location cannot be resolved.
 */
export async function getDeviceCoordinates(): Promise<Coordinates | null> {
  const result = await getDeviceCoordinatesWithStatus();
  return result.coords;
}

/**
 * Requests foreground location permission and returns both coordinates and status.
 */
export async function getDeviceCoordinatesWithStatus(): Promise<DeviceLocationResult> {
  try {
    // Use runtime require so missing native linkage does not crash app startup.
    let Location: typeof import("expo-location");
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Location = require("expo-location");
    } catch {
      return { coords: null, status: "unavailable" };
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return { coords: null, status: "denied" };
    }

    const lastKnown = await Location.getLastKnownPositionAsync();
    const lastKnownCoords = toCoordinates(lastKnown);
    if (lastKnownCoords) return { coords: lastKnownCoords, status: "granted" };

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const currentCoords = toCoordinates(current);
    if (currentCoords) return { coords: currentCoords, status: "granted" };
    return { coords: null, status: "unavailable" };
  } catch {
    return { coords: null, status: "unavailable" };
  }
}
