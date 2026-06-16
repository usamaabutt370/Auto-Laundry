import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { theme } from "@/constants/theme";
import { fetchMapPartners, type PartnerMapMarkerRow } from "@/lib/partner-discovery";
import { getDeviceCoordinates } from "@/utils/device-location";
import {
  loadGeocodeCache,
  normalizeGeocodeAddress,
  persistGeocodeEntry,
} from "@/utils/geocode-cache";
import { getCoordinatesWithFallback, type Coordinates } from "@/utils/geocoding";

const c = theme.colors;
const DEFAULT_ZOOM = 5;
const DEFAULT_CENTER = [30.3753, 69.3451] as const;
const USER_FOCUS_ZOOM = 14;
const NOMINATIM_GAP_MS = 1100;

type WebMapMarker = {
  id: string;
  name: string;
  mode: "dropoff" | "pickupDelivery";
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  initial: string;
};

type GroupedMarker = {
  partner: PartnerMapMarkerRow;
  coords: Coordinates;
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
  mapBottomInset?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPartnerUpdatedAt(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPartnerPrimaryImage(partner: PartnerMapMarkerRow | null): string | null {
  if (!partner) return null;
  const firstBusinessImage = partner.business_images?.[0]?.trim() ?? "";
  if (firstBusinessImage.length > 0) return firstBusinessImage;
  const fallbackImage = partner.image_url?.trim() ?? "";
  return fallbackImage.length > 0 ? fallbackImage : null;
}

function partnerAddressKey(partner: PartnerMapMarkerRow): string {
  return normalizeGeocodeAddress(partner.address ?? "");
}

function partnerHasCoordinates(partner: PartnerMapMarkerRow): boolean {
  return Number.isFinite(partner.latitude) && Number.isFinite(partner.longitude);
}

function coordinatesFromPartner(partner: PartnerMapMarkerRow): Coordinates | null {
  if (!partnerHasCoordinates(partner)) return null;
  return {
    latitude: Number(partner.latitude),
    longitude: Number(partner.longitude),
  };
}

function buildMapShellHtml(dropOffLabel: string, pickupLabel: string): string {
  const dropOffJson = JSON.stringify(dropOffLabel);
  const pickupJson = JSON.stringify(pickupLabel);
  const zoomControlBottomOffset = 58;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
    .leaflet-div-icon.partner-marker-icon {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    .partner-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 48px;
      line-height: 0;
    }
    .partner-marker-frame {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid #A0D0E9;
      background: #3b7f95;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 2px 8px rgba(18, 129, 151, 0.35);
      position: relative;
      flex-shrink: 0;
    }
    .partner-marker-frame.pickupDelivery {
      border-color: #64B5D9;
      background: #128197;
    }
    .partner-marker-media {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .partner-marker-media img {
      width: 100%;
      height: 100%;
      min-width: 100%;
      min-height: 100%;
      object-fit: cover;
      object-position: center center;
      display: block;
      border: 0;
      margin: 0;
      padding: 0;
    }
    .partner-marker-fallback {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #3b7f95;
      color: #F9FAFB;
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
    }
    .partner-marker-frame.pickupDelivery .partner-marker-fallback {
      background: #128197;
    }
    .partner-marker-pointer {
      width: 0;
      height: 0;
      margin-top: -1px;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 9px solid #A0D0E9;
    }
    .partner-marker-pointer.pickupDelivery {
      border-top-color: #64B5D9;
    }
    .leaflet-right { right: 8px; }
    .leaflet-bottom.leaflet-right { bottom: ${zoomControlBottomOffset}px; }
    .leaflet-bottom.leaflet-left { bottom: 8px; left: 8px; }
    .leaflet-control-attribution {
      margin: 0 !important;
      padding: 2px 6px !important;
      font-size: 9px !important;
      line-height: 1.25 !important;
      border-radius: 6px !important;
      background: rgba(3, 15, 27, 0.62) !important;
      color: rgba(255, 255, 255, 0.82) !important;
      box-shadow: none !important;
      max-width: calc(100vw - 24px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .leaflet-control-attribution a {
      color: #A0D0E9 !important;
      text-decoration: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const worldBounds = L.latLngBounds([[-85.05112878, -180], [85.05112878, 180]]);
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 19,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0,
    });
    window.map = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const defaultCenter = [${DEFAULT_CENTER[0]}, ${DEFAULT_CENTER[1]}];
    map.setView(defaultCenter, ${DEFAULT_ZOOM});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 2,
      maxZoom: 19,
      noWrap: true,
      attribution: ''
    }).addTo(map);

    const dropOffLabel = ${dropOffJson};
    const pickupLabel = ${pickupJson};
    const markerLayer = L.layerGroup().addTo(map);
    let userMarker = null;

    function labelForMode(mode) {
      return mode === 'pickupDelivery' ? pickupLabel : dropOffLabel;
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function markerHtml(item) {
      const modeClass = item.mode === 'pickupDelivery' ? 'pickupDelivery' : 'dropoff';
      const imageHtml = item.imageUrl
        ? '<div class="partner-marker-media"><img src="' + escapeHtml(item.imageUrl) + '" alt="" /></div>'
        : '<span class="partner-marker-fallback">' + escapeHtml(item.initial || 'P') + '</span>';
      return ''
        + '<div class="partner-marker">'
        +   '<div class="partner-marker-frame ' + modeClass + '">' + imageHtml + '</div>'
        +   '<div class="partner-marker-pointer ' + modeClass + '"></div>'
        + '</div>';
    }

    window.__updateMapState = function(markers, user) {
      markerLayer.clearLayers();
      (markers || []).forEach((item) => {
        const icon = L.divIcon({
          html: markerHtml(item),
          className: 'partner-marker-icon',
          iconSize: [48, 58],
          iconAnchor: [24, 54],
          popupAnchor: [0, -50],
        });
        const m = L.marker([item.latitude, item.longitude], { icon }).addTo(markerLayer);
        m.bindPopup(item.name + ' (' + labelForMode(item.mode) + ')');
        m.on('click', () => {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'partner-press',
            partnerId: item.id,
            mode: item.mode
          }));
        });
      });

      if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }
      if (user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude)) {
        userMarker = L.circleMarker([user.latitude, user.longitude], {
          radius: 8,
          color: '#0B84FF',
          fillColor: '#0B84FF',
          fillOpacity: 0.95,
        }).addTo(map);
        userMarker.bindPopup('Your location');
      }
    };

    function recenterToDefault() {
      map.setView(defaultCenter, ${DEFAULT_ZOOM});
    }

    window.__recenterToDefault = recenterToDefault;
    window.__focusUser = function(user) {
      if (user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude)) {
        map.setView([user.latitude, user.longitude], ${USER_FOCUS_ZOOM});
        return;
      }
      recenterToDefault();
    };

    recenterToDefault();
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'map-ready' }));
  </script>
</body>
</html>`;
}

export function CustomerHomeMap({
  strings,
  onMenuPress,
  onPartnerPress,
  recenterBottomOffset,
  mapBottomInset = 0,
}: Props) {
  const mapRef = useRef<WebView | null>(null);
  const geocodeCacheRef = useRef<Map<string, Coordinates | null>>(new Map());
  const [geocodeCacheReady, setGeocodeCacheReady] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [partners, setPartners] = useState<PartnerMapMarkerRow[]>([]);
  const [partnerCoordinates, setPartnerCoordinates] = useState<Record<string, Coordinates | null>>(
    {},
  );
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [geocodingPartners, setGeocodingPartners] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const mapShellHtml = useMemo(
    () => buildMapShellHtml(strings.dropOff, strings.pickUpDelivery),
    [strings.dropOff, strings.pickUpDelivery],
  );

  const loadPartners = useCallback(async () => {
    setLoadingPartners(true);
    const result = await fetchMapPartners();
    setPartners(result.data ?? []);
    setLoadingPartners(false);
  }, []);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cache = await loadGeocodeCache();
      if (cancelled) return;
      geocodeCacheRef.current = cache;
      setGeocodeCacheReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const applyPartnerCoordinates = useCallback((rows: PartnerMapMarkerRow[]) => {
    const next: Record<string, Coordinates | null> = {};
    for (const partner of rows) {
      const fromDb = coordinatesFromPartner(partner);
      if (fromDb) {
        next[partner.id] = fromDb;
        continue;
      }
      const address = partnerAddressKey(partner);
      if (!address) {
        next[partner.id] = null;
        continue;
      }
      next[partner.id] = geocodeCacheRef.current.get(address) ?? null;
    }
    setPartnerCoordinates(next);
    return next;
  }, []);

  useEffect(() => {
    if (!geocodeCacheReady) return;

    if (partners.length === 0) {
      setPartnerCoordinates({});
      setGeocodingPartners(false);
      return;
    }

    applyPartnerCoordinates(partners);

    const unresolvedAddresses = Array.from(
      new Set(
        partners
          .filter((partner) => !partnerHasCoordinates(partner))
          .map((partner) => partnerAddressKey(partner))
          .filter((address) => address.length > 0 && !geocodeCacheRef.current.has(address)),
      ),
    );

    if (unresolvedAddresses.length === 0) {
      setGeocodingPartners(false);
      return;
    }

    let cancelled = false;
    setGeocodingPartners(true);

    void (async () => {
      for (const address of unresolvedAddresses) {
        if (cancelled) return;
        const coords = await getCoordinatesWithFallback(address);
        await persistGeocodeEntry(address, coords, geocodeCacheRef.current);
        if (cancelled) return;
        setPartnerCoordinates((prev) => {
          const next = { ...prev };
          for (const partner of partners) {
            if (partnerAddressKey(partner) === address) {
              next[partner.id] = coords;
            }
          }
          return next;
        });
        await sleep(NOMINATIM_GAP_MS);
      }
      if (!cancelled) setGeocodingPartners(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPartnerCoordinates, geocodeCacheReady, partners]);

  const markers = useMemo(
    () =>
      partners
        .map((partner) => ({ partner, coords: partnerCoordinates[partner.id] }))
        .filter((item): item is { partner: PartnerMapMarkerRow; coords: Coordinates } =>
          Boolean(item.coords),
        ),
    [partnerCoordinates, partners],
  );

  const markerById = useMemo(() => {
    const map = new Map<string, PartnerMapMarkerRow>();
    for (const partner of partners) {
      map.set(partner.id, partner);
    }
    return map;
  }, [partners]);

  const selectedPartner = selectedPartnerId ? markerById.get(selectedPartnerId) ?? null : null;
  const selectedPartnerUpdatedLabel = selectedPartner
    ? formatPartnerUpdatedAt(selectedPartner.updated_at)
    : null;
  const selectedPartnerPrimaryImage = getPartnerPrimaryImage(selectedPartner);

  const mapMarkers = useMemo<WebMapMarker[]>(() => {
    const groups = new Map<string, GroupedMarker[]>();
    for (const item of markers) {
      const key = `${item.coords.latitude.toFixed(6)},${item.coords.longitude.toFixed(6)}`;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }

    const out: WebMapMarker[] = [];
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
  }, [markers]);

  const pushMapState = useCallback(() => {
    if (!mapReady) return;
    const script = `window.__updateMapState && window.__updateMapState(${JSON.stringify(mapMarkers)}, ${JSON.stringify(userCoordinates)}); true;`;
    mapRef.current?.injectJavaScript(script);
  }, [mapMarkers, mapReady, userCoordinates]);

  useEffect(() => {
    pushMapState();
  }, [pushMapState]);

  const focusMap = useCallback(() => {
    void (async () => {
      const latestCoords = userCoordinates ?? (await getDeviceCoordinates());
      if (
        latestCoords &&
        Number.isFinite(latestCoords.latitude) &&
        Number.isFinite(latestCoords.longitude)
      ) {
        if (!userCoordinates) setUserCoordinates(latestCoords);
        if (mapReady) {
          const script = `window.__focusUser && window.__focusUser(${JSON.stringify(latestCoords)}); true;`;
          mapRef.current?.injectJavaScript(script);
        }
        return;
      }
      mapRef.current?.injectJavaScript(
        "window.__recenterToDefault && window.__recenterToDefault(); true;",
      );
    })();
  }, [mapReady, userCoordinates]);

  useEffect(() => {
    if (!mapReady || !userCoordinates) return;
    const script = `window.__focusUser && window.__focusUser(${JSON.stringify(userCoordinates)}); true;`;
    mapRef.current?.injectJavaScript(script);
  }, [mapReady, userCoordinates]);

  return (
    <>
      <WebView
        ref={mapRef}
        style={[styles.mapArea, mapBottomInset > 0 ? { bottom: mapBottomInset } : null]}
        source={{ html: mapShellHtml }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              partnerId?: string;
              mode?: "dropoff" | "pickupDelivery";
            };
            if (payload.type === "map-ready") {
              setMapReady(true);
              return;
            }
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

      {loadingPartners || (geocodingPartners && mapMarkers.length === 0) ? (
        <View style={styles.mapLoading}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      ) : null}

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
                {selectedPartnerPrimaryImage ? (
                  <Image
                    source={{ uri: selectedPartnerPrimaryImage }}
                    style={styles.partnerSheetImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.partnerSheetImage, styles.partnerSheetImagePlaceholder]}>
                    <MaterialCommunityIcons name="image-off-outline" size={22} color={c.gray50} />
                    <Text style={styles.partnerSheetImagePlaceholderText}>No Image</Text>
                  </View>
                )}
                <View style={styles.partnerInfoWrap}>
                  <PartnerNameWithBadge
                    name={selectedPartner.business_name.trim()}
                    verified
                    nameStyle={styles.partnerSheetTitle}
                  />
                  <Text style={styles.partnerSheetSubtitle}>
                    {selectedPartner.fulfillmentMode === "pickupDelivery"
                      ? strings.pickUpDelivery
                      : strings.dropOff}
                  </Text>
                  <View style={styles.partnerDetailsGrid}>
                    {selectedPartner.phone_number?.trim() ? (
                      <View style={styles.partnerMetaRow}>
                        <MaterialCommunityIcons name="phone-outline" size={14} color={c.gray50} />
                        <Text style={styles.partnerSheetMeta}>{selectedPartner.phone_number.trim()}</Text>
                      </View>
                    ) : null}
                    {selectedPartner.available_time?.trim() ? (
                      <View style={styles.partnerMetaRow}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={c.gray50} />
                        <Text style={styles.partnerSheetMeta} numberOfLines={1}>
                          {selectedPartner.available_time.trim()}
                        </Text>
                      </View>
                    ) : null}
                    {selectedPartner.address?.trim() ? (
                      <View style={styles.partnerMetaRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={c.gray50} />
                        <Text style={styles.partnerSheetMeta} numberOfLines={2}>
                          {selectedPartner.address.trim()}
                        </Text>
                      </View>
                    ) : null}
                    {selectedPartnerUpdatedLabel ? (
                      <View style={styles.partnerMetaRow}>
                        <MaterialCommunityIcons
                          name="calendar-refresh-outline"
                          size={14}
                          color={c.gray50}
                        />
                        <Text style={styles.partnerSheetMeta} numberOfLines={1}>
                          Updated {selectedPartnerUpdatedLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
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
    marginBottom: -100,
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
  partnerSheetImage: {
    width: "35%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  partnerSheetImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  partnerSheetImagePlaceholderText: {
    color: c.gray50,
    fontSize: 11,
    fontWeight: "600",
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
    color: c.gray50,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  partnerDetailsGrid: {
    marginTop: 8,
    gap: 6,
  },
  partnerMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
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
