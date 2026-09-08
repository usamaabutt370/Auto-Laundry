import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { FiltersMapFab } from "@/components/filters-map-fab";
import { AvatarImage } from "@/components/avatar-image";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import {
  applyProviderFilters,
  isServiceCategory,
  OPEN_PROVIDER_FILTERS,
  ProviderFiltersSheet,
  type ProviderFilters,
  type ProviderSheetPane,
} from "@/components/provider-filters-sheet";
import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { useAuth } from "@/contexts/auth-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  fetchMapPartners,
  fetchPartnersByFulfillmentMode,
  type PartnerFulfillmentMode,
  type PartnerPublicRow,
} from "@/lib/partner-discovery";
import { getCoordinatesWithFallback, getPlaceLabelFromCoordinates, type Coordinates } from "@/utils/geocoding";
import {
  formatPartnerUpdatedAt,
  getPartnerPrimaryImage,
  type CustomerMapMarker,
  type PartnerMapMarker,
} from "@/hooks/use-customer-home-map-data";
import { getDeviceCoordinatesWithStatus } from "@/utils/device-location";
import { StarRating } from "@/components/star-rating";
import { getPartnerOpenStatus, isPartnerOpenNow } from "@/utils/partner-hours";
import { isPartnerTopRated, partnerHasActiveOffer } from "@/utils/partner-offers";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  price: "#0F9F6E",
  chipBorder: "#E5E7EB",
  openBg: "#ECFDF5",
  openText: "#047857",
  distBg: "rgba(17, 24, 39, 0.62)",
  backBg: "#EEF2F6",
};

const DISTANCE_PLACEHOLDER = "—";
const PARTNER_DISTANCE_PLACEHOLDER = `${DISTANCE_PLACEHOLDER} km`;
const H_PAD = 16;
const CARD_GAP = 12;

type ProviderChip = "all" | "open" | "rated" | "offers";

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

type LaundererCardVariant = "list" | "grid";

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

function LaundererCard({
  partner,
  distanceLabel,
  onPress,
  favorited,
  onToggleFavorite,
  isPickup,
}: {
  partner: PartnerPublicRow;
  distanceLabel: string;
  onPress: () => void;
  favorited: boolean;
  onToggleFavorite: () => void;
  isPickup: boolean;
}) {
  const s = strings.customer.pickLaunderer;
  const businessImageUri = Array.isArray(partner.business_images)
    ? partner.business_images.find(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : null;
  const imageUri =
    businessImageUri ?? avatarUrlWithCacheBuster(partner.image_url, partner.updated_at);
  const openStatus = getPartnerOpenStatus(partner.available_time);
  const openLabel =
    openStatus === "open" ? s.openNow : openStatus === "closed" ? s.closed : s.hoursUnknown;
  const hasOffer = partnerHasActiveOffer(partner.offerPercent);
  const topRated = isPartnerTopRated(partner.ratingAvg, partner.ratingCount);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardImageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImage} contentFit="cover" />
        ) : (
          <Image source={assets.onboarding.slide1} style={styles.cardImage} contentFit="cover" />
        )}
        {hasOffer ? (
          <View style={[styles.cardBadge, styles.offerBadge]}>
            <MaterialCommunityIcons name="tag-outline" size={11} color="#BE185D" />
            <Text style={[styles.cardBadgeText, { color: "#BE185D" }]} numberOfLines={1}>
              {fill(s.percentOff, { pct: partner.offerPercent ?? 0 })}
            </Text>
          </View>
        ) : topRated ? (
          <View style={[styles.cardBadge, styles.topRatedBadge]}>
            <MaterialCommunityIcons name="crown-outline" size={11} color="#047857" />
            <Text style={[styles.cardBadgeText, { color: "#047857" }]} numberOfLines={1}>
              {s.badgeTopRated}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={onToggleFavorite}
          style={styles.heartBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={favorited ? s.unfavorite : s.favorite}
        >
          <MaterialCommunityIcons
            name={favorited ? "heart" : "heart-outline"}
            size={16}
            color={favorited ? "#E11D48" : "#FFFFFF"}
          />
        </Pressable>
        <View style={styles.distancePill}>
          <MaterialCommunityIcons name="map-marker" size={11} color="#FFFFFF" />
          <Text style={styles.distancePillText} numberOfLines={1}>
            {distanceLabel}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <PartnerNameWithBadge
          name={partner.business_name.trim()}
          verified
          nameStyle={styles.cardName}
          badgeSize={12}
        />
        <StarRating value={partner.ratingCount > 0 ? partner.ratingAvg : 0} size={13} />
        <Text style={styles.tagText} numberOfLines={1}>
          {isPickup ? `${s.tagLaundry} • ${s.tagWashFold}` : `${s.tagLaundry} • ${s.tagDropoff}`}
        </Text>
        <View style={styles.cardFooter}>
          <View
            style={[
              styles.openPill,
              openStatus === "closed" && styles.openPillClosed,
              openStatus === "unknown" && styles.openPillMuted,
            ]}
          >
            <Text
              style={[
                styles.openPillText,
                openStatus === "closed" && styles.openPillTextClosed,
                openStatus === "unknown" && styles.openPillTextMuted,
              ]}
            >
              {openLabel}
            </Text>
          </View>
          {typeof partner.minPrice === "number" ? (
            <Text style={styles.fromPriceRow} numberOfLines={1}>
              <Text style={styles.fromLabel}>{s.fromLabel} </Text>
              <Text style={styles.price}>Rs {Math.round(partner.minPrice)}</Text>
            </Text>
          ) : (
            <Text style={styles.price} numberOfLines={1}>
              {s.seePrices}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function PickLaundererScreen() {
  const router = useRouter();
  const { editingOrderId } = useCustomerOrderDraft();
  const params = useLocalSearchParams<{ reorderOrderId?: string; mode?: string; service?: string }>();
  const s = strings.customer.pickLaunderer;
  const { isWebDesktop } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const reorderOrderId = typeof params.reorderOrderId === "string" ? params.reorderOrderId : "";
  const fulfillmentMode: PartnerFulfillmentMode =
    params.mode === "pickupDelivery" ? "pickupDelivery" : "dropoff";
  const isReassignMode = reorderOrderId.length > 0;
  const [partners, setPartners] = useState<PartnerPublicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [partnerCoordinates, setPartnerCoordinates] = useState<Record<string, Coordinates | null>>(
    {}
  );
  const [chip, setChip] = useState<ProviderChip>("all");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [sheetPane, setSheetPane] = useState<ProviderSheetPane | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<ProviderFilters>(() => ({
    ...OPEN_PROVIDER_FILTERS,
    categories: isServiceCategory(params.service) ? [params.service] : [],
  }));
  const [locationLabel, setLocationLabel] = useState<string>(s.locationFallback);
  const geocodeCacheRef = useRef<Map<string, Coordinates | null>>(new Map());
  const columns = isWebDesktop ? 3 : 2;
  const cardWidth = (windowWidth - H_PAD * 2 - CARD_GAP * (columns - 1)) / columns;
  const headerTitle = isReassignMode ? s.reassignTitle : s.serviceProviders;
  const [avatarUri, setAvatarUri] = useState<string | undefined>(
    () =>
      (user?.user_metadata?.avatar_url as string | undefined) ||
      (user?.user_metadata?.picture as string | undefined) ||
      (user?.user_metadata?.image_url as string | undefined),
  );
  const avatarName =
    (user?.user_metadata?.first_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    "U";
  const chips: {
    id: ProviderChip;
    label: string;
    icon?: "clock-outline" | "star-outline" | "tag-outline";
  }[] = [
    { id: "all", label: s.filterAll },
    { id: "open", label: s.filterOpenNow, icon: "clock-outline" },
    { id: "rated", label: s.filterTopRated, icon: "star-outline" },
    { id: "offers", label: s.filterOffers, icon: "tag-outline" },
  ];

  const serviceFilter = isServiceCategory(params.service) ? params.service : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = serviceFilter
      ? await fetchMapPartners()
      : await fetchPartnersByFulfillmentMode(fulfillmentMode);
    if (err) {
      setError(err);
      setPartners([]);
    } else {
      setPartners(data ?? []);
    }
    setLoading(false);
  }, [fulfillmentMode, serviceFilter]);

  useEffect(() => {
    if (!serviceFilter) return;
    setAppliedFilters((prev) =>
      prev.categories.length === 1 && prev.categories[0] === serviceFilter
        ? prev
        : { ...prev, categories: [serviceFilter] },
    );
  }, [serviceFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const metadataAvatar =
      (typeof user?.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url.trim()) ||
      (typeof user?.user_metadata?.picture === "string" && user.user_metadata.picture.trim()) ||
      (typeof user?.user_metadata?.image_url === "string" && user.user_metadata.image_url.trim()) ||
      undefined;
    if (metadataAvatar) setAvatarUri(metadataAvatar);
    if (!isSupabaseConfigured() || !user?.id || !supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("image_url,updated_at")
        .eq("id", user.id)
        .maybeSingle<{ image_url: string | null; updated_at: string | null }>();
      if (cancelled) return;
      setAvatarUri(
        avatarUrlWithCacheBuster(data?.image_url, data?.updated_at) ?? metadataAvatar,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (editingOrderId && !isReassignMode) {
      router.replace("/(customer)/pickup-services");
    }
  }, [editingOrderId, isReassignMode, router]);

  const resolveUserLocation = useCallback(async () => {
    const result = await getDeviceCoordinatesWithStatus();
    setUserCoordinates(result.coords);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getDeviceCoordinatesWithStatus();
      if (cancelled) return;
      setUserCoordinates(result.coords);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    const coords = userCoordinates;
    if (!coords) return;
    let cancelled = false;
    void getPlaceLabelFromCoordinates(coords).then((label) => {
      if (!cancelled && label) setLocationLabel(label);
    });
    return () => {
      cancelled = true;
    };
  }, [userCoordinates]);

  const partnerDistanceKm = useMemo(() => {
    const next: Record<string, number | null> = {};
    for (const partner of partners) {
      const partnerCoords = partnerCoordinates[partner.id];
      if (!userCoordinates || !partnerCoords) {
        next[partner.id] = null;
        continue;
      }
      next[partner.id] = calculateDistanceKm(userCoordinates, partnerCoords);
    }
    return next;
  }, [partnerCoordinates, partners, userCoordinates]);

  const partnerDistanceLabels = useMemo(() => {
    const next: Record<string, string> = {};
    for (const partner of partners) {
      next[partner.id] = formatDistanceKm(partnerDistanceKm[partner.id]);
    }
    return next;
  }, [partnerDistanceKm, partners]);

  const filteredPartners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = applyProviderFilters(partners, appliedFilters, partnerDistanceKm);
    if (query) {
      list = list.filter((partner) =>
        (partner.business_name ?? "").trim().toLowerCase().startsWith(query),
      );
    }
    if (chip === "open") {
      list = list.filter((partner) => isPartnerOpenNow(partner.available_time));
    }
    if (chip === "rated") {
      list = list.filter((partner) => isPartnerTopRated(partner.ratingAvg, partner.ratingCount));
    }
    if (chip === "offers") {
      list = list.filter((partner) => partnerHasActiveOffer(partner.offerPercent));
    }
    return [...list].sort((a, b) => {
      const aKm = partnerDistanceKm[a.id];
      const bKm = partnerDistanceKm[b.id];
      const aVal = typeof aKm === "number" && Number.isFinite(aKm) ? aKm : Number.POSITIVE_INFINITY;
      const bVal = typeof bKm === "number" && Number.isFinite(bKm) ? bKm : Number.POSITIVE_INFINITY;
      return aVal - bVal;
    });
  }, [appliedFilters, chip, partnerDistanceKm, partners, searchQuery]);

  const toMapPartner = useCallback(
    (partner: PartnerPublicRow): PartnerMapMarker => ({
      ...partner,
      fulfillmentMode: partner.fulfillmentMode ?? fulfillmentMode,
    }),
    [fulfillmentMode],
  );

  const mapMarkers = useMemo<CustomerMapMarker[]>(() => {
    const markers = filteredPartners.flatMap((partner) => {
      const coords = partnerCoordinates[partner.id];
      if (!coords) return [];
      const mapped = toMapPartner(partner);
      return [
        {
          id: partner.id,
          name: partner.business_name.trim(),
          mode: mapped.fulfillmentMode,
          latitude: coords.latitude,
          longitude: coords.longitude,
          imageUrl: getPartnerPrimaryImage(mapped),
          initial: partner.business_name.trim().charAt(0).toUpperCase() || "P",
        },
      ];
    });

    const groups = new Map<string, CustomerMapMarker[]>();
    for (const marker of markers) {
      const key = `${marker.latitude.toFixed(6)},${marker.longitude.toFixed(6)}`;
      const list = groups.get(key) ?? [];
      list.push(marker);
      groups.set(key, list);
    }

    const out: CustomerMapMarker[] = [];
    for (const grouped of groups.values()) {
      const count = grouped.length;
      for (let i = 0; i < count; i += 1) {
        const marker = grouped[i];
        if (count === 1) {
          out.push(marker);
          continue;
        }
        const angle = (2 * Math.PI * i) / count;
        const radiusDegrees = 0.00018;
        out.push({
          ...marker,
          latitude: marker.latitude + Math.sin(angle) * radiusDegrees,
          longitude: marker.longitude + Math.cos(angle) * radiusDegrees,
        });
      }
    }
    return out;
  }, [filteredPartners, partnerCoordinates, toMapPartner]);

  const selectedPartner = useMemo(() => {
    if (!selectedPartnerId) return null;
    const partner = filteredPartners.find((row) => row.id === selectedPartnerId);
    return partner ? toMapPartner(partner) : null;
  }, [filteredPartners, selectedPartnerId, toMapPartner]);

  useEffect(() => {
    if (selectedPartnerId && !selectedPartner) {
      setSelectedPartnerId(null);
    }
  }, [selectedPartner, selectedPartnerId]);

  const mapData = useMemo(
    () => ({
      userCoordinates,
      loadingPartners: loading,
      mapMarkers,
      setSelectedPartnerId,
      selectedPartner,
      selectedPartnerUpdatedLabel: selectedPartner
        ? formatPartnerUpdatedAt(selectedPartner.updated_at)
        : null,
      selectedPartnerPrimaryImage: getPartnerPrimaryImage(selectedPartner),
    }),
    [loading, mapMarkers, selectedPartner, userCoordinates],
  );

  const emptyMessage = searchQuery.trim()
    ? s.emptySearch
    : chip === "open" || appliedFilters.openNow
      ? s.emptyOpenNow
      : chip === "rated" || appliedFilters.topRated
        ? s.emptyTopRated
        : chip === "offers" || appliedFilters.offers
          ? s.emptyOffers
          : appliedFilters.categories.length > 0
            ? s.emptyService
            : s.emptyList;

  const matchCount = useCallback(
    (filters: ProviderFilters) => {
      const query = searchQuery.trim().toLowerCase();
      let list = applyProviderFilters(partners, filters, partnerDistanceKm);
      if (query) {
        list = list.filter((partner) =>
          (partner.business_name ?? "").trim().toLowerCase().startsWith(query),
        );
      }
      return list.length;
    },
    [partnerDistanceKm, partners, searchQuery],
  );

  const applyFilters = (next: ProviderFilters) => {
    setAppliedFilters(next);
    if (next.openNow) setChip("open");
    else if (next.topRated) setChip("rated");
    else if (next.offers) setChip("offers");
    else setChip("all");
    setSheetPane(null);
  };

  const handlePartnerPress = useCallback(
    async (partner: PartnerPublicRow) => {
      router.push({
        pathname: "/(customer)/launderer-detail",
        params: {
          id: partner.id,
          name: partner.business_name ?? "",
          mode: partner.fulfillmentMode ?? fulfillmentMode,
          ...(typeof params.service === "string"
            ? { service: params.service }
            : appliedFilters.categories[0]
              ? { service: appliedFilters.categories[0] }
              : {}),
          ...(isReassignMode ? { reorderOrderId } : {}),
        },
      });
    },
    [appliedFilters.categories, fulfillmentMode, isReassignMode, params.service, reorderOrderId, router],
  );

  const closeSheet = useCallback(() => {
    setSelectedPartnerId(null);
    setSheetPane(null);
  }, []);

  const handleMapPartnerPress = useCallback(
    (partnerId: string) => {
      const partner = filteredPartners.find((row) => row.id === partnerId);
      closeSheet();
      if (partner) void handlePartnerPress(partner);
    },
    [closeSheet, filteredPartners, handlePartnerPress],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.header} edges={["top"]}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={UI.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>
              {fill(s.providersNearby, { count: filteredPartners.length })}
            </Text>
          </View>
          <AvatarImage uri={avatarUri} name={avatarName} size={36} style={styles.headerAvatar} />
        </View>

        <View style={styles.chipBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}
          >
            {chips.map((item) => {
              const selected = chip === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setChip(item.id);
                    if (item.id === "all") {
                      setAppliedFilters({
                        ...OPEN_PROVIDER_FILTERS,
                        categories: serviceFilter ? [serviceFilter] : [],
                      });
                    }
                    if (item.id === "open") {
                      setAppliedFilters((prev) => ({
                        ...prev,
                        openNow: true,
                        topRated: false,
                        offers: false,
                      }));
                    }
                    if (item.id === "rated") {
                      setAppliedFilters((prev) => ({
                        ...prev,
                        topRated: true,
                        openNow: false,
                        offers: false,
                      }));
                    }
                    if (item.id === "offers") {
                      setAppliedFilters((prev) => ({
                        ...prev,
                        offers: true,
                        openNow: false,
                        topRated: false,
                      }));
                    }
                  }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  {item.icon ? (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={12}
                      color={selected ? "#FFFFFF" : UI.text}
                    />
                  ) : null}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.addressWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color={UI.muted} />
          <TextInput
            placeholder={s.searchPlaceholder}
            placeholderTextColor={UI.muted}
            style={styles.addressInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable
            returnKeyType="done"
          />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={UI.teal} size="small" />
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
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredPartners.map((partner) => (
              <View key={partner.id} style={{ width: cardWidth }}>
                <LaundererCard
                  partner={partner}
                  distanceLabel={partnerDistanceLabels[partner.id] ?? PARTNER_DISTANCE_PLACEHOLDER}
                  onPress={() => void handlePartnerPress(partner)}
                  favorited={Boolean(favorites[partner.id])}
                  onToggleFavorite={() =>
                    setFavorites((prev) => ({ ...prev, [partner.id]: !prev[partner.id] }))
                  }
                  isPickup={fulfillmentMode === "pickupDelivery"}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <FiltersMapFab
        viewMode="list"
        bottom={Math.max(insets.bottom, 12) + 12}
        onFilters={() => setSheetPane("filters")}
        onMap={() => setSheetPane("map")}
        filtersLabel={s.filters}
        mapLabel={s.map}
        listLabel={s.list}
      />

      <ProviderFiltersSheet
        visible={sheetPane != null}
        pane={sheetPane ?? "filters"}
        value={appliedFilters}
        locationLabel={locationLabel}
        matchCount={matchCount}
        onClose={closeSheet}
        onApply={applyFilters}
        onChangeLocation={() => void resolveUserLocation()}
        mapData={mapData}
        onPartnerPress={handleMapPartnerPress}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  header: {
    paddingHorizontal: H_PAD,
    paddingTop: 6,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 12,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  headerAvatar: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  body: {
    flex: 1,
  },
  chipBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  chipScroll: {
    flex: 1,
  },
  chipRow: {
    gap: 6,
    alignItems: "center",
    paddingRight: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  chipSelected: {
    backgroundColor: UI.teal,
    borderColor: UI.teal,
  },
  chipText: {
    fontSize: 11,
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  addressWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  addressInput: {
    flex: 1,
    fontSize: 14,
    color: UI.text,
    paddingVertical: 0,
    fontFamily: "Poppins-Regular",
    ...Platform.select({
      web: {
        borderWidth: 0,
        outlineWidth: 0,
        backgroundColor: "transparent",
      },
    }),
  },
  pressed: { opacity: 0.82 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 96,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  centerBlock: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: {
    color: UI.muted,
    fontSize: 15,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryText: {
    color: UI.teal,
    fontSize: 15,
    fontWeight: "600",
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "rgba(17, 24, 39, 0.08)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImageWrap: {
    height: 118,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  cardBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    maxWidth: "72%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  offerBadge: {
    backgroundColor: "#FCE7F3",
  },
  topRatedBadge: {
    backgroundColor: "#D1FAE5",
  },
  cardBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  distancePill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: UI.distBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: "80%",
  },
  distancePillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
  },
  cardBody: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 4,
  },
  cardName: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  tagText: {
    fontSize: 11,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    marginTop: 4,
  },
  openPill: {
    backgroundColor: UI.openBg,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  openPillMuted: {
    backgroundColor: "#F3F4F6",
  },
  openPillClosed: {
    backgroundColor: "#FEE2E2",
  },
  openPillText: {
    fontSize: 10,
    color: UI.openText,
    fontFamily: "Poppins-SemiBold",
    flexShrink: 0,
  },
  openPillTextMuted: {
    color: UI.muted,
  },
  openPillTextClosed: {
    color: "#B91C1C",
  },
  fromPriceRow: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: "right",
  },
  fromLabel: {
    fontSize: 11,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  price: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: UI.price,
  },
});
