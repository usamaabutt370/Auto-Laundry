export type Coordinates = {
  latitude: number;
  longitude: number;
};

function parseCoordinates(
  results: { lat?: string; lon?: string }[] | null | undefined
): Coordinates | null {
  const firstResult = results?.[0];
  const latitude = Number(firstResult?.lat);
  const longitude = Number(firstResult?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

async function geocodeFromNominatimQuery(query: string): Promise<Coordinates | null> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=jsonv2&limit=1&addressdetails=0&accept-language=en&q=${encodeURIComponent(query)}`;
  // Note: React Native fetch can reject forbidden headers like User-Agent.
  const response = await fetch(url);
  if (!response.ok) return null;
  const results = (await response.json()) as { lat?: string; lon?: string }[];
  return parseCoordinates(results);
}

export async function getCoordinatesFromOpenStreetMap(
  address: string
): Promise<Coordinates | null> {
  const trimmedAddress = address.trim();
  if (!trimmedAddress) return null;
  try {
    const candidates = Array.from(
      new Set(
        [
          trimmedAddress,
          `${trimmedAddress}, Pakistan`,
          trimmedAddress.replace(/\s+/g, " "),
        ].map((value) => value.trim()).filter((value) => value.length > 0),
      ),
    );
    for (const candidate of candidates) {
      const coords = await geocodeFromNominatimQuery(candidate);
      if (coords) return coords;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCoordinatesWithFallback(
  address: string
): Promise<Coordinates | null> {
  return getCoordinatesFromOpenStreetMap(address);
}

/** Reverse-geocode a short "City, Country" label for the home header. */
export async function getPlaceLabelFromCoordinates(
  coords: Coordinates,
): Promise<string | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse" +
      `?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}` +
      "&zoom=10&addressdetails=1&accept-language=en";
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };
    const address = data.address ?? {};
    const city =
      address.city || address.town || address.village || address.county || address.state;
    const country = address.country;
    if (city && country) return `${city}, ${country}`;
    return city || country || null;
  } catch {
    return null;
  }
}
