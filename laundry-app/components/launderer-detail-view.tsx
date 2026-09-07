import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import type { LaundererServiceType } from "@/constants/launderers";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import {
  fetchPartnerDetail,
  serviceCategoriesToTypes,
} from "@/lib/partner-discovery";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import { StarRating } from "@/components/star-rating";
import { getPartnerOpenStatus } from "@/utils/partner-hours";
import { partnerHasActiveOffer } from "@/utils/partner-offers";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  purple: "#2C1B6E",
  star: "#F5B301",
  backBg: "#EEF2F6",
  iconWell: "#F3F4F6",
  openBg: "#ECFDF5",
  openText: "#047857",
  chipBorder: "#E5E7EB",
  shadow: "rgba(17, 24, 39, 0.08)",
};

const HERO_IMAGE_HEIGHT_MOBILE = 220;
const HERO_IMAGE_HEIGHT_WEB = 450;
const VERIFIED_BADGE = "#12B886";

const SERVICE_KEYS: LaundererServiceType[] = [
  "washAndFold",
  "dryCleaning",
  "tailoring",
  "press",
];

interface LaundererDetailViewProps {
  partnerId: string;
  initialName?: string;
  onBack: () => void;
  onSelect: (partnerId: string, businessName: string | null) => void;
  isModal?: boolean;
}

export function LaundererDetailView({
  partnerId,
  initialName,
  onBack,
  onSelect,
}: LaundererDetailViewProps) {
  const s = strings.customer.laundererDetail;
  const sList = strings.customer.pickLaunderer;
  const sServices = strings.customer.pickupServices;
  const { isWeb } = useResponsiveLayout();
  const heroImageHeight = isWeb ? HERO_IMAGE_HEIGHT_WEB : HERO_IMAGE_HEIGHT_MOBILE;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof fetchPartnerDetail>
  >["profile"]>(null);
  const [services, setServices] = useState<
    Awaited<ReturnType<typeof fetchPartnerDetail>>["services"]
  >([]);
  const partnerVerified = usePartnerVerified(partnerId);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [heroWidth, setHeroWidth] = useState(0);
  const heroScrollRef = useRef<ScrollView | null>(null);

  const load = useCallback(async () => {
    if (!partnerId) {
      setLoading(false);
      setProfile(null);
      setServices([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { profile: p, services: rows, error: err } = await fetchPartnerDetail(partnerId);
    if (err) setError(err);
    setProfile(p);
    setServices(rows);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const serviceTypes = useMemo(
    () =>
      serviceCategoriesToTypes(
        services.map((row) => row.category).filter(Boolean) as string[],
      ),
    [services],
  );

  const businessImageUris = useMemo(
    () =>
      Array.isArray(profile?.business_images)
        ? profile.business_images.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          )
        : [],
    [profile?.business_images],
  );
  const fallbackHeroUri = avatarUrlWithCacheBuster(profile?.image_url, profile?.updated_at);
  const carouselImages = useMemo(() => {
    if (businessImageUris.length > 0) return businessImageUris;
    if (fallbackHeroUri) return [fallbackHeroUri];
    return [];
  }, [businessImageUris, fallbackHeroUri]);
  const hasCarousel = carouselImages.length > 1;
  const displayName = profile?.business_name?.trim() || initialName || s.title;
  const hoursDetail = profile?.available_time?.trim() || sList.hoursPlaceholder;
  const openStatus = getPartnerOpenStatus(profile?.available_time);
  const openLabel =
    openStatus === "open" ? sList.openNow : openStatus === "closed" ? sList.closed : sList.hoursUnknown;
  const phone = profile?.phone_number?.trim() ?? "";
  const hasOffer = partnerHasActiveOffer(profile?.offerPercent);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [profile?.id]);

  const handleSelect = () => {
    if (partnerId) {
      onSelect(partnerId, profile?.business_name?.trim() || initialName || null);
    }
  };

  const handleHeroScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    const clampedIndex = Math.max(0, Math.min(carouselImages.length - 1, nextIndex));
    setActiveImageIndex(clampedIndex);
  };

  const scrollToImage = (index: number) => {
    if (!heroWidth || !heroScrollRef.current) return;
    const nextIndex = Math.max(0, Math.min(carouselImages.length - 1, index));
    heroScrollRef.current.scrollTo({ x: nextIndex * heroWidth, animated: true });
    setActiveImageIndex(nextIndex);
  };

  const renderHeader = () => (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={UI.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <PartnerNameWithBadge
            name={displayName}
            verified={partnerVerified}
            nameStyle={styles.headerTitle}
            badgeSize={14}
            badgeColor={VERIFIED_BADGE}
          />
        </View>
        <View style={styles.headerSpacer} />
      </View>
    </SafeAreaView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator color={UI.teal} size="small" />
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>{error ?? "Launderer not found"}</Text>
          <Pressable onPress={load} style={styles.retryWrap}>
            <Text style={styles.retryText}>{sList.retry}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View
            style={styles.heroWrap}
            onLayout={(event) => setHeroWidth(event.nativeEvent.layout.width)}
          >
            {carouselImages.length > 0 ? (
              <ScrollView
                ref={heroScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleHeroScrollEnd}
              >
                {carouselImages.map((uri, index) => (
                  <Image
                    key={`${uri}-${index}`}
                    source={{ uri }}
                    style={[
                      styles.heroImage,
                      { height: heroImageHeight },
                      heroWidth ? { width: heroWidth } : null,
                    ]}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            ) : (
              <Image
                source={assets.onboarding.slide2}
                style={[styles.heroImage, { height: heroImageHeight }]}
                contentFit="cover"
              />
            )}
            <View
              style={[
                styles.openBadge,
                openStatus === "closed" && styles.openBadgeClosed,
                openStatus === "unknown" && styles.openBadgeMuted,
              ]}
            >
              <Text
                style={[
                  styles.openBadgeText,
                  openStatus === "closed" && styles.openBadgeTextClosed,
                  openStatus === "unknown" && styles.openBadgeTextMuted,
                ]}
              >
                {openLabel}
              </Text>
            </View>
            {hasOffer ? (
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>
                  {sList.percentOff.replace("{pct}", String(profile.offerPercent ?? 0))}
                </Text>
              </View>
            ) : null}
            {hasCarousel ? (
              <>
                <Pressable
                  onPress={() => scrollToImage(activeImageIndex - 1)}
                  style={[styles.carouselArrow, styles.carouselArrowLeft]}
                  accessibilityRole="button"
                  accessibilityLabel="Previous business image"
                >
                  <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => scrollToImage(activeImageIndex + 1)}
                  style={[styles.carouselArrow, styles.carouselArrowRight]}
                  accessibilityRole="button"
                  accessibilityLabel="Next business image"
                >
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
                </Pressable>
                <View style={styles.carouselDots}>
                  {carouselImages.map((_, index) => (
                    <View
                      key={`dot-${index}`}
                      style={[
                        styles.carouselDot,
                        index === activeImageIndex && styles.carouselDotActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.infoBlock}>
            <PartnerNameWithBadge
              name={profile.business_name.trim()}
              verified={partnerVerified}
              nameStyle={styles.name}
              containerStyle={styles.nameRow}
              numberOfLines={2}
              badgeSize={16}
              badgeColor={VERIFIED_BADGE}
            />
            <View style={styles.ratingWrap}>
              <StarRating
                value={(profile.ratingCount ?? 0) > 0 ? profile.ratingAvg : 0}
                size={18}
              />
            </View>
            {profile.business_description?.trim() ? (
              <Text style={styles.description}>{profile.business_description.trim()}</Text>
            ) : null}

            <View style={styles.detailsCard}>
              {(
                [
                  { icon: "clock-outline" as const, text: hoursDetail },
                  {
                    icon: "phone-outline" as const,
                    text: phone || "—",
                    onPress: phone
                      ? () => {
                          void Linking.openURL(`tel:${phone}`);
                        }
                      : undefined,
                  },
                  { icon: "map-marker-outline" as const, text: profile.address?.trim() || "—" },
                  ...(profile.pickup_delivery_enabled && profile.pickup_delivery_amount?.trim()
                    ? [
                        {
                          icon: "truck-delivery-outline" as const,
                          text: `${strings.customer.partnerPickupLinePrefix} ${profile.pickup_delivery_amount.trim()}`,
                        },
                      ]
                    : []),
                ] as {
                  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
                  text: string;
                  onPress?: () => void;
                }[]
              ).map((row, index, rows) => (
                <DetailRow
                  key={`${row.icon}-${index}`}
                  icon={row.icon}
                  text={row.text}
                  onPress={row.onPress}
                  last={index === rows.length - 1}
                />
              ))}
            </View>

            {SERVICE_KEYS.some((key) => serviceTypes.includes(key)) ? (
              <View style={styles.servicesRow}>
                {SERVICE_KEYS.filter((key) => serviceTypes.includes(key)).map((key) => (
                  <View key={key} style={styles.servicePill}>
                    <Text style={styles.servicePillText}>{sServices[key]}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        <Pressable
          onPress={handleSelect}
          style={({ pressed }) => [styles.selectWrap, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={["#4A3AFF", "#12B886"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.selectBtn}
          >
            <Text style={styles.selectLabel}>{s.select}</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function DetailRow({
  icon,
  text,
  onPress,
  last = false,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  text: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <>
      <View style={styles.iconWell}>
        <MaterialCommunityIcons name={icon} size={18} color={UI.purple} />
      </View>
      <Text style={styles.detailText}>{text}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.detailRow, last && styles.detailRowLast, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.detailRow, last && styles.detailRowLast]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  headerSafe: {
    backgroundColor: UI.bg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontSize: 17,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
  pressed: { opacity: 0.85 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  heroWrap: {
    position: "relative",
    backgroundColor: UI.iconWell,
  },
  heroImage: {
    width: "100%",
    backgroundColor: UI.iconWell,
  },
  openBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: UI.openBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  openBadgeMuted: {
    backgroundColor: "rgba(17, 24, 39, 0.55)",
  },
  openBadgeClosed: {
    backgroundColor: "#FEE2E2",
  },
  openBadgeText: {
    fontSize: 11,
    color: UI.openText,
    fontFamily: "Poppins-SemiBold",
  },
  openBadgeTextMuted: {
    color: "#FFFFFF",
  },
  openBadgeTextClosed: {
    color: "#B91C1C",
  },
  offerBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FCE7F3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerBadgeText: {
    fontSize: 11,
    color: "#BE185D",
    fontFamily: "Poppins-SemiBold",
  },
  carouselArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  carouselArrowLeft: {
    left: 10,
  },
  carouselArrowRight: {
    right: 10,
  },
  carouselDots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  carouselDotActive: {
    width: 16,
    backgroundColor: "#FFFFFF",
  },
  infoBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  nameRow: {
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    color: UI.text,
    fontFamily: "Poppins-Bold",
  },
  ratingWrap: {
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
    marginBottom: 14,
  },
  detailsCard: {
    backgroundColor: UI.bg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  iconWell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: UI.text,
    fontFamily: "Poppins-Regular",
  },
  servicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  servicePill: {
    backgroundColor: UI.openBg,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  servicePillText: {
    fontSize: 12,
    color: UI.openText,
    fontFamily: "Poppins-SemiBold",
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: UI.bg,
  },
  selectWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  selectBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "Poppins-Bold",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  retryWrap: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    color: UI.teal,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
});
