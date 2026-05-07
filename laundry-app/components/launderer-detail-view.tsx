import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { Spacer } from "./spacer";
import { strings } from "@/constants/strings";
import type { LaundererServiceType } from "@/constants/launderers";
import { theme } from "@/constants/theme";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import {
  fetchPartnerDetail,
  serviceCategoriesToTypes,
} from "@/lib/partner-discovery";
import { AppHeader } from "@/components/app-header";

const c = theme.colors;

const PLACEHOLDER_RATING = 4.5;
const DISTANCE_PLACEHOLDER = "—";

const SERVICE_KEYS: LaundererServiceType[] = [
  "washAndFold",
  "dryCleaning",
  "tailoring",
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
  isModal = false,
}: LaundererDetailViewProps) {
  const s = strings.customer.laundererDetail;
  const sServices = strings.customer.pickupServices;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof fetchPartnerDetail>
  >["profile"]>(null);
  const [services, setServices] = useState<
    Awaited<ReturnType<typeof fetchPartnerDetail>>["services"]
  >([]);
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
    const { profile: p, services: rows, error: err } = await fetchPartnerDetail(
      partnerId
    );
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
        services.map((row) => row.category).filter(Boolean) as string[]
      ),
    [services]
  );

  const businessImageUris = useMemo(
    () =>
      Array.isArray(profile?.business_images)
        ? profile.business_images.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
        : [],
    [profile?.business_images]
  );
  const fallbackHeroUri = avatarUrlWithCacheBuster(profile?.image_url, profile?.updated_at);
  const carouselImages = useMemo(() => {
    if (businessImageUris.length > 0) return businessImageUris;
    if (fallbackHeroUri) return [fallbackHeroUri];
    return [];
  }, [businessImageUris, fallbackHeroUri]);
  const hasCarousel = carouselImages.length > 1;

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

  const hoursDetail =
    profile?.available_time?.trim() ||
    strings.customer.pickLaunderer.hoursPlaceholder;

  const renderHeader = () => (
    <SafeAreaView edges={["top"]}>
      <AppHeader
        title={profile?.business_name?.trim() || initialName || s.title}
        leftIcon="arrow-left"
        onLeftPress={onBack}
        leftAccessibilityLabel="Go back"
      />
    </SafeAreaView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>
            {error ?? "Launderer not found"}
          </Text>
          <Pressable onPress={load} style={styles.retryWrap}>
            <Text style={styles.retryText}>{strings.customer.pickLaunderer.retry}</Text>
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
        {carouselImages.length > 0 ? (
          <View
            style={styles.heroWrap}
            onLayout={(event) => setHeroWidth(event.nativeEvent.layout.width)}
          >
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
                  style={[styles.heroImage, heroWidth ? { width: heroWidth } : null]}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
            {hasCarousel ? (
              <>
                <Pressable
                  onPress={() => scrollToImage(activeImageIndex - 1)}
                  style={[styles.carouselArrow, styles.carouselArrowLeft]}
                  accessibilityRole="button"
                  accessibilityLabel="Previous business image"
                >
                  <MaterialCommunityIcons name="chevron-left" size={18} color={c.white} />
                </Pressable>
                <Pressable
                  onPress={() => scrollToImage(activeImageIndex + 1)}
                  style={[styles.carouselArrow, styles.carouselArrowRight]}
                  accessibilityRole="button"
                  accessibilityLabel="Next business image"
                >
                  <MaterialCommunityIcons name="chevron-right" size={18} color={c.white} />
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
        ) : (
          <Image
            source={assets.onboarding.slide2}
            style={styles.heroImage}
            contentFit="cover"
          />
        )}
        <Spacer.Column numberOfSpaces={2} />
        <View style={styles.infoBlock}>
          <View style={styles.ratingDistanceRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <MaterialCommunityIcons
                key={i}
                name="star"
                size={18}
                color="#EAB308"
              />
            ))}
            <Text style={styles.ratingText}>({PLACEHOLDER_RATING})</Text>
            <MaterialCommunityIcons
              name="compass-outline"
              size={18}
              color={c.white}
              style={styles.compassIcon}
              opacity={0.7}
            />
            <Text style={styles.distanceText}>{DISTANCE_PLACEHOLDER}</Text>
          </View>
          <Text style={styles.name}>{profile.business_name.trim()}</Text>
          {profile.business_description?.trim() ? (
            <Text style={styles.description}>{profile.business_description.trim()}</Text>
          ) : null}
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>{hoursDetail}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="phone"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>
              {profile.phone_number?.trim() || "—"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="home-outline"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>
              {profile.address?.trim() || "—"}
            </Text>
          </View>
          {profile.pickup_delivery_enabled &&
            profile.pickup_delivery_amount?.trim() ? (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="truck-delivery-outline"
                size={20}
                color={c.white}
                opacity={0.7}
              />
              <Text style={styles.detailText}>
                {`${strings.customer.partnerPickupLinePrefix} ${profile.pickup_delivery_amount.trim()}`}
              </Text>
            </View>
          ) : null}

          <View style={styles.servicesRow}>
            {SERVICE_KEYS.filter((k) => serviceTypes.includes(k)).map((key) => (
              <View key={key} style={styles.servicePill}>
                <Text style={styles.servicePillText}>{sServices[key]}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        <Pressable
          onPress={handleSelect}
          style={({ pressed }) => [styles.selectBtn, pressed && styles.pressed]}
        >
          <Text style={styles.selectLabel}>{s.select}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  pressed: { opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  heroImage: {
    height: 200,
    borderRadius: 16,
    resizeMode: "cover",
    backgroundColor: c.blue900,
  },
  heroWrap: {
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  carouselArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(35, 58, 80, 0.65)",
  },
  carouselArrowLeft: {
    left: 8,
  },
  carouselArrowRight: {
    right: 8,
  },
  carouselDots: {
    position: "absolute",
    bottom: 10,
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
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  carouselDotActive: {
    width: 16,
    backgroundColor: c.white,
  },
  infoBlock: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: c.blue900,
  },
  ratingDistanceRow: {
    gap: 6,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 16,
    color: c.white,
    fontWeight: "600",
  },
  compassIcon: { marginLeft: 12 },
  distanceText: {
    fontSize: 16,
    marginLeft: 4,
    color: c.white,
    opacity: 0.5,
  },
  name: {
    fontSize: 22,
    color: c.white,
    marginBottom: 8,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    color: c.white,
    opacity: 0.75,
    marginBottom: 12,
    lineHeight: 20,
  },
  detailRow: {
    gap: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    color: c.white,
    opacity: 0.7,
  },
  servicesRow: {
    gap: 10,
    marginTop: 20,
    flexWrap: "wrap",
    flexDirection: "row",
  },
  servicePill: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    borderColor: c.white,
    paddingHorizontal: 16,
  },
  servicePillText: {
    fontSize: 14,
    color: c.white,
    fontWeight: "600",
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: c.background,
  },
  selectBtn: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.backgroundLight,
  },
  selectLabel: {
    fontSize: 17,
    color: c.white,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    color: c.white,
    textAlign: "center",
  },
  retryWrap: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    color: c.lightBlue,
    fontSize: 15,
    fontWeight: "600",
  },
});
