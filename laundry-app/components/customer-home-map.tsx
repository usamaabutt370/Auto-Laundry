import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { fetchPartnersByFulfillmentMode, type PartnerPublicRow } from "@/lib/partner-discovery";
import { getCoordinatesWithFallback, type Coordinates } from "@/utils/geocoding";

const c = theme.colors;
const DEFAULT_USER_COORDINATES: Coordinates = {
  latitude: 31.365,
  longitude: 74.2143,
};
const DEFAULT_ZOOM = 11;

type PartnerMapMarker = PartnerPublicRow & {
  fulfillmentMode: "dropoff" | "pickupDelivery";
};

type WebMapMarker = {
  id: string;
  name: string;
  mode: "dropoff" | "pickupDelivery";
  latitude: number;
  longitude: number;
};

type HomeStrings = {
  dropOff: string;
  pickUpDelivery: string;
};

type Props = {
  strings: HomeStrings;
  onMenuPress: () => void;
  onPartnerPress: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
  recenterBottomOffset: number;
};

export function CustomerHomeMap({
  strings,
  onMenuPress,
  onPartnerPress,
  recenterBottomOffset,
}: Props) {
  const mapRef = useRef<WebView | null>(null);
  const geocodeCacheRef = useRef<Map<string, Coordinates | null>>(new Map());
  const [userCoordinates] = useState<Coordinates | null>(DEFAULT_USER_COORDINATES);
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
    const unresolvedAddresses = Array.from(
      new Set(
        partners
          .filter((partner) => !Number.isFinite(partner.latitude) || !Number.isFinite(partner.longitude))
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

  const markers = useMemo(
    () =>
      partners
        .map((partner) => ({ partner, coords: partnerCoordinates[partner.id] }))
        .filter((item): item is { partner: PartnerMapMarker; coords: Coordinates } => Boolean(item.coords)),
    [partnerCoordinates, partners],
  );
  const markerById = useMemo(() => {
    const map = new Map<string, PartnerMapMarker>();
    for (const partner of partners) {
      map.set(partner.id, partner);
    }
    return map;
  }, [partners]);
  const selectedPartner = selectedPartnerId ? markerById.get(selectedPartnerId) ?? null : null;

  const mapMarkers = useMemo<WebMapMarker[]>(
    () =>
      markers.map(({ partner, coords }) => ({
        id: partner.id,
        name: partner.business_name.trim(),
        mode: partner.fulfillmentMode,
        latitude: coords.latitude,
        longitude: coords.longitude,
      })),
    [markers],
  );

  const mapHtml = useMemo(() => {
    const markersJson = JSON.stringify(mapMarkers);
    const userJson = JSON.stringify(userCoordinates);
    const dropOffLabel = JSON.stringify(strings.dropOff);
    const pickupLabel = JSON.stringify(strings.pickUpDelivery);
    const zoomControlBottomOffset = Math.max(16, recenterBottomOffset + 52);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
    .marker-pin { width: 12px; height: 12px; border-radius: 6px; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.2); }
    .leaflet-right { right: 8px; }
    .leaflet-bottom { bottom: ${zoomControlBottomOffset}px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const defaultCenter = [31.365, 74.2143];
    map.setView(defaultCenter, ${DEFAULT_ZOOM});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markers = ${markersJson};
    const user = ${userJson};
    const allPoints = [];
    const bounds = [];

    function colorForMode(mode) {
      return mode === 'pickupDelivery' ? '#14B8A6' : '#F97316';
    }

    function labelForMode(mode) {
      return mode === 'pickupDelivery' ? ${pickupLabel} : ${dropOffLabel};
    }

    if (user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude)) {
      const userMarker = L.circleMarker([user.latitude, user.longitude], {
        radius: 8,
        color: '#0B84FF',
        fillColor: '#0B84FF',
        fillOpacity: 0.95,
      }).addTo(map);
      userMarker.bindPopup('Your location');
      bounds.push([user.latitude, user.longitude]);
      allPoints.push([user.latitude, user.longitude]);
    }

    markers.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'marker-pin';
      div.style.background = colorForMode(item.mode);
      const icon = L.divIcon({ html: div.outerHTML, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
      const m = L.marker([item.latitude, item.longitude], { icon }).addTo(map);
      m.bindPopup(item.name + ' (' + labelForMode(item.mode) + ')');
      m.on('click', () => {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'partner-press',
          partnerId: item.id,
          mode: item.mode
        }));
      });
      bounds.push([item.latitude, item.longitude]);
      allPoints.push([item.latitude, item.longitude]);
    });

    function fitAll() {
      if (bounds.length === 0) {
        map.setView(defaultCenter, ${DEFAULT_ZOOM});
        return;
      }
      if (bounds.length === 1) {
        map.setView(bounds[0], 14);
        return;
      }
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    window.__fitAll = fitAll;
    fitAll();
  </script>
</body>
</html>`;
  }, [mapMarkers, recenterBottomOffset, strings.dropOff, strings.pickUpDelivery, userCoordinates]);

  const focusMap = useCallback(() => {
    mapRef.current?.injectJavaScript("window.__fitAll && window.__fitAll(); true;");
  }, []);

  useEffect(() => {
    focusMap();
  }, [focusMap]);

  return (
    <>
      <WebView
        ref={mapRef}
        style={styles.mapArea}
        source={{ html: mapHtml }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              partnerId?: string;
              mode?: "dropoff" | "pickupDelivery";
            };
            if (
              payload.type === "partner-press" &&
              typeof payload.partnerId === "string" &&
              (payload.mode === "dropoff" || payload.mode === "pickupDelivery")
            ) {
              setSelectedPartnerId(payload.partnerId);
            }
          } catch {
            // Ignore malformed webview messages.
          }
        }}
      />

      {loadingPartners ? (
        <View style={styles.mapLoading}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      ) : null}

      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={onMenuPress}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Menu"
        >
          <MaterialCommunityIcons name="menu" size={22} color={c.white} />
        </Pressable>
      </SafeAreaView>

      <Pressable
        onPress={focusMap}
        style={({ pressed }) => [
          styles.recenterBtn,
          { bottom: recenterBottomOffset },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={20} color={c.background} />
      </Pressable>

      {selectedPartner ? (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View
            style={[
              styles.partnerSheetWrap,
              { bottom: Math.max(12, recenterBottomOffset - 58) },
            ]}
          >
            <View style={styles.partnerSheet}>
              <View style={styles.partnerSheetTop}>
                <View style={styles.partnerInfoWrap}>
                  <Text style={styles.partnerSheetTitle}>{selectedPartner.business_name.trim()}</Text>
                  <Text style={styles.partnerSheetSubtitle}>
                    {selectedPartner.fulfillmentMode === "pickupDelivery"
                      ? strings.pickUpDelivery
                      : strings.dropOff}
                  </Text>
                  {selectedPartner.phone_number?.trim() ? (
                    <Text style={styles.partnerSheetMeta}>{selectedPartner.phone_number.trim()}</Text>
                  ) : null}
                  {selectedPartner.address?.trim() ? (
                    <Text style={styles.partnerSheetMeta} numberOfLines={2}>
                      {selectedPartner.address.trim()}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setSelectedPartnerId(null)}
                  style={({ pressed }) => [styles.partnerSheetClose, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Close partner details"
                >
                  <MaterialCommunityIcons name="close" size={20} color={c.background} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => {
                  onPartnerPress(selectedPartner.id, selectedPartner.fulfillmentMode);
                  setSelectedPartnerId(null);
                }}
                style={({ pressed }) => [styles.partnerSheetAction, pressed && styles.pressed]}
              >
                <Text style={styles.partnerSheetActionText}>View partner details</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  mapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(3, 15, 27, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  recenterBtn: {
    position: "absolute",
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    elevation: 8,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.filledButtonBorder,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  partnerSheetWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 120,
    elevation: 12,
    marginBottom: -100
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  partnerSheet: {
    backgroundColor: c.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  partnerSheetTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  partnerInfoWrap: {
    flex: 1,
  },
  partnerSheetTitle: {
    color: c.background,
    fontSize: 16,
    fontWeight: "700",
  },
  partnerSheetSubtitle: {
    marginTop: 2,
    color: c.gray50,
    fontSize: 13,
    fontWeight: "600",
  },
  partnerSheetMeta: {
    marginTop: 4,
    color: c.gray50,
    fontSize: 13,
    lineHeight: 18,
  },
  partnerSheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  partnerSheetAction: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  partnerSheetActionText: {
    color: c.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
