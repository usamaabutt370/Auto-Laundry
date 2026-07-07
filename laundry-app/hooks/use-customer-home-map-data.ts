import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchPartnersByFulfillmentMode, type PartnerPublicRow } from "@/lib/partner-discovery";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { getDeviceCoordinates } from "@/utils/device-location";
import { getCoordinatesWithFallback, type Coordinates } from "@/utils/geocoding";

export const LAHORE_REGION = {
  latitude: 31.365,
  longitude: 74.2143,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

export type PartnerMapMarker = PartnerPublicRow & {
  fulfillmentMode: "dropoff" | "pickupDelivery";
};

export type CustomerMapMarker = {
  id: string;
  name: string;
  mode: "dropoff" | "pickupDelivery";
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  initial: string;
};

type GroupedMarker = {
  partner: PartnerMapMarker;
  coords: Coordinates;
};

export function formatPartnerUpdatedAt(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getPartnerPrimaryImage(partner: PartnerMapMarker | null): string | null {
  if (!partner) return null;
  const businessImage = partner.business_images?.find(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  if (businessImage) return businessImage.trim();
  return avatarUrlWithCacheBuster(partner.image_url, partner.updated_at);
}

export function useCustomerHomeMapData() {
  const geocodeCacheRef = useRef<Map<string, Coordinates | null>>(new Map());
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [partners, setPartners] = useState<PartnerMapMarker[]>([]);
  const [partnerCoordinates, setPartnerCoordinates] = useState<Record<string, Coordinates | null>>(
    {},
  );
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setLoadingPartners(true);
    const [dropoffResult, pickupResult] = await Promise.all([
      fetchPartnersByFulfillmentMode("dropoff"),
      fetchPartnersByFulfillmentMode("pickupDelivery"),
    ]);
    const merged = new Map<string, PartnerMapMarker>();
    for (const partner of dropoffResult.data ?? []) {
      merged.set(partner.id, { ...partner, fulfillmentMode: "dropoff" });
    }
    for (const partner of pickupResult.data ?? []) {
      merged.set(partner.id, { ...partner, fulfillmentMode: "pickupDelivery" });
    }
    setPartners(Array.from(merged.values()));
    setLoadingPartners(false);
  }, []);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const coords = await getDeviceCoordinates();
      if (cancelled) return;
      setUserCoordinates(coords);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unresolvedAddresses = Array.from(
      new Set(
        partners
          .filter(
            (partner) => !Number.isFinite(partner.latitude) || !Number.isFinite(partner.longitude),
          )
          .map((partner) => partner.address?.trim() ?? "")
          .filter((address) => address.length > 0),
      ),
    ).filter((address) => !geocodeCacheRef.current.has(address));

    if (unresolvedAddresses.length === 0) {
      const next: Record<string, Coordinates | null> = {};
      for (const partner of partners) {
        if (Number.isFinite(partner.latitude) && Number.isFinite(partner.longitude)) {
          next[partner.id] = {
            latitude: Number(partner.latitude),
            longitude: Number(partner.longitude),
          };
          continue;
        }
        const address = partner.address?.trim() ?? "";
        next[partner.id] = address ? geocodeCacheRef.current.get(address) ?? null : null;
      }
      setPartnerCoordinates(next);
      return;
    }

    void (async () => {
      const resolved = await Promise.all(
        unresolvedAddresses.map(async (address) => ({
          address,
          coords: await getCoordinatesWithFallback(address),
        })),
      );
      if (cancelled) return;
      for (const item of resolved) {
        geocodeCacheRef.current.set(item.address, item.coords);
      }
      const next: Record<string, Coordinates | null> = {};
      for (const partner of partners) {
        if (Number.isFinite(partner.latitude) && Number.isFinite(partner.longitude)) {
          next[partner.id] = {
            latitude: Number(partner.latitude),
            longitude: Number(partner.longitude),
          };
          continue;
        }
        const address = partner.address?.trim() ?? "";
        next[partner.id] = address ? geocodeCacheRef.current.get(address) ?? null : null;
      }
      setPartnerCoordinates(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [partners]);

  const markerById = useMemo(() => {
    const map = new Map<string, PartnerMapMarker>();
    for (const partner of partners) {
      map.set(partner.id, partner);
    }
    return map;
  }, [partners]);

  const mapMarkers = useMemo<CustomerMapMarker[]>(() => {
    const markers = partners
      .map((partner) => ({ partner, coords: partnerCoordinates[partner.id] }))
      .filter((item): item is { partner: PartnerMapMarker; coords: Coordinates } =>
        Boolean(item.coords),
      );

    const groups = new Map<string, GroupedMarker[]>();
    for (const item of markers) {
      const key = `${item.coords.latitude.toFixed(6)},${item.coords.longitude.toFixed(6)}`;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }

    const out: CustomerMapMarker[] = [];
    for (const grouped of groups.values()) {
      const count = grouped.length;
      for (let i = 0; i < count; i += 1) {
        const { partner, coords } = grouped[i];
        if (count === 1) {
          out.push({
            id: partner.id,
            name: partner.business_name.trim(),
            mode: partner.fulfillmentMode,
            latitude: coords.latitude,
            longitude: coords.longitude,
            imageUrl: getPartnerPrimaryImage(partner),
            initial: partner.business_name.trim().charAt(0).toUpperCase() || "P",
          });
          continue;
        }

        const angle = (2 * Math.PI * i) / count;
        const radiusDegrees = 0.00018;
        out.push({
          id: partner.id,
          name: partner.business_name.trim(),
          mode: partner.fulfillmentMode,
          latitude: coords.latitude + Math.sin(angle) * radiusDegrees,
          longitude: coords.longitude + Math.cos(angle) * radiusDegrees,
          imageUrl: getPartnerPrimaryImage(partner),
          initial: partner.business_name.trim().charAt(0).toUpperCase() || "P",
        });
      }
    }
    return out;
  }, [partnerCoordinates, partners]);

  const selectedPartner = selectedPartnerId ? markerById.get(selectedPartnerId) ?? null : null;

  return {
    userCoordinates,
    loadingPartners,
    mapMarkers,
    markerById,
    selectedPartnerId,
    setSelectedPartnerId,
    selectedPartner,
    selectedPartnerUpdatedLabel: selectedPartner
      ? formatPartnerUpdatedAt(selectedPartner.updated_at)
      : null,
    selectedPartnerPrimaryImage: getPartnerPrimaryImage(selectedPartner),
  };
}

export type CustomerHomeMapData = ReturnType<typeof useCustomerHomeMapData>;
