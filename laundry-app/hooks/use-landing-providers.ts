import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchMapPartners,
  type PartnerMapMarkerRow,
} from "@/lib/partner-discovery";
import { getPartnerPrimaryImage } from "@/hooks/use-customer-home-map-data";
import { getDeviceCoordinates, LAHORE_CITY } from "@/utils/device-location";
import type { Coordinates } from "@/utils/geocoding";
import type { LaundererServiceType } from "@/constants/launderers";

export type LandingProvider = PartnerMapMarkerRow & {
  distanceKm: number | null;
  imageUrl: string | null;
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceKmBetween(from: Coordinates, to: Coordinates): number {
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;
  const cAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * cAngle;
}

export function formatLandingDistance(distanceKm: number | null): string {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return "—";
  if (distanceKm < 1) {
    const meters = Math.max(100, Math.round(distanceKm * 1000));
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function serviceTypeLabel(type: LaundererServiceType): string {
  switch (type) {
    case "washAndFold":
      return "Laundry";
    case "dryCleaning":
      return "Dry Cleaning";
    case "tailoring":
      return "Tailoring";
    case "press":
      return "Ironing";
    default:
      return "Service";
  }
}

export type LandingSearchFilters = {
  query: string;
  service?: LaundererServiceType | "alterations" | null;
};

function matchesService(
  partner: PartnerMapMarkerRow,
  service: LandingSearchFilters["service"],
): boolean {
  if (!service) return true;
  if (service === "alterations") {
    return partner.serviceTypes.includes("tailoring");
  }
  return partner.serviceTypes.includes(service);
}

function matchesQuery(partner: PartnerMapMarkerRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (partner.business_name ?? "").trim().toLowerCase();
  // Prefix match: typing "i" shows providers whose business name starts with "i".
  return name.startsWith(q);
}

function withDistances(
  rows: PartnerMapMarkerRow[],
  origin: Coordinates,
): LandingProvider[] {
  const enriched: LandingProvider[] = rows.map((partner) => {
    const hasCoords =
      Number.isFinite(partner.latitude) && Number.isFinite(partner.longitude);
    const distanceKm = hasCoords
      ? distanceKmBetween(origin, {
          latitude: Number(partner.latitude),
          longitude: Number(partner.longitude),
        })
      : null;
    return {
      ...partner,
      distanceKm,
      imageUrl: getPartnerPrimaryImage(partner),
    };
  });

  enriched.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return enriched;
}

async function resolveOriginWithTimeout(timeoutMs = 2500): Promise<Coordinates> {
  try {
    const coords = await Promise.race([
      getDeviceCoordinates(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return coords ?? LAHORE_CITY;
  } catch {
    return LAHORE_CITY;
  }
}

export function useLandingProviders(filters: LandingSearchFilters) {
  const [partners, setPartners] = useState<LandingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState<Coordinates>(LAHORE_CITY);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Don't block the listing on browser geolocation — it can hang on the
    // permission prompt. Fetch partners immediately with Lahore as default.
    const result = await fetchMapPartners();
    if (result.error) {
      setError(result.error);
      setPartners([]);
      setLoading(false);
      return;
    }

    const rows = result.data ?? [];
    setPartners(withDistances(rows, LAHORE_CITY));
    setLoading(false);

    const resolved = await resolveOriginWithTimeout();
    setOrigin(resolved);
    if (
      resolved.latitude !== LAHORE_CITY.latitude ||
      resolved.longitude !== LAHORE_CITY.longitude
    ) {
      setPartners(withDistances(rows, resolved));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return partners.filter(
      (partner) =>
        matchesQuery(partner, filters.query) && matchesService(partner, filters.service),
    );
  }, [partners, filters.query, filters.service]);

  const nearby = useMemo(() => filtered, [filtered]);

  const recommended = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ratingA = a.ratingAvg ?? 0;
      const ratingB = b.ratingAvg ?? 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
    });
  }, [filtered]);

  return {
    loading,
    error,
    origin,
    all: partners,
    filtered,
    nearby,
    recommended,
    reload: load,
  };
}
