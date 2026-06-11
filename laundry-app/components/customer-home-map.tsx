import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { theme } from "@/constants/theme";
import { fetchPartnersByFulfillmentMode, type PartnerPublicRow } from "@/lib/partner-discovery";
import { getDeviceCoordinates } from "@/utils/device-location";
import { getCoordinatesWithFallback, type Coordinates } from "@/utils/geocoding";

const c = theme.colors;
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
  imageUrl: string | null;
  initial: string;
};

type GroupedMarker = {
  partner: PartnerMapMarker;
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
};

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

function getPartnerPrimaryImage(partner: PartnerMapMarker | null): string | null {
  if (!partner) return null;
  const firstBusinessImage = partner.business_images?.[0]?.trim() ?? "";
  if (firstBusinessImage.length > 0) return firstBusinessImage;
  const fallbackImage = partner.image_url?.trim() ?? "";
  return fallbackImage.length > 0 ? fallbackImage : null;
}

export function CustomerHomeMap({
  strings,
  onMenuPress,
  onPartnerPress,
  recenterBottomOffset,
}: Props) {
  const mapRef = useRef<WebView | null>(null);
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
  const selectedPartnerUpdatedLabel = selectedPartner
    ? formatPartnerUpdatedAt(selectedPartner.updated_at)
    : null;
  const selectedPartnerPrimaryImage = getPartnerPrimaryImage(selectedPartner);

  const mapMarkers = useMemo<WebMapMarker[]>(
    () => {
      const groups = new Map<string, GroupedMarker[]>();
      for (const item of markers) {
        // Normalize keys so tiny float noise does not split same-location partners.
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

          // Spread overlapping markers around the real coordinate for better tapability.
          const angle = (2 * Math.PI * i) / count;
          const radiusDegrees = 0.00018; // ~20m visual spread
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
    },
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
    const map = L.map('map', { zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.attributionControl.setPrefix(false);
    map.attributionControl.setPosition('bottomleft');
    const defaultCenter = [31.365, 74.2143];
    map.setView(defaultCenter, ${DEFAULT_ZOOM});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const markers = ${markersJson};
    const user = ${userJson};
    const allPoints = [];
    const bounds = [];

    function labelForMode(mode) {
      return mode === 'pickupDelivery' ? ${pickupLabel} : ${dropOffLabel};
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
      const icon = L.divIcon({
        html: markerHtml(item),
        className: 'partner-marker-icon',
        iconSize: [48, 58],
        iconAnchor: [24, 54],
        popupAnchor: [0, -50],
      });
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
                    <MaterialCommunityIcons
                      name="image-off-outline"
                      size={22}
                      color={c.gray50}
                    />
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
                        <MaterialCommunityIcons name="calendar-refresh-outline" size={14} color={c.gray50} />
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
  partnerSheetImage: {
    width: '35%',
    height: '100%',
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
