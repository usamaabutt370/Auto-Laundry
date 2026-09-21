import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  AppState,
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
import { GradientText } from "@/components/gradient-text";
import { GradientLoader } from "@/components/ui/gradient-loader";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { strings } from "@/constants/strings";
import {
  getPartnerPrimaryImage,
  type CustomerHomeMapData,
  type PartnerMapMarker,
} from "@/hooks/use-customer-home-map-data";
import { useHomeProfile } from "@/hooks/use-home-profile";
import {
  getPlaceLabelFromCoordinates,
  type Coordinates,
} from "@/utils/geocoding";
import { UI } from "@/constants/theme";

const SCREEN_PAD = 20;
const CARD_GAP = 10;

const DEAL_TONES = {
  teal: {
    accent: UI.mapGreen,
    badgeBg: UI.openBg,
    badgeText: UI.green,
  },
  purple: {
    accent: UI.purple,
    badgeBg: "#F5F3FF",
    badgeText: UI.purple,
  },
  pink: {
    accent: UI.dealPink,
    badgeBg: "#FDF2F8",
    badgeText: UI.dealPink,
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
export type HomeServiceId = "washAndFold" | "dryCleaning" | "press" | "tailoring";

type HomeStrings = typeof strings.customer.home;

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

function greetingForHour(hour: number, s: HomeStrings) {
  if (hour < 12) return s.greetingMorning;
  if (hour < 18) return s.greetingAfternoon;
  return s.greetingEvening;
}

function deviceHour() {
  return new Date().getHours();
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

function formatRatingAvg(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

const BADGES = [
  { key: "top" as const, bg: UI.badgeTopRated + "90" },
  { key: "fast" as const, bg: UI.badgeFast + "90" },
  { key: "trusted" as const, bg: UI.badgeTrusted + "90" },
];

type Props = {
  mapData: CustomerHomeMapData;
  fulfillmentFilter: FulfillmentFilter;
  bottomInset: number;
  onPressCategory: (service: HomeServiceId) => void;
  onPressPartner: (partner: PartnerMapMarker) => void;
  onSeeAll: () => void;
  onPressProfile: () => void;
};

export function CustomerHomeFeed({
  mapData,
  fulfillmentFilter,
  bottomInset,
  onPressCategory,
  onPressPartner,
  onSeeAll,
  onPressProfile,
}: Props) {
  const s = strings.customer.home;
  const { width: windowWidth } = useWindowDimensions();
  const categoryCardWidth = (windowWidth - SCREEN_PAD * 2 - CARD_GAP) / 2.2;
  const recCardWidth = categoryCardWidth;
  const nearbyCardWidth = (windowWidth - SCREEN_PAD * 2 - CARD_GAP) / 1.5;
  const { firstName, avatarUri, isLoggedIn } = useHomeProfile();
  const [locationLabel, setLocationLabel] = useState<string>(s.locationFallback);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [hour, setHour] = useState(deviceHour);

  const refreshGreetingHour = useCallback(() => {
    setHour(deviceHour());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshGreetingHour();
      const intervalId = setInterval(refreshGreetingHour, 60_000);
      return () => clearInterval(intervalId);
    }, [refreshGreetingHour]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshGreetingHour();
    });
    return () => sub.remove();
  }, [refreshGreetingHour]);

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

  const greeting = greetingForHour(hour, s);
  const greetingLine = firstName
    ? `${greeting} ${firstName}!`
    : `${greeting.replace(/[,\u060C]\s*$/, "")}!`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 20 }]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.greetingRow}>
              <GradientText
                colors={["#5a11f6", "#005aec", "#00a473"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.greeting}
                accessibilityLabel={greetingLine}
              >
                {greetingLine}
              </GradientText>
              <Text style={styles.greetingEmoji}> 👋</Text>
            </View>
            {/* <Pressable style={styles.locationRow} hitSlop={8}>
              <MaterialCommunityIcons name="map-marker" size={16} color={UI.purple} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLabel}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={UI.muted} />
            </Pressable> */}
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={onPressProfile}
              accessibilityRole="button"
              accessibilityLabel={s.profile}
            >
              {isLoggedIn ? (
                <AvatarImage
                  uri={avatarUri}
                  name={firstName}
                  size={32}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.guestAvatar}>
                  <MaterialCommunityIcons name="account" size={20} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{s.whatDoYouNeed}</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.hScroll}
          contentContainerStyle={styles.categoryList}
        >
          <CategoryCard
            title={s.categoryLaundry}
            subtitle={s.categoryLaundrySub}
            image={assets.onboarding.slide1}
            icon="tshirt-crew"
            accent={UI.blue}
            width={categoryCardWidth}
            onPress={() => onPressCategory("washAndFold")}
          />
          <CategoryCard
            title={s.categoryDryCleaning}
            subtitle={s.categoryDryCleaningSub}
            image={assets.images.home_deal_laundry}
            icon="hanger"
            accent="#0EA5E9"
            width={categoryCardWidth}
            onPress={() => onPressCategory("dryCleaning")}
          />
          <CategoryCard
            title={s.categoryIroning}
            subtitle={s.categoryIroningSub}
            image={assets.images.home_category_ironing}
            icon="iron"
            accent={UI.mapGreen}
            width={categoryCardWidth}
            onPress={() => onPressCategory("press")}
          />
          <CategoryCard
            title={s.categoryTailoring}
            subtitle={s.categoryTailoringSub}
            image={assets.images.home_category_tailoring}
            icon="scissors-cutting"
            accent={UI.purple}
            width={categoryCardWidth}
            onPress={() => onPressCategory("tailoring")}
          />

        </ScrollView>

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
          <GradientLoader style={styles.loader} />
        ) : recommended.length === 0 ? (
          <Text style={styles.empty}>{s.emptyRecommended}</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.nearbyList}
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
                  cardWidth={nearbyCardWidth}
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
            image={assets.images.home_deal_laundry}
            tone="teal"
            cardWidth={recCardWidth}
            onPress={() => onPressCategory("washAndFold")}
            strings={s}
          />
          <DealCard
            badge={s.dealIroning}
            pct={15}
            code="PRESS15"
            image={assets.images.home_deal_ironing}
            tone="purple"
            cardWidth={recCardWidth}
            onPress={() => onPressCategory("press")}
            strings={s}
          />
          <DealCard
            badge={s.dealTailoring}
            pct={10}
            code="STCH10"
            image={assets.images.home_deal_tailoring}
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
        <MaterialCommunityIcons name="arrow-right" size={16} color={UI.purple} />
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
  width,
  onPress,
}: {
  title: string;
  subtitle: string;
  image: number;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  accent: string;
  width: number;
  onPress: () => void;
}) {
  return (
    <View style={[styles.hCardShadowHost, { width }]} collapsable={false}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
      >
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
        </View>
      </Pressable>
    </View>
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
              size={15}
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
          <View style={styles.recMeta}>
            <MaterialCommunityIcons
              name="star"
              size={12}
              color={(partner.ratingCount ?? 0) > 0 ? UI.star : "#E5E7EB"}
            />
            <Text style={styles.recMetaMuted} numberOfLines={1}>
              {(partner.ratingCount ?? 0) > 0
                ? fill(s.ratingWithCount, {
                    avg: formatRatingAvg(partner.ratingAvg ?? 0),
                    count: partner.ratingCount ?? 0,
                  })
                : "—"}
              {" • "}
              {distanceLabel}
            </Text>
          </View>
          <View style={styles.tagRow}>
            <MaterialCommunityIcons name="tshirt-crew-outline" size={11} color={UI.blue} />
            <Text style={styles.tagText} numberOfLines={1}>
              {pickup ? s.tagWashFold : s.tagLaundry}
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
        <View style={styles.dealContent}>
        <Text style={styles.dealOff} numberOfLines={1}>
          {fill(s.dealOff, { pct })}
        </Text>
        <Text style={styles.dealSub} numberOfLines={1}>
          {s.dealFirstOrder}
        </Text>
        </View>
        <View style={styles.dealImageWrap}>
        <Image source={image} style={styles.dealImage}  />
        </View>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI.bg,
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
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerText: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  greeting: {
    fontSize: 18,
    lineHeight: 30,
    fontFamily: "Poppins-Bold",
  },
  greetingEmoji: {
    fontSize: 18,
    lineHeight: 30,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    color: UI.text,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  guestAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#128197",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 12,
  },
  sectionTitleNoMargin: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
    gap: 12,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAll: {
    color: UI.purple,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
  },
  categoryList: {
    gap: CARD_GAP,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 20,
  },
  categoryCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    overflow: "hidden",
  },
  categoryImageWrap: {
    height: 120,
    overflow: "hidden",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  categoryIcon: {
    position: "absolute",
    top: 110,
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
    paddingVertical: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  categorySub: {
    fontSize: 12,
    color: UI.text,
    fontFamily: "Poppins-Regular",
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
    backgroundColor: UI.border,
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
    backgroundColor: UI.green,
    alignItems: "center",
    justifyContent: "center",
  },
  trustCopy: {
    flex: 1,
    backgroundColor: "transparent",
  },
  trustTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  trustAccent: {
    color: UI.green,
  },
  trustBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: UI.muted,
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
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    paddingVertical: 12,
  },
  recommendedList: {
    gap: CARD_GAP,
    paddingHorizontal: 6,
  },
  nearbyList: {
    gap: CARD_GAP,
    paddingHorizontal: 6,
  },
  hCardShadowHost: {
    backgroundColor: UI.card,
    borderRadius: 18,
    ...CARD_SHADOW,
  },
  recCard: {
    backgroundColor: UI.card,
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
    top: 10,
    left: 10,
    maxWidth: "68%",
    paddingHorizontal:10,
    paddingVertical: 2,
    borderRadius: 50,
  },
  recBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
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
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  recMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  recMetaText: {
    fontSize: 10,
    color: UI.text,
    fontFamily: "Poppins-Regular",
  },
  recMetaMuted: {
    flex: 1,
    fontSize: 11,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tagText: {
    flex: 1,
    fontSize: 11,
    color: UI.text,
    fontFamily: "Poppins-Regular",
  },
  fromPriceRow: {
    marginTop: 1,
  },
  fromLabel: {
    fontSize: 11,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  price: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: UI.green,
  },
  dealCard: {
    backgroundColor: UI.card,
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
    fontSize:11,
    fontFamily: "Poppins-SemiBold",
  },
  dealContent: {
    flex: 1,
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  dealOff: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  dealSub: {
    fontSize: 11,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  dealImageWrap: {
    height: 80,
    overflow: "hidden",
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "green",
    alignContent: "center",
    justifyContent: "center",
  },
  dealImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
});
