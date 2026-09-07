import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { assets } from "@/assets/assets";
import { AvatarImage } from "@/components/avatar-image";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { StarRating } from "@/components/star-rating";
import { strings } from "@/constants/strings";
import { useAuth } from "@/contexts/auth-context";
import {
  getPartnerPrimaryImage,
  type CustomerHomeMapData,
  type PartnerMapMarker,
} from "@/hooks/use-customer-home-map-data";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { subscribeProfileAvatarUpdated } from "@/lib/profile-avatar-refresh";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  getPlaceLabelFromCoordinates,
  type Coordinates,
} from "@/utils/geocoding";

const SCREEN_PAD = 20;
const CARD_GAP = 10;

const HOME_UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  purple: "#5B4DFF",
  blue: "#2F6BFF",
  green: "#00A86B",
  mapGreen: "#12B886",
  filterPurple: "#4A3AFF",
  star: "#F5B301",
  badgeTopRated: "#0F766E",
  badgeFast: "#2563EB",
  badgeTrusted: "#6D28D9",
  trustBg: "#F3F4F6",
  border: "#ECEEF2",
  dealPink: "#E94B8C",
} as const;

const DEAL_TONES = {
  teal: {
    accent: HOME_UI.mapGreen,
    badgeBg: "#ECFDF5",
    badgeText: HOME_UI.green,
  },
  purple: {
    accent: HOME_UI.purple,
    badgeBg: "#F5F3FF",
    badgeText: HOME_UI.purple,
  },
  pink: {
    accent: HOME_UI.dealPink,
    badgeBg: "#FDF2F8",
    badgeText: HOME_UI.dealPink,
  },
} as const;

const CARD_SHADOW = {
  shadowColor: "#111827",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
} as const;

export type FulfillmentFilter = "all" | "dropoff" | "pickupDelivery";
export type HomeServiceId = "washAndFold" | "press" | "tailoring";

type HomeStrings = typeof strings.customer.home;

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

function greetingForHour(hour: number, s: HomeStrings) {
  if (hour < 12) return s.greetingMorning;
  if (hour < 17) return s.greetingAfternoon;
  return s.greetingEvening;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km: number) {
  if (km < 1) return Math.max(0.1, km).toFixed(1);
  return km.toFixed(1);
}

const BADGES = [
  { key: "top" as const, bg: HOME_UI.badgeTopRated },
  { key: "fast" as const, bg: HOME_UI.badgeFast },
  { key: "trusted" as const, bg: HOME_UI.badgeTrusted },
];

type Props = {
  mapData: CustomerHomeMapData;
  fulfillmentFilter: FulfillmentFilter;
  bottomInset: number;
  onPressCategory: (service: HomeServiceId) => void;
  onPressPartner: (partner: PartnerMapMarker) => void;
  onSeeAll: () => void;
  onPressNotifications: () => void;
  onPressProfile: () => void;
};

export function CustomerHomeFeed({
  mapData,
  fulfillmentFilter,
  bottomInset,
  onPressCategory,
  onPressPartner,
  onSeeAll,
  onPressNotifications,
  onPressProfile,
}: Props) {
  const s = strings.customer.home;
  const { width: windowWidth } = useWindowDimensions();
  const recCardWidth = (windowWidth - SCREEN_PAD * 2 - CARD_GAP * 2) / 3;
  const { firstName, avatarUri } = useHomeProfile(s.guestName);
  const [locationLabel, setLocationLabel] = useState(s.locationFallback);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const coords = mapData.userCoordinates;
    if (!coords) return;
    let cancelled = false;
    void getPlaceLabelFromCoordinates(coords).then((label) => {
      if (!cancelled && label) setLocationLabel(label);
    });
    return () => {
      cancelled = true;
    };
  }, [mapData.userCoordinates]);

  const recommended = useMemo(() => {
    const user = mapData.userCoordinates;
    const rows = mapData.partners
      .filter((partner) =>
        fulfillmentFilter === "all" ? true : partner.fulfillmentMode === fulfillmentFilter,
      )
      .map((partner) => {
        const coords = mapData.partnerCoordinates[partner.id];
        const km =
          user && coords ? distanceKm(user, coords) : Number.POSITIVE_INFINITY;
        return { partner, km };
      })
      .sort((a, b) => a.km - b.km)
      .slice(0, 8);
    return rows;
  }, [
    fulfillmentFilter,
    mapData.partnerCoordinates,
    mapData.partners,
    mapData.userCoordinates,
  ]);

  const hour = new Date().getHours();
  const greeting = greetingForHour(hour, s);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 88 }]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={1}>
              <Text style={styles.greetingLead}>{greeting} </Text>
              <Text style={styles.greetingName}>{firstName}! </Text>
              <Text>👋</Text>
            </Text>
            <Pressable style={styles.locationRow} hitSlop={8}>
              <MaterialCommunityIcons name="map-marker" size={16} color={HOME_UI.purple} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLabel}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={HOME_UI.muted} />
            </Pressable>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={onPressNotifications}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={s.notifications}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color={HOME_UI.text} />
              <View style={styles.notifDot} />
            </Pressable>
            <Pressable
              onPress={onPressProfile}
              accessibilityRole="button"
              accessibilityLabel={s.profile}
            >
              <AvatarImage
                uri={avatarUri}
                name={firstName}
                size={32}
                style={styles.avatar}
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{s.whatDoYouNeed}</Text>
        <View style={styles.categoryRow}>
          <CategoryCard
            title={s.categoryLaundry}
            subtitle={s.categoryLaundrySub}
            image={assets.onboarding.slide1}
            icon="tshirt-crew"
            accent={HOME_UI.blue}
            onPress={() => onPressCategory("washAndFold")}
          />
          <CategoryCard
            title={s.categoryIroning}
            subtitle={s.categoryIroningSub}
            image={assets.images.home_category_ironing}
            icon="iron"
            accent={HOME_UI.mapGreen}
            onPress={() => onPressCategory("press")}
          />
          <CategoryCard
            title={s.categoryTailoring}
            subtitle={s.categoryTailoringSub}
            image={assets.images.home_category_tailoring}
            icon="scissors-cutting"
            accent={HOME_UI.purple}
            onPress={() => onPressCategory("tailoring")}
          />
        </View>

        <View style={styles.trustCard}>
          <View style={styles.trustBadge}>
            <MaterialCommunityIcons name="shield-check" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.trustCopy}>
            <Text style={styles.trustTitle}>
              {s.trustTitleBefore}
              <Text style={styles.trustAccent}>{s.trustTitleAccent}</Text>
            </Text>
            <Text style={styles.trustBody}>{s.trustBody}</Text>
          </View>
          <Image
            source={assets.images.top_facilities}
            style={styles.trustImage}
            contentFit="cover"
          />
        </View>

        <SectionHeader title={s.recommended} actionLabel={s.seeAll} onAction={onSeeAll} />
        {mapData.loadingPartners ? (
          <ActivityIndicator style={styles.loader} color={HOME_UI.purple} />
        ) : recommended.length === 0 ? (
          <Text style={styles.empty}>{s.emptyRecommended}</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.recommendedList}
          >
            {recommended.map(({ partner, km }, index) => {
              const badge = BADGES[index % BADGES.length];
              const badgeLabel =
                badge.key === "top"
                  ? s.badgeTopRated
                  : badge.key === "fast"
                    ? s.badgeFastService
                    : s.badgeTrusted;
              return (
                <RecommendedCard
                  key={partner.id}
                  partner={partner}
                  cardWidth={recCardWidth}
                  distanceLabel={
                    Number.isFinite(km) ? fill(s.kmAway, { km: formatKm(km) }) : "—"
                  }
                  badgeLabel={badgeLabel}
                  badgeColor={badge.bg}
                  favorited={Boolean(favorites[partner.id])}
                  onToggleFavorite={() =>
                    setFavorites((prev) => ({ ...prev, [partner.id]: !prev[partner.id] }))
                  }
                  onPress={() => onPressPartner(partner)}
                  strings={s}
                />
              );
            })}
          </ScrollView>
        )}

        <SectionHeader title={s.deals} actionLabel={s.seeAll} onAction={onSeeAll} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.hScroll}
          contentContainerStyle={styles.recommendedList}
        >
          <DealCard
            badge={s.dealLaundry}
            pct={20}
            code="T2L20"
            image={assets.onboarding.slide1}
            tone='teal'
            cardWidth={recCardWidth}
            onPress={() => onPressCategory("washAndFold")}
            strings={s}
          />
          <DealCard
            badge={s.dealIroning}
            pct={15}
            code="PRESS15"
            image={assets.images.schedule_pickup}
            tone="purple"
            cardWidth={recCardWidth}
            onPress={() => onPressCategory("press")}
            strings={s}
          />
          <DealCard
            badge={s.dealTailoring}
            pct={10}
            code="STCH10"
            image={assets.onboarding.slide3}
            tone="pink"
            cardWidth={recCardWidth}
            onPress={() => onPressCategory("tailoring")}
            strings={s}
          />
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitleNoMargin}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={8} style={styles.seeAllBtn}>
        <Text style={styles.seeAll}>{actionLabel}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={HOME_UI.purple} />
      </Pressable>
    </View>
  );
}

function CategoryCard({
  title,
  subtitle,
  image,
  icon,
  accent,
  onPress,
}: {
  title: string;
  subtitle: string;
  image: number;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}>
      <View style={styles.categoryImageWrap}>
        <Image source={image} style={styles.categoryImage} contentFit="cover" />
      </View>
      <View style={[styles.categoryIcon, { backgroundColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={16} color="#FFFFFF" />
      </View>
      <View style={styles.categoryBody}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <Text style={styles.categorySub} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={[styles.categoryArrow, { backgroundColor: accent }]}>
          <MaterialCommunityIcons name="arrow-right" size={14} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

function RecommendedCard({
  partner,
  cardWidth,
  distanceLabel,
  badgeLabel,
  badgeColor,
  favorited,
  onToggleFavorite,
  onPress,
  strings: s,
}: {
  partner: PartnerMapMarker;
  cardWidth: number;
  distanceLabel: string;
  badgeLabel: string;
  badgeColor: string;
  favorited: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
  strings: HomeStrings;
}) {
  const image = getPartnerPrimaryImage(partner);
  const pickup = partner.fulfillmentMode === "pickupDelivery";

  return (
    <View style={[styles.hCardShadowHost, { width: cardWidth }]} collapsable={false}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.recCard, pressed && styles.pressed]}
      >
        <View style={styles.recImageWrap}>
          {image ? (
            <Image source={{ uri: image }} style={styles.recImage} contentFit="cover" />
          ) : (
            <Image source={assets.onboarding.slide2} style={styles.recImage} contentFit="cover" />
          )}
          <View style={[styles.recBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.recBadgeText} numberOfLines={1}>
              {badgeLabel}
            </Text>
          </View>
          <Pressable
            onPress={onToggleFavorite}
            style={styles.heartBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={favorited ? s.unfavorite : s.favorite}
          >
            <MaterialCommunityIcons
              name={favorited ? "heart" : "heart-outline"}
              size={12}
              color={favorited ? "#E11D48" : "#FFFFFF"}
            />
          </Pressable>
        </View>
        <View style={styles.recBody}>
          <PartnerNameWithBadge
            name={partner.business_name.trim()}
            verified
            nameStyle={styles.recName}
            badgeSize={10}
          />
          <StarRating value={(partner.ratingCount ?? 0) > 0 ? partner.ratingAvg : 0} size={11} />
          <Text style={styles.recMetaMuted} numberOfLines={1}>
            {distanceLabel}
          </Text>
          <View style={styles.tagRow}>
            <MaterialCommunityIcons name="tshirt-crew-outline" size={11} color={HOME_UI.blue} />
            <Text style={styles.tagText} numberOfLines={1}>
              {pickup ? s.tagWashFold : s.tagLaundry}
            </Text>
          </View>
          <Text style={styles.price} numberOfLines={1}>
            {s.seePrices}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function DealCard({
  badge,
  pct,
  code,
  image,
  tone,
  cardWidth,
  onPress,
  strings: s,
}: {
  badge: string;
  pct: number;
  code: string;
  image: number;
  tone: keyof typeof DEAL_TONES;
  cardWidth: number;
  onPress: () => void;
  strings: HomeStrings;
}) {
  const colors = DEAL_TONES[tone];

  return (
    <View style={[styles.hCardShadowHost, { width: cardWidth }]} collapsable={false}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.dealCard, pressed && styles.pressed]}
      >
        <View style={[styles.dealBadge, { backgroundColor: colors.badgeBg }]}>
          <Text style={[styles.dealBadgeText, { color: colors.badgeText }]} numberOfLines={1}>
            {badge}
          </Text>
        </View>
        <Text style={styles.dealOff} numberOfLines={1}>
          {fill(s.dealOff, { pct })}
        </Text>
        <Text style={styles.dealSub} numberOfLines={1}>
          {s.dealFirstOrder}
        </Text>
        <Image source={image} style={styles.dealImage} contentFit="cover" />
        <View style={styles.codeRow}>
          <View style={[styles.codeGift, { backgroundColor: colors.accent }]}>
            <MaterialCommunityIcons name="gift-outline" size={13} color="#FFFFFF" />
          </View>
          <View style={[styles.codeBox, { borderColor: colors.accent }]}>
            <Text style={[styles.codeText, { color: colors.accent }]} numberOfLines={1}>
              {s.dealUseCode} <Text style={styles.codeValue}>{code}</Text>
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export function HomeFiltersMapFab({
  viewMode,
  bottom,
  onFilters,
  onMap,
}: {
  viewMode: "feed" | "map";
  bottom: number;
  onFilters: () => void;
  onMap: () => void;
}) {
  const s = strings.customer.home;
  return (
    <View style={[styles.fabWrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.fab}>
        <Pressable
          onPress={onFilters}
          style={[styles.fabHalf, styles.fabFilters, viewMode === "feed" && styles.fabHalfActive]}
          accessibilityRole="button"
          accessibilityLabel={s.filters}
        >
          <MaterialCommunityIcons name="tune-variant" size={18} color="#FFFFFF" />
          <Text style={styles.fabLabel}>{s.filters}</Text>
        </Pressable>
        <View style={styles.fabDivider} />
        <Pressable
          onPress={onMap}
          style={[styles.fabHalf, styles.fabMap, viewMode === "map" && styles.fabHalfActive]}
          accessibilityRole="button"
          accessibilityLabel={s.map}
        >
          <MaterialCommunityIcons name="map-marker" size={18} color="#FFFFFF" />
          <Text style={styles.fabLabel}>{s.map}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function HomeFiltersSheet({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: FulfillmentFilter;
  onChange: (next: FulfillmentFilter) => void;
  onClose: () => void;
}) {
  const s = strings.customer.home;
  const options: { id: FulfillmentFilter; label: string }[] = [
    { id: "all", label: s.filterAll },
    { id: "pickupDelivery", label: s.pickUpDelivery },
    { id: "dropoff", label: s.dropOff },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{s.filterTitle}</Text>
          <Text style={styles.sheetHint}>{s.filterFulfillment}</Text>
          <View style={styles.sheetOptions}>
            {options.map((option) => {
              const selected = option.id === value;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onChange(option.id)}
                  style={[styles.sheetChip, selected && styles.sheetChipOn]}
                >
                  <Text style={[styles.sheetChipText, selected && styles.sheetChipTextOn]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={onClose} style={styles.sheetDone}>
            <Text style={styles.sheetDoneText}>{s.filterDone}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function metaAvatarUrl(user: { user_metadata?: Record<string, unknown> } | null | undefined) {
  const meta = user?.user_metadata ?? {};
  const raw = [meta.avatar_url, meta.picture, meta.image_url].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return raw?.trim();
}

function useHomeProfile(fallbackName: string) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(fallbackName);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(() => metaAvatarUrl(user));

  const load = useCallback(async () => {
    const metaFirst =
      (user?.user_metadata?.first_name as string | undefined)?.trim() ||
      (user?.user_metadata?.full_name as string | undefined)?.trim()?.split(/\s+/)[0];
    if (metaFirst) setFirstName(metaFirst);

    const metadataAvatar = metaAvatarUrl(user);
    if (metadataAvatar) setAvatarUri((current) => current ?? metadataAvatar);

    if (!isSupabaseConfigured() || !user?.id) return;
    const { data: sessionData } = await getSession();
    const currentUser = sessionData?.session?.user ?? user;
    if (!currentUser?.id || !supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name,first_name,image_url,updated_at")
      .eq("id", currentUser.id)
      .maybeSingle<{
        full_name: string | null;
        first_name: string | null;
        image_url: string | null;
        updated_at: string | null;
      }>();
    const resolved =
      (data?.first_name ?? "").trim() ||
      (data?.full_name ?? "").trim().split(/\s+/)[0] ||
      metaFirst ||
      fallbackName;
    setFirstName(resolved);
    setAvatarUri(
      avatarUrlWithCacheBuster(data?.image_url, data?.updated_at) ??
        metaAvatarUrl(currentUser) ??
        metadataAvatar,
    );
  }, [fallbackName, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    return subscribeProfileAvatarUpdated(() => {
      void load();
    });
  }, [load]);

  return { firstName, avatarUri };
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: HOME_UI.bg,
  },
  scroll: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 4,
    // backgroundColor: "green",
  },
  hScroll: {
    overflow: "visible",
    marginHorizontal: -6,
  },
  header: {
    // backgroundColor: "blue",
    flexDirection: "row",
    // alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    // gap: 12,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    lineHeight: 30,
    fontFamily: "Poppins-Bold",
  },
  greetingLead: {
    color: HOME_UI.purple,
  },
  greetingName: {
    color: HOME_UI.blue,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    color: HOME_UI.text,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    // backgroundColor: "red",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 21,
    backgroundColor: HOME_UI.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: HOME_UI.border,
  },
  notifDot: {
    position: "absolute",
    top: 0,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 4,
    backgroundColor: HOME_UI.purple,
  },
  avatar: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: HOME_UI.text,
    marginBottom: 12,
  },
  sectionTitleNoMargin: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: HOME_UI.text,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
    gap: 12,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAll: {
    color: HOME_UI.purple,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
  },
  categoryRow: {
    flexDirection: "row",
    gap: CARD_GAP,
    overflow: "visible",
    paddingBottom: 4,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: HOME_UI.card,
    borderRadius: 18,
    ...CARD_SHADOW,
  },
  categoryImageWrap: {
    height: 92,
    overflow: "hidden",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryIcon: {
    position: "absolute",
    top: 78,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  categoryBody: {
    paddingHorizontal: 10,
    paddingTop: 18,
    paddingBottom: 12,
    minHeight: 86,
  },
  categoryTitle: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: HOME_UI.text,
  },
  categorySub: {
    fontSize: 10,
    lineHeight: 14,
    color: HOME_UI.muted,
    fontFamily: "Poppins-Regular",
    marginTop: 2,
    paddingRight: 22,
  },
  categoryArrow: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trustCard: {
    marginTop: 18,
    backgroundColor: HOME_UI.trustBg,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  trustBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: HOME_UI.green,
    alignItems: "center",
    justifyContent: "center",
  },
  trustCopy: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: HOME_UI.text,
  },
  trustAccent: {
    color: HOME_UI.green,
  },
  trustBody: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: HOME_UI.muted,
    fontFamily: "Poppins-Regular",
  },
  trustImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  loader: {
    marginVertical: 24,
  },
  empty: {
    color: HOME_UI.muted,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    paddingVertical: 12,
  },
  recommendedList: {
    gap: CARD_GAP,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 18,
  },
  hCardShadowHost: {
    backgroundColor: HOME_UI.card,
    borderRadius: 18,
    ...CARD_SHADOW,
  },
  recCard: {
    backgroundColor: HOME_UI.card,
    borderRadius: 18,
    overflow: "hidden",
  },
  recImageWrap: {
    height: 92,
    overflow: "hidden",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  recImage: {
    width: "100%",
    height: "100%",
  },
  recBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    maxWidth: "68%",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  recBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontFamily: "Poppins-SemiBold",
  },
  heartBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  recBody: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 3,
  },
  recName: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: HOME_UI.text,
  },
  recMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  recMetaText: {
    fontSize: 10,
    color: HOME_UI.text,
    fontFamily: "Poppins-Regular",
  },
  recMetaMuted: {
    fontSize: 9,
    color: HOME_UI.muted,
    fontFamily: "Poppins-Regular",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tagText: {
    flex: 1,
    fontSize: 9,
    color: HOME_UI.muted,
    fontFamily: "Poppins-Regular",
  },
  price: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: HOME_UI.green,
    marginTop: 1,
  },
  dealCard: {
    backgroundColor: HOME_UI.card,
    borderRadius: 18,
    padding: 8,
    overflow: "hidden",
  },
  dealBadge: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dealBadgeText: {
    fontSize: 8,
    fontFamily: "Poppins-SemiBold",
  },
  dealOff: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: HOME_UI.text,
  },
  dealSub: {
    fontSize: 9,
    color: HOME_UI.muted,
    fontFamily: "Poppins-Regular",
  },
  dealImage: {
    width: "100%",
    height: 64,
    borderRadius: 10,
    marginTop: 8,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  codeGift: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBox: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
  },
  codeText: {
    fontSize: 8,
    fontFamily: "Poppins-Regular",
  },
  codeValue: {
    fontFamily: "Poppins-Bold",
  },
  pressed: {
    opacity: 0.88,
  },
  fabWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  fab: {
    flexDirection: "row",
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "rgba(17, 24, 39, 0.25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  fabHalf: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 22,
  },
  fabHalfActive: {
    opacity: 1,
  },
  fabFilters: {
    backgroundColor: HOME_UI.filterPurple,
  },
  fabMap: {
    backgroundColor: HOME_UI.mapGreen,
  },
  fabDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  fabLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: HOME_UI.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: HOME_UI.text,
  },
  sheetHint: {
    marginTop: 6,
    marginBottom: 16,
    color: HOME_UI.muted,
    fontFamily: "Poppins-Regular",
  },
  sheetOptions: {
    gap: 10,
  },
  sheetChip: {
    borderWidth: 1,
    borderColor: HOME_UI.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: HOME_UI.bg,
  },
  sheetChipOn: {
    borderColor: HOME_UI.purple,
    backgroundColor: "#EEF2FF",
  },
  sheetChipText: {
    fontFamily: "Poppins-SemiBold",
    color: HOME_UI.text,
    fontSize: 15,
  },
  sheetChipTextOn: {
    color: HOME_UI.purple,
  },
  sheetDone: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: HOME_UI.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDoneText: {
    color: "#FFFFFF",
    fontFamily: "Poppins-Bold",
    fontSize: 16,
  },
});
