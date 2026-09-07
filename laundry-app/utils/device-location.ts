import type { Coordinates } from "@/utils/geocoding";

export type DeviceLocationStatus = "granted" | "denied" | "unavailable";

export type DeviceLocationResult = {
  coords: Coordinates | null;
  status: DeviceLocationStatus;
};

/** City center — used when the iOS Simulator snaps back to Apple's San Francisco default. */
export const LAHORE_CITY: Coordinates = {
  latitude: 31.5204,
  longitude: 74.3587,
};

let locationPromptSettled = false;
let resolveLocationPromptSettled: (() => void) | null = null;
const locationPromptSettledPromise = new Promise<void>((resolve) => {
  resolveLocationPromptSettled = resolve;
});

function markLocationPromptSettled(): void {
  if (locationPromptSettled) return;
  locationPromptSettled = true;
  resolveLocationPromptSettled?.();
}

/**
 * Resolves once the device location permission flow has been requested and
 * answered (or immediately, if it was never in a pending state to begin with).
 * Other permission prompts (e.g. push notifications) await this so iOS doesn't
 * stack system dialogs back-to-back with no context between them. Falls back
 * to `timeoutMs` when location permission is never requested on this screen.
 */
export function waitForLocationPromptSettled(timeoutMs = 4000): Promise<void> {
  if (locationPromptSettled) return Promise.resolve();
  return Promise.race([
    locationPromptSettledPromise,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

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

/** Apple Park / San Francisco — the Simulator resets here on rebuild and reboot. */
function isAppleSimulatorDefault(coords: Coordinates): boolean {
  return (
    coords.latitude >= 37.0 &&
    coords.latitude <= 38.3 &&
    coords.longitude >= -122.8 &&
    coords.longitude <= -121.4
  );
}

function resolveCoords(coords: Coordinates | null): Coordinates | null {
  if (!coords) return null;
  if (__DEV__ && isAppleSimulatorDefault(coords)) return LAHORE_CITY;
  return coords;
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
      markLocationPromptSettled();
      return { coords: null, status: "unavailable" };
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    markLocationPromptSettled();
    if (permission.status !== "granted") {
      return { coords: null, status: "denied" };
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const currentCoords = resolveCoords(toCoordinates(current));
    if (currentCoords) return { coords: currentCoords, status: "granted" };

    const lastKnown = await Location.getLastKnownPositionAsync();
    const lastKnownCoords = resolveCoords(toCoordinates(lastKnown));
    if (lastKnownCoords) return { coords: lastKnownCoords, status: "granted" };
    return { coords: null, status: "unavailable" };
  } catch {
    markLocationPromptSettled();
    return { coords: null, status: "unavailable" };
  }
}
