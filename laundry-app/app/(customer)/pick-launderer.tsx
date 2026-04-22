import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import {
  fetchPartnersByFulfillmentMode,
  type PartnerFulfillmentMode,
  type PartnerPublicRow,
} from "@/lib/partner-discovery";
import { reassignRejectedCustomerOrder } from "@/lib/customer-orders";
import {
  getCoordinatesWithFallback,
  type Coordinates,
} from "@/utils/geocoding";

const c = theme.colors;

const PLACEHOLDER_RATING = 4.5;
const DEFAULT_ADDRESS = "1465 5th Avenue APt 5C";
const DISTANCE_PLACEHOLDER = "—";
const PARTNER_DISTANCE_PLACEHOLDER = `${DISTANCE_PLACEHOLDER} km`;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(from: Coordinates, to: Coordinates): number {
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

function formatDistanceKm(distanceKm: number | null | undefined): string {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return PARTNER_DISTANCE_PLACEHOLDER;
  }
  if (distanceKm < 1) {
    return `${Math.max(0.1, distanceKm).toFixed(1)} km`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

function LaundererCard({
  partner,
  distanceLabel,
  onPress,
}: {
  partner: PartnerPublicRow;
  distanceLabel: string;
  onPress: () => void;
}) {
  const businessImageUri = Array.isArray(partner.business_images)
    ? partner.business_images.find(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : null;
  const imageUri =
    businessImageUri ?? avatarUrlWithCacheBuster(partner.image_url, partner.updated_at);
  const hours =
    partner.available_time?.trim() || strings.customer.pickLaunderer.hoursPlaceholder;
  const phone = partner.phone_number?.trim() || "—";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <Image source={assets.onboarding.slide1} style={styles.cardImage} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <MaterialCommunityIcons key={i} name="star" size={16} color="#EAB308" />
          ))}
          <Text style={styles.ratingText}>({PLACEHOLDER_RATING})</Text>
        </View>
        <Text style={styles.cardName} numberOfLines={1}>
          {partner.business_name.trim()}
        </Text>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="phone"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{hours}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="compass-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{distanceLabel}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="home-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText} numberOfLines={2}>
            {partner.address?.trim() || "—"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PickLaundererScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reorderOrderId?: string; mode?: string }>();
  const s = strings.customer.pickLaunderer;
  const sHome = strings.customer.home;
  const reorderOrderId = typeof params.reorderOrderId === "string" ? params.reorderOrderId : "";
  const fulfillmentMode: PartnerFulfillmentMode =
    params.mode === "pickupDelivery" ? "pickupDelivery" : "dropoff";
  const isReassignMode = reorderOrderId.length > 0;
  const defaultTitle = fulfillmentMode === "dropoff" ? sHome.dropOff : sHome.pickUpDelivery;
  const [partners, setPartners] = useState<PartnerPublicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [partnerCoordinates, setPartnerCoordinates] = useState<Record<string, Coordinates | null>>(
    {}
  );
  const geocodeCacheRef = useRef<Map<string, Coordinates | null>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchPartnersByFulfillmentMode(fulfillmentMode);
    if (err) {
      setError(err);
      setPartners([]);
    } else {
      setPartners(data ?? []);
    }
    setLoading(false);
  }, [fulfillmentMode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const uniqueAddresses = Array.from(
      new Set(
        partners
          .filter(
            (partner) =>
              !Number.isFinite(partner.latitude) || !Number.isFinite(partner.longitude)
          )
          .map((partner) => partner.address?.trim() ?? "")
          .filter((address) => address.length > 0)
      )
    );
    const unresolvedAddresses = uniqueAddresses.filter(
      (address) => !geocodeCacheRef.current.has(address)
    );

    if (unresolvedAddresses.length === 0) {
      setPartnerCoordinates((prev) => {
        const next: Record<string, Coordinates | null> = {};
        for (const partner of partners) {
          if (
            Number.isFinite(partner.latitude) &&
            Number.isFinite(partner.longitude)
          ) {
            next[partner.id] = {
              latitude: Number(partner.latitude),
              longitude: Number(partner.longitude),
            };
            continue;
          }
          const address = partner.address?.trim() ?? "";
          next[partner.id] = address ? geocodeCacheRef.current.get(address) ?? null : null;
        }
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        const hasSameKeys =
          prevKeys.length === nextKeys.length &&
          nextKeys.every((key) => Object.prototype.hasOwnProperty.call(prev, key));
        if (!hasSameKeys) return next;
        const isSame = nextKeys.every(
          (key) =>
            prev[key]?.latitude === next[key]?.latitude &&
            prev[key]?.longitude === next[key]?.longitude
        );
        return isSame ? prev : next;
      });
      return;
    }

    (async () => {
      const resolved = await Promise.all(
        unresolvedAddresses.map(async (address) => ({
          address,
          coords: await getCoordinatesWithFallback(address),
        }))
      );
      if (cancelled) return;
      for (const item of resolved) {
        geocodeCacheRef.current.set(item.address, item.coords);
      }
      const next: Record<string, Coordinates | null> = {};
      for (const partner of partners) {
        if (
          Number.isFinite(partner.latitude) &&
          Number.isFinite(partner.longitude)
        ) {
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

  const partnerDistanceLabels = useMemo(() => {
    const next: Record<string, string> = {};
    for (const partner of partners) {
      const partnerCoords = partnerCoordinates[partner.id];
      if (!userCoordinates || !partnerCoords) {
        next[partner.id] = PARTNER_DISTANCE_PLACEHOLDER;
        continue;
      }
      const km = calculateDistanceKm(userCoordinates, partnerCoords);
      next[partner.id] = formatDistanceKm(km);
    }
    return next;
  }, [partnerCoordinates, partners, userCoordinates]);

  const filteredPartners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return partners;
    return partners.filter((partner) =>
      (partner.business_name ?? "").trim().toLowerCase().startsWith(query)
    );
  }, [partners, searchQuery]);

  const handlePartnerPress = useCallback(
    async (partnerId: string) => {
      if (!isReassignMode) {
        router.push({
          pathname: "/(customer)/launderer-detail",
          params: { id: partnerId, mode: fulfillmentMode },
        });
        return;
      }

      try {
        await reassignRejectedCustomerOrder(reorderOrderId, partnerId);
        Alert.alert(s.reassignSuccessTitle, s.reassignSuccessMessage, [
          {
            text: "OK",
            onPress: () => router.replace("/(customer)/(tabs)/order"),
          },
        ]);
      } catch (error) {
        Alert.alert(
          s.reassignErrorTitle,
          error instanceof Error ? error.message : s.reassignErrorMessage,
        );
      }
    },
    [fulfillmentMode, isReassignMode, reorderOrderId, router, s],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        </Pressable>
        <View style={styles.addressWrap}>
          <Image source={assets.icons.location_icon} style={styles.addressIcon} />
          <TextInput
            placeholder="Search laundromat name"
            placeholderTextColor={c.gray50}
            style={styles.addressInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable
            returnKeyType="done"
          />
        </View>
      </SafeAreaView>
      <Text style={styles.screenTitle}>{isReassignMode ? s.reassignTitle : defaultTitle}</Text>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      ) : error ? (
        <View style={styles.centerBlock}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{s.retry}</Text>
          </Pressable>
        </View>
      ) : filteredPartners.length === 0 ? (
        <View style={styles.centerBlock}>
          <Text style={styles.emptyText}>{s.emptyList}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredPartners.map((partner) => (
            <LaundererCard
              key={partner.id}
              partner={partner}
              distanceLabel={partnerDistanceLabels[partner.id] ?? PARTNER_DISTANCE_PLACEHOLDER}
              onPress={() => void handlePartnerPress(partner.id)}
            />
          ))}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: { padding: 6 },
  addressWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  addressIcon: {
    width: 20,
    height: 20,
  },
  addressInput: {
    flex: 1,
    fontSize: 14,
    color: c.themeBlack,
    paddingVertical: 0,
  },
  pressed: { opacity: 0.8 },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: c.white,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  centerBlock: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    color: "#FFB3B3",
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: {
    color: c.blue500,
    fontSize: 15,
    textAlign: "center",
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryText: {
    color: c.lightBlue,
    fontSize: 15,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    backgroundColor: c.blue900,
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 10,
    alignItems: "center",
  },
  cardImage: {
    width: 100,
    height: 120,
    backgroundColor: c.blue500,
    borderRadius: 16,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: c.white,
    fontWeight: "600",
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: c.white,
    opacity: 0.8,
    flex: 1,
  },
});
