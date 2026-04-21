import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
import { fetchPartnersByFulfillmentMode, type PartnerPublicRow } from "@/lib/partner-discovery";
import { getCoordinatesWithFallback, type Coordinates } from "@/utils/geocoding";

const c = theme.colors;
const DEFAULT_ADDRESS = "Bahria Town, Lahore, Pakistan";
const USER_GEO_DEBOUNCE_MS = 450;
const DEFAULT_USER_COORDINATES: Coordinates = {
  latitude: 31.365,
  longitude: 74.2143,
};
const FALLBACK_REGION: Region = {
  latitude: DEFAULT_USER_COORDINATES.latitude,
  longitude: DEFAULT_USER_COORDINATES.longitude,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

type PartnerMapMarker = PartnerPublicRow & {
  fulfillmentMode: "dropoff" | "pickupDelivery";
};

type HomeStrings = {
  addressPlaceholder: string;
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
  const googleMapsIosApiKey =
    Constants.expoConfig?.ios?.config?.googleMapsApiKey ??
    Constants.manifest2?.extra?.expoClient?.ios?.config?.googleMapsApiKey ??
    "";
  const shouldUseGoogleProvider = Platform.OS === "android" || googleMapsIosApiKey.trim().length > 0;
  const mapRef = useRef<MapView | null>(null);
  const geocodeCacheRef = useRef<Map<string, Coordinates | null>>(new Map());
  const [addressInput, setAddressInput] = useState(DEFAULT_ADDRESS);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [partners, setPartners] = useState<PartnerMapMarker[]>([]);
  const [partnerCoordinates, setPartnerCoordinates] = useState<Record<string, Coordinates | null>>(
    {},
  );
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const resolveUserCoordinates = useCallback(async (address: string) => {
    const coords = await getCoordinatesWithFallback(address);
    if (coords) return coords;
    if (address.trim().toLowerCase() === DEFAULT_ADDRESS.trim().toLowerCase()) {
      return DEFAULT_USER_COORDINATES;
    }
    return null;
  }, []);

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
    const timeoutId = setTimeout(() => {
      void resolveUserCoordinates(addressInput).then((coords) => {
        if (!cancelled) {
          setUserCoordinates(coords);
        }
      });
    }, USER_GEO_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [addressInput, resolveUserCoordinates]);

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

  const focusMap = useCallback(
    (animated: boolean) => {
      if (!mapRef.current || !mapReady) return;
      const points = markers.map((item) => item.coords);
      if (userCoordinates) points.push(userCoordinates);

      if (points.length === 0) {
        mapRef.current.animateToRegion(FALLBACK_REGION, animated ? 350 : 0);
        return;
      }
      if (points.length === 1) {
        mapRef.current.animateToRegion(
          {
            latitude: points[0].latitude,
            longitude: points[0].longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          animated ? 350 : 0,
        );
        return;
      }
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 140, right: 80, bottom: 300, left: 80 },
        animated,
      });
    },
    [mapReady, markers, userCoordinates],
  );

  useEffect(() => {
    focusMap(true);
  }, [focusMap]);

  return (
    <>
      <MapView
        ref={mapRef}
        style={styles.mapArea}
        provider={shouldUseGoogleProvider ? PROVIDER_GOOGLE : undefined}
        initialRegion={FALLBACK_REGION}
        showsUserLocation={false}
        showsCompass
        onMapReady={() => setMapReady(true)}
      >
        {userCoordinates ? (
          <Marker coordinate={userCoordinates} title="Your location" pinColor="#0B84FF" />
        ) : null}
        {markers.map(({ partner, coords }) => (
          <Marker
            key={partner.id}
            coordinate={coords}
            title={partner.business_name.trim()}
            description={
              partner.fulfillmentMode === "pickupDelivery" ? strings.pickUpDelivery : strings.dropOff
            }
            pinColor={partner.fulfillmentMode === "pickupDelivery" ? "#14B8A6" : "#F97316"}
            onCalloutPress={() => onPartnerPress(partner.id, partner.fulfillmentMode)}
          />
        ))}
      </MapView>

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
          <MaterialCommunityIcons name="menu" size={24} color={c.background} />
        </Pressable>
        <View style={styles.addressInputWrap}>
          <TextInput
            placeholder={strings.addressPlaceholder}
            placeholderTextColor={c.gray50}
            style={styles.addressInput}
            value={addressInput}
            onChangeText={setAddressInput}
            editable
            returnKeyType="done"
          />
          <Pressable
            onPress={() => {
              void resolveUserCoordinates(addressInput).then((coords) => {
                setUserCoordinates(coords);
              });
            }}
            style={({ pressed }) => [styles.locationIconInside, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Current location"
          >
            <Image source={assets.icons.location_icon} style={styles.locationIconImage} />
          </Pressable>
        </View>
      </SafeAreaView>

      <Pressable
        onPress={() => focusMap(true)}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  iconBtn: {
    padding: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  addressInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingRight: 12,
  },
  addressInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    paddingRight: 8,
    fontSize: 15,
    color: theme.colors.themeBlack,
  },
  locationIconInside: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  locationIconImage: {
    width: 24,
    height: 24,
    tintColor: c.background,
  },
});
