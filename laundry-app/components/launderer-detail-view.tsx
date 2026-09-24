import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { OrderSelectionSummary } from "@/components/order-selection-summary";
import { AppCtaButton } from "@/components/ui/cta-button";
import { GradientLoader } from "@/components/ui/gradient-loader";
import { StarRating } from "@/components/star-rating";
import { assets } from "@/assets/assets";
import type { LaundererServiceType } from "@/constants/launderers";
import { useAuth } from "@/contexts/auth-context";
import {
  orderDraftHasItems,
  quantitiesHaveItems,
  useCustomerOrderDraft,
} from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { findLatestCustomerOrderIdWithPartner } from "@/lib/customer-orders";
import {
  fetchPartnerDetail,
  fetchPartnerPublicReviews,
  partnerOffersPickupDelivery,
  serviceCategoriesToTypes,
  type PartnerPublicReview,
} from "@/lib/partner-discovery";
import { isProviderSaved, toggleSavedProvider } from "@/lib/saved-providers";
import {
  offeredJobsFromTypes,
  primaryServiceForJob,
  resolveActiveJob,
  type ServiceJob,
} from "@/lib/service-jobs";
import { getStrings } from "@/locales";
import { getDeviceCoordinates } from "@/utils/device-location";
import type { Coordinates } from "@/utils/geocoding";
import { getPartnerHoursRange, getPartnerOpenStatus } from "@/utils/partner-hours";
import { partnerHasActiveOffer } from "@/utils/partner-offers";
import { UI } from "@/constants/theme";

type DetailTab = "about" | "photos" | "reviews";
type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
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

function formatReviewDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface LaundererDetailViewProps {
  partnerId: string;
  initialName?: string;
  intentService?: string;
  onBack: () => void;
  onSelect: (
    partnerId: string,
    businessName: string | null,
    options?: { service?: LaundererServiceType; job?: ServiceJob; itemLabel?: string },
  ) => void;
  isModal?: boolean;
  prefersPickupDelivery?: boolean;
  /** Scroll to "How should we collect it?" (e.g. from order review Change). */
  scrollToCollect?: boolean;
  /** From order review: close (X) on the right, no share/favorite. */
  modalChrome?: boolean;
}

export function LaundererDetailView({
  partnerId,
  initialName,
  intentService,
  onBack,
  onSelect,
  prefersPickupDelivery = false,
  scrollToCollect = false,
  modalChrome = false,
}: LaundererDetailViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.laundererDetail;
  const sHome = getStrings(locale).customer.home;
  const sBook = getStrings(locale).customer.bookService;
  const JOB_GRID_GAP = 10;
  const { isWeb, isNarrow } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const footerBottomPad = Math.max(insets.bottom, 16);
  const heroHeight = isWeb ? 420 : Math.round(windowWidth * 0.72);
  /** Measured grid width keeps a true 2-col layout when sheet ≠ window width. */
  const [jobGridWidth, setJobGridWidth] = useState(0);
  const jobCardWidth = useMemo(() => {
    const gap = JOB_GRID_GAP;
    const available =
      jobGridWidth > 0 ? jobGridWidth : Math.max(0, windowWidth - 40);
    return Math.max(120, Math.floor((available - gap) / 2));
  }, [jobGridWidth, windowWidth]);
  const jobImageHeight = isNarrow ? 52 : 64;

  const jobMeta: Record<
    ServiceJob,
    { title: string; subtitle: string; icon: IconName; accent: string; image: number }
  > = {
    washAndFold: {
      title: sHome.categoryLaundry,
      subtitle: sHome.categoryLaundrySub,
      icon: "tshirt-crew",
      accent: "#2563EB",
      image: assets.onboarding.slide1,
    },
    dryCleaning: {
      title: sHome.categoryDryCleaning,
      subtitle: sHome.categoryDryCleaningSub,
      icon: "hanger",
      accent: "#0EA5E9",
      image: assets.images.home_deal_laundry,
    },
    ironing: {
      title: sHome.categoryIroning,
      subtitle: sHome.categoryIroningSub,
      icon: "iron",
      accent: UI.teal,
      image: assets.images.home_category_ironing,
    },
    tailoring: {
      title: sHome.categoryTailoring,
      subtitle: sHome.categoryTailoringSub,
      icon: "scissors-cutting",
      accent: "#7C3AED",
      image: assets.images.home_category_tailoring,
    },
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchPartnerDetail>>["profile"]>(
    null,
  );
  const [services, setServices] = useState<
    Awaited<ReturnType<typeof fetchPartnerDetail>>["services"]
  >([]);
  const [reviews, setReviews] = useState<PartnerPublicReview[]>([]);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [tab, setTab] = useState<DetailTab>("about");
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [heroWidth, setHeroWidth] = useState(windowWidth);
  const [jobOverride, setJobOverride] = useState<ServiceJob | null>(null);
  const [headerSolid, setHeaderSolid] = useState(false);
  const heroScrollRef = useRef<ScrollView | null>(null);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const sheetOffsetYRef = useRef(0);
  const didScrollToCollectRef = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const partnerVerified = usePartnerVerified(partnerId);
  const { draft, setPickupDeliveryRequested } = useCustomerOrderDraft();
  const { loading: estimateLoading, estimate } = usePartnerOrderEstimate(partnerId, draft);
  const fulfillmentTouchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!partnerId) {
      setLoading(false);
      setProfile(null);
      setServices([]);
      return;
    }
    setLoading(true);
    setError(null);
    const [{ profile: p, services: rows, error: err }, reviewRows, saved] = await Promise.all([
      fetchPartnerDetail(partnerId),
      fetchPartnerPublicReviews(partnerId),
      isProviderSaved(partnerId),
    ]);
    if (err) setError(err);
    setProfile(p);
    setServices(rows);
    setReviews(reviewRows);
    setFavorited(saved);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void getDeviceCoordinates().then((coords) => {
      if (!cancelled) setUserCoords(coords);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setActiveImageIndex(0);
    setAboutExpanded(false);
    setTab("about");
    setJobOverride(null);
  }, [profile?.id, intentService]);

  const serviceTypes = useMemo(
    () =>
      serviceCategoriesToTypes(
        services.map((row) => row.category),
        services.map((row) => row.price_display),
      ),
    [services],
  );

  const offeredJobs = useMemo(() => offeredJobsFromTypes(serviceTypes), [serviceTypes]);
  const activeJob = jobOverride ?? resolveActiveJob(serviceTypes, intentService);

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

  const displayName = profile?.business_name?.trim() || initialName || s.title;
  const hours = getPartnerHoursRange(profile?.available_time);
  const openStatus = getPartnerOpenStatus(profile?.available_time);
  const hasPickup = partnerOffersPickupDelivery(profile);
  const jobHasItems = (job: ServiceJob) => {
    if (job === "washAndFold") return quantitiesHaveItems(draft.washFold?.itemizedQuantities);
    if (job === "dryCleaning") return quantitiesHaveItems(draft.dryClean?.itemizedQuantities);
    if (job === "ironing") return quantitiesHaveItems(draft.press?.itemizedQuantities);
    return quantitiesHaveItems(draft.tailoring?.itemizedQuantities);
  };
  const hasOffer = partnerHasActiveOffer(profile?.offerPercent);
  const aboutText = profile?.business_description?.trim() ?? "";
  const address = profile?.address?.trim() || "—";
  const partnerCoords =
    profile && Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude)
      ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) }
      : null;
  const km =
    userCoords && partnerCoords ? distanceKm(userCoords, partnerCoords) : null;
  const distanceLabel =
    km != null && Number.isFinite(km) ? fill(s.kmAway, { km: formatKm(km) }) : null;

  const ratingAvg = profile?.ratingAvg ?? null;
  const ratingCount = profile?.ratingCount ?? 0;
  const ratingLabel =
    ratingCount > 0 && ratingAvg != null
      ? formatRatingAvg(ratingAvg)
      : null;
  const reviewsLabel =
    ratingCount === 1
      ? s.reviewsCountOne
      : ratingCount > 1
        ? fill(s.reviewsCount, { count: ratingCount })
        : s.noReviewsYet;

  const openLabel =
    openStatus === "open" ? s.openNow : openStatus === "closed" ? s.closed : s.hoursUnknown;
  const hoursHint =
    openStatus === "open" && hours
      ? fill(s.closesAt, { time: hours.endLabel })
      : openStatus === "closed" && hours
        ? fill(s.opensAt, { time: hours.startLabel })
        : hours?.rangeLabel ?? null;

  const handleHeroScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(Math.max(0, Math.min(carouselImages.length - 1, nextIndex)));
  };

  const handleSelect = (job: ServiceJob = activeJob) => {
    if (!partnerId) return;
    setJobOverride(job);
    onSelect(partnerId, profile?.business_name?.trim() || initialName || null, {
      service: primaryServiceForJob(job, serviceTypes),
      job,
    });
  };

  const handleShare = async () => {
    const message = fill(s.shareMessage, { name: displayName, address });
    try {
      await Share.share({ message, title: displayName });
    } catch {
      showAppAlert(displayName, s.shareError);
    }
  };

  const handleFavorite = async () => {
    const next = await toggleSavedProvider(partnerId);
    setFavorited(next);
  };

  const handleDirections = async () => {
    const dest =
      partnerCoords != null
        ? `${partnerCoords.latitude},${partnerCoords.longitude}`
        : address;
    if (!dest || dest === "—") {
      showAppAlert(s.location, s.directionsError);
      return;
    }
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${encodeURIComponent(dest)}`
        : Platform.OS === "android"
          ? `geo:0,0?q=${encodeURIComponent(dest)}`
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    try {
      await Linking.openURL(url);
    } catch {
      showAppAlert(s.location, s.directionsError);
    }
  };

  const handleChat = async () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    const orderId = await findLatestCustomerOrderIdWithPartner(user.id, partnerId);
    if (orderId) {
      router.push({ pathname: "/(customer)/chat/[orderId]", params: { orderId } });
      return;
    }
    showAppAlert(s.chatNeedsBookingTitle, s.chatNeedsBookingMessage, [
      { text: s.bookService, onPress: () => handleSelect() },
    ]);
  };

  useEffect(() => {
    if (!profile) return;
    if (!hasPickup) {
      setPickupDeliveryRequested(false);
      return;
    }
    if (fulfillmentTouchedRef.current) return;
    if (prefersPickupDelivery) setPickupDeliveryRequested(true);
  }, [hasPickup, prefersPickupDelivery, profile, setPickupDeliveryRequested]);

  useEffect(() => {
    didScrollToCollectRef.current = false;
  }, [partnerId, scrollToCollect]);

  const scrollToCollectSection = useCallback((yInSheet: number) => {
    if (!scrollToCollect || didScrollToCollectRef.current) return;
    const y = Math.max(0, sheetOffsetYRef.current + yInSheet - 16);
    didScrollToCollectRef.current = true;
    requestAnimationFrame(() => {
      mainScrollRef.current?.scrollTo({ y, animated: true });
    });
  }, [scrollToCollect]);

  const pickupEnabled = hasPickup && draft.pickupDeliveryRequested;
  const hasPickupSchedule = Boolean(
    draft.pickup?.dateIso &&
      draft.pickup?.timeSlotLabel &&
      draft.delivery?.dateIso &&
      draft.delivery?.timeSlotLabel,
  );
  const pickupScheduleSummary = useMemo(() => {
    if (!hasPickupSchedule || !draft.pickup || !draft.delivery) return null;
    const pickupDay = draft.pickup.dayLabel || draft.pickup.dateIso;
    const deliveryDay = draft.delivery.dayLabel || draft.delivery.dateIso;
    return [
      fill(s.schedulePickupLine, {
        day: pickupDay,
        time: draft.pickup.timeSlotLabel,
      }),
      fill(s.scheduleDeliveryLine, {
        day: deliveryDay,
        time: draft.delivery.timeSlotLabel,
      }),
    ].join("\n");
  }, [draft.delivery, draft.pickup, hasPickupSchedule, s.scheduleDeliveryLine, s.schedulePickupLine]);

  const openPickupSchedule = () => {
    router.push("/(customer)/schedule-pickup");
  };

  const handleContinueOrder = () => {
    if (!orderDraftHasItems(draft)) {
      showAppAlert(s.continueOrder, s.needItemsToContinue);
      return;
    }
    if (pickupEnabled && !hasPickupSchedule) {
      showAppAlert(s.continueOrder, s.needScheduleToContinue);
      return;
    }
    router.push("/(customer)/order-summary");
  };

  const headerFadeEnd = Math.max(72, Math.round(heroHeight * 0.32));
  const headerOpacity = scrollY.interpolate({
    inputRange: [16, headerFadeEnd],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const onMainScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const next = event.nativeEvent.contentOffset.y >= headerFadeEnd - 8;
        setHeaderSolid((prev) => (prev === next ? prev : next));
      },
    },
  );

  const headerTopPad = modalChrome ? 10 : insets.top;
  const heroChromeTopPad = modalChrome ? 10 : insets.top + 8;

  const headerIcons = (btnStyle: object) =>
    modalChrome ? (
      <>
        <View style={styles.heroChromeSide} />
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [btnStyle, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <MaterialCommunityIcons name="close" size={20} color={UI.text} />
        </Pressable>
      </>
    ) : (
      <>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [btnStyle, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={UI.text} />
        </Pressable>
        <View style={styles.heroChromeRight}>
          <Pressable
            onPress={() => void handleShare()}
            style={({ pressed }) => [btnStyle, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={s.share}
          >
            <MaterialCommunityIcons name="export-variant" size={20} color={UI.text} />
          </Pressable>
          <Pressable
            onPress={() => void handleFavorite()}
            style={({ pressed }) => [btnStyle, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={favorited ? s.unfavorite : s.favorite}
          >
            <MaterialCommunityIcons
              name={favorited ? "heart" : "heart-outline"}
              size={20}
              color={favorited ? "#E11D48" : UI.text}
            />
          </Pressable>
        </View>
      </>
    );

  const renderHeroChrome = () => (
    <View pointerEvents="box-none" style={[styles.heroChrome, { paddingTop: heroChromeTopPad }]}>
      {headerIcons(styles.heroRoundBtn)}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        {renderHeroChrome()}
        <View style={styles.centered}>
          <GradientLoader size="small" />
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        {renderHeroChrome()}
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>{error ?? "Launderer not found"}</Text>
          <Pressable onPress={load} style={styles.retryWrap}>
            <Text style={styles.retryText}>{getStrings(locale).customer.pickLaunderer.retry}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "about", label: s.tabAbout },
    { id: "photos", label: s.tabPhotos },
    { id: "reviews", label: s.tabReviews },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style={headerSolid ? "dark" : "light"} />
      <Animated.ScrollView
        ref={mainScrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        onScroll={onMainScroll}
        scrollEventThrottle={16}
      >
        <View
          style={[styles.heroWrap, { height: heroHeight }]}
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
                  style={{ width: heroWidth || windowWidth, height: heroHeight }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <Image
              source={assets.onboarding.slide2}
              style={{ width: "100%", height: heroHeight }}
              contentFit="cover"
            />
          )}
          {carouselImages.length > 0 ? (
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>
                {fill(s.photoCount, {
                  current: activeImageIndex + 1,
                  total: Math.max(carouselImages.length, 1),
                })}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={styles.sheet}
          onLayout={(event) => {
            sheetOffsetYRef.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.identityRow}>
            <View
              style={[
                styles.avatarWell,
                isNarrow && { width: 56, height: 56, borderRadius: 28 },
              ]}
            >
              <LinearGradient
                colors={["#A78BFA", "#6366F1"]}
                style={[
                  styles.avatarInner,
                  isNarrow && { width: 46, height: 46, borderRadius: 23 },
                ]}
              >
                <MaterialCommunityIcons
                  name="washing-machine"
                  size={isNarrow ? 22 : 28}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={2}>
                {displayName}
              </Text>
              {partnerVerified ? (
                <View style={styles.verifiedRow}>
                  <MaterialCommunityIcons name="check-decagram" size={14} color={UI.teal} />
                  <Text style={styles.verifiedText}>{s.verifiedPartner}</Text>
                </View>
              ) : null}
              <View style={styles.ratingRow}>
                <MaterialCommunityIcons name="star" size={15} color={UI.star} />
                <Text style={styles.metaStrong}>{ratingLabel ?? "—"}</Text>
                <Text style={styles.metaMuted}>({reviewsLabel})</Text>
              </View>
              <View style={styles.locHoursBlock}>
                {distanceLabel ? (
                  <View style={styles.metaCluster}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={UI.purple} />
                    <Text style={styles.metaMuted} numberOfLines={1}>
                      {distanceLabel}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.metaCluster}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={openStatus === "open" ? UI.openText : UI.muted}
                  />
                  <Text
                    style={[
                      styles.openText,
                      openStatus === "closed" && styles.closedText,
                      openStatus === "unknown" && styles.mutedText,
                    ]}
                  >
                    {openLabel}
                  </Text>
                  {hoursHint ? (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.metaMuted} numberOfLines={1}>
                        {hoursHint}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          {offeredJobs.length > 0 ? (
            <View style={styles.jobSwitch}>
              <Text style={styles.jobSwitchLabel}>{s.jobSwitcherLabel}</Text>
              <View
                style={[styles.jobGrid, { gap: JOB_GRID_GAP }]}
                onLayout={(event) => {
                  const next = Math.round(event.nativeEvent.layout.width);
                  setJobGridWidth((prev) => (prev === next ? prev : next));
                }}
              >
                {offeredJobs.map((job) => {
                  const meta = jobMeta[job];
                  const active = job === activeJob;
                  const hasItems = jobHasItems(job);
                  return (
                    <Pressable
                      key={job}
                      onPress={() => handleSelect(job)}
                      style={[
                        styles.jobCard,
                        { width: jobCardWidth },
                        (active || hasItems) && styles.jobCardActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Image
                        source={meta.image}
                        style={[styles.jobCardImage, { height: jobImageHeight }]}
                        contentFit="cover"
                      />
                      <View style={[styles.jobCardIcon, { backgroundColor: meta.accent }]}>
                        <MaterialCommunityIcons name={meta.icon} size={14} color="#FFFFFF" />
                      </View>
                      {hasItems ? (
                        <View style={styles.jobCardCheck}>
                          <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                        </View>
                      ) : null}
                      <Text
                        style={[
                          styles.jobCardTitle,
                          isNarrow && styles.jobCardTitleNarrow,
                          (active || hasItems) && styles.jobCardTitleActive,
                        ]}
                        numberOfLines={2}
                      >
                        {meta.title}
                      </Text>
                      <Text style={styles.jobCardSub} numberOfLines={2}>
                        {meta.subtitle}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.tabRow}>
            {tabs.map((item) => {
              const active = tab === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setTab(item.id)}
                  style={[styles.tabBtn, { width: "33.33%" }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
                </Pressable>
              );
            })}
          </View>

          {tab === "about" ? (
            <View style={styles.tabBody}>
              {hasOffer ? (
                <Pressable
                  onPress={() => handleSelect()}
                  style={({ pressed }) => [styles.offerCard, pressed && styles.pressed]}
                >
                  <View style={styles.offerIcon}>
                    <MaterialCommunityIcons name="sale" size={20} color={UI.purple} />
                  </View>
                  <View style={styles.offerCopy}>
                    <Text style={styles.offerTitle}>{s.specialOffer}</Text>
                    <Text style={styles.offerBody}>
                      {fill(s.specialOfferBody, { pct: profile.offerPercent ?? 0 })}
                    </Text>
                    {profile.offerCode ? (
                      <Text style={styles.offerCode}>
                        {fill(s.offerCode, { code: profile.offerCode })}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={UI.purple} />
                </Pressable>
              ) : null}
              <AboutBlock
                heading={fill(s.aboutHeading, { name: displayName })}
                text={aboutText || s.noAbout}
                expanded
                onToggle={() => undefined}
                readMore={s.readMore}
                readLess={s.readLess}
                hideToggle
              />
              <View style={styles.infoPair}>
                <View style={styles.infoCard}>
                  <View style={styles.infoIcon}>
                    <MaterialCommunityIcons name="map-marker" size={18} color={UI.purple} />
                  </View>
                  <Text style={styles.infoTitle}>{s.location}</Text>
                  <Text style={styles.infoBody}>{address}</Text>
                  <Pressable onPress={() => void handleDirections()}>
                    <Text style={styles.linkText}>{s.getDirections}</Text>
                  </Pressable>
                </View>
                <View style={styles.infoCard}>
                  <View style={[styles.infoIcon, { backgroundColor: "#ECFDF5" }]}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={UI.teal} />
                  </View>
                  <Text style={styles.infoTitle}>{s.businessHours}</Text>
                  <Text style={styles.infoBody}>{s.hoursMonSun}</Text>
                  <Text style={styles.infoBody}>{hours?.rangeLabel ?? s.hoursUnknown}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {tab === "photos" ? (
            <View style={styles.tabBody}>
              {carouselImages.length > 0 ? (
                <View style={styles.photoGrid}>
                  {carouselImages.map((uri, index) => (
                    <Pressable
                      key={`${uri}-${index}`}
                      onPress={() => {
                        setActiveImageIndex(index);
                        heroScrollRef.current?.scrollTo({ x: index * heroWidth, animated: true });
                      }}
                      style={styles.photoCell}
                    >
                      <Image source={{ uri }} style={styles.photoCellImage} contentFit="cover" />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyCopy}>{s.noPhotos}</Text>
              )}
            </View>
          ) : null}

          {tab === "reviews" ? (
            <View style={styles.tabBody}>
              <View style={styles.reviewSummary}>
                <Text style={styles.reviewAvg}>{ratingLabel ?? "—"}</Text>
                <StarRating value={ratingCount > 0 ? ratingAvg : 0} size={18} />
                <Text style={styles.metaMuted}>{reviewsLabel}</Text>
              </View>
              {reviews.length > 0 ? (
                reviews.map((item) => (
                  <View key={item.id} style={styles.reviewCard}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewInitial}>{item.reviewerInitial}</Text>
                    </View>
                    <View style={styles.reviewCopy}>
                      <View style={styles.reviewHead}>
                        <StarRating value={item.rating} size={14} />
                        <Text style={styles.reviewDate}>{formatReviewDate(item.createdAt)}</Text>
                      </View>
                      {item.message ? <Text style={styles.reviewMessage}>{item.message}</Text> : null}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyCopy}>{s.noReviewsYet}</Text>
              )}
            </View>
          ) : null}

          <View
            style={styles.fulfillment}
            onLayout={(event) => {
              scrollToCollectSection(event.nativeEvent.layout.y);
            }}
          >
            <Text style={styles.fulfillmentLabel}>{s.howToCollect}</Text>
            <View style={styles.fulfillmentGrid}>
              <Pressable
                onPress={() => {
                  if (!hasPickup) return;
                  fulfillmentTouchedRef.current = true;
                  setPickupDeliveryRequested(true);
                  openPickupSchedule();
                }}
                disabled={!hasPickup}
                style={[
                  styles.fulfillmentCard,
                  pickupEnabled && styles.fulfillmentCardActive,
                  !hasPickup && styles.fulfillmentDisabled,
                ]}
              >
                <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={UI.purple} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.fulfillmentTitle, pickupEnabled && styles.fulfillmentTitleActive]}
                    numberOfLines={2}
                  >
                    {sBook.pickupTitle}
                  </Text>
                  <Text
                    style={[
                      styles.fulfillmentBody,
                      pickupScheduleSummary && styles.fulfillmentSchedule,
                    ]}
                    numberOfLines={pickupScheduleSummary ? 4 : 2}
                  >
                    {pickupScheduleSummary ?? sBook.pickupBody}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  fulfillmentTouchedRef.current = true;
                  setPickupDeliveryRequested(false);
                }}
                style={[
                  styles.fulfillmentCard,
                  !pickupEnabled && styles.fulfillmentCardActive,
                ]}
              >
                <MaterialCommunityIcons name="storefront-outline" size={18} color={UI.purple} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.fulfillmentTitle, !pickupEnabled && styles.fulfillmentTitleActive]}
                    numberOfLines={2}
                  >
                    {sBook.dropoffTitle}
                  </Text>
                  <Text style={styles.fulfillmentBody} numberOfLines={2}>
                    {sBook.dropoffBody}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.stickyHeader, { paddingTop: headerTopPad }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.stickyHeaderFill, { opacity: headerOpacity }]}
        />
        {modalChrome ? (
          <>
            <View style={styles.heroChromeSide} />
            <Animated.Text style={[styles.stickyTitle, { opacity: headerOpacity }]} numberOfLines={1}>
              {displayName}
            </Animated.Text>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                headerSolid ? styles.stickyIconBtn : styles.heroRoundBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialCommunityIcons name="close" size={20} color={UI.text} />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                headerSolid ? styles.stickyIconBtn : styles.heroRoundBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color={UI.text} />
            </Pressable>
            <Animated.Text style={[styles.stickyTitle, { opacity: headerOpacity }]} numberOfLines={1}>
              {displayName}
            </Animated.Text>
            <View style={styles.heroChromeRight}>
              <Pressable
                onPress={() => void handleShare()}
                style={({ pressed }) => [
                  headerSolid ? styles.stickyIconBtn : styles.heroRoundBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={s.share}
              >
                <MaterialCommunityIcons name="export-variant" size={20} color={UI.text} />
              </Pressable>
              <Pressable
                onPress={() => void handleFavorite()}
                style={({ pressed }) => [
                  headerSolid ? styles.stickyIconBtn : styles.heroRoundBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={favorited ? s.unfavorite : s.favorite}
              >
                <MaterialCommunityIcons
                  name={favorited ? "heart" : "heart-outline"}
                  size={20}
                  color={favorited ? "#E11D48" : UI.text}
                />
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: footerBottomPad }]}>
        <OrderSelectionSummary estimate={estimate} loading={estimateLoading} />
        <View style={styles.footerActions}>
          <AppCtaButton
            label={s.chat}
            variant="outline"
            width={40}
            leftIcon="chat-outline"
            onPress={() => void handleChat()}
          />
          <AppCtaButton
            label={s.continueOrder}
            width={60}
            rightIcon="arrow-right"
            onPress={handleContinueOrder}
          />
        </View>
      </View>
    </View>
  );
}

function AboutBlock({
  heading,
  text,
  expanded,
  onToggle,
  readMore,
  readLess,
  hideToggle = false,
}: {
  heading: string;
  text: string;
  expanded: boolean;
  onToggle: () => void;
  readMore: string;
  readLess: string;
  hideToggle?: boolean;
}) {
  const long = text.length > 140;
  return (
    <View style={styles.aboutBlock}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, styles.aboutHeading]} numberOfLines={1}>
          {heading}
        </Text>
        {!hideToggle && long ? (
          <Pressable onPress={onToggle}>
            <Text style={styles.viewAll}>{expanded ? readLess : readMore}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.aboutText} numberOfLines={expanded || hideToggle ? undefined : 3}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  scroll: { flex: 1, backgroundColor: UI.card },
  heroWrap: { backgroundColor: UI.iconWell },
  heroChrome: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  heroChromeRight: { flexDirection: "row", gap: 10 },
  heroChromeSide: { width: 40, height: 40 },
  stickyHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  stickyHeaderFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  stickyTitle: {
    flex: 1,
    marginHorizontal: 10,
    color: UI.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
    includeFontPadding: false,
  },
  stickyIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.iconWell,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(17, 24, 39, 0.18)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  photoCount: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  sheet: {
    marginTop: -28,
    backgroundColor: UI.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWell: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    lineHeight: 24,
  },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  verifiedText: { fontSize: 12, color: UI.teal, fontFamily: "Poppins-SemiBold" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  locHoursBlock: { marginTop: 4, gap: 4 },
  metaCluster: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  metaStrong: { fontSize: 13, color: UI.text, fontFamily: "Poppins-Bold" },
  metaMuted: { fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  metaDot: { color: UI.muted, marginHorizontal: 2, fontSize: 12 },
  openText: { fontSize: 12, color: UI.openText, fontFamily: "Poppins-SemiBold" },
  closedText: { color: UI.closedText },
  mutedText: { color: UI.muted },
  jobSwitch: { marginTop: 16, gap: 10 },
  jobSwitchLabel: { fontSize: 16, color: UI.text, fontFamily: "Poppins-Bold" },
  jobGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  jobCard: {
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    backgroundColor: UI.card,
    padding: 8,
    paddingBottom: 10,
    flexGrow: 0,
    flexShrink: 0,
  },
  jobCardActive: { borderColor: UI.purple, backgroundColor: "#F5F3FF" },
  jobCardImage: { borderRadius: 12, backgroundColor: UI.iconWell },
  jobCardIcon: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  jobCardCheck: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: UI.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  jobCardTitle: {
    marginTop: 8,
    fontSize: 13,
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  jobCardTitleNarrow: {
    fontSize: 12,
  },
  jobCardTitleActive: { color: UI.purple },
  jobCardSub: { marginTop: 2, fontSize: 11, color: UI.muted, fontFamily: "Poppins-Regular" },
  tabRow: {
    flexDirection: "row",
    marginTop: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  tabBtn: { alignItems: "center" },
  tabLabel: { fontSize: 11, color: UI.muted, fontFamily: "Poppins-Medium", textAlign: "center" },
  tabLabelActive: { color: UI.purple, fontFamily: "Poppins-SemiBold" },
  tabUnderline: { marginTop: 10, height: 3, width: "78%", borderRadius: 999, backgroundColor: "transparent" },
  tabUnderlineActive: { backgroundColor: UI.purple },
  tabBody: { paddingTop: 18, gap: 16 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontSize: 17, color: UI.text, fontFamily: "Poppins-Bold" },
  sectionHint: { marginTop: 2, fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  aboutHeading: { flex: 1 },
  viewAll: { fontSize: 13, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F3EFFF",
    borderRadius: 18,
    padding: 14,
  },
  offerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  offerCopy: { flex: 1 },
  offerTitle: { fontSize: 14, color: UI.text, fontFamily: "Poppins-Bold" },
  offerBody: { fontSize: 13, color: UI.muted, fontFamily: "Poppins-Regular" },
  offerCode: { marginTop: 2, fontSize: 12, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  infoPair: { flexDirection: "row", gap: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: UI.bg,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { fontSize: 14, color: UI.text, fontFamily: "Poppins-Bold" },
  infoBody: { fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular", lineHeight: 18 },
  linkText: { fontSize: 13, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  aboutBlock: { gap: 8 },
  aboutText: { fontSize: 13, color: UI.muted, fontFamily: "Poppins-Regular", lineHeight: 20 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoCell: { width: "31.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden" },
  photoCellImage: { width: "100%", height: "100%" },
  reviewSummary: { alignItems: "center", gap: 6, paddingVertical: 8 },
  reviewAvg: { fontSize: 32, color: UI.text, fontFamily: "Poppins-Bold" },
  reviewCard: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInitial: { fontSize: 16, color: UI.purple, fontFamily: "Poppins-Bold" },
  reviewCopy: { flex: 1, gap: 4 },
  reviewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewDate: { fontSize: 11, color: UI.muted, fontFamily: "Poppins-Regular" },
  reviewMessage: { fontSize: 13, color: UI.text, fontFamily: "Poppins-Regular", lineHeight: 19 },
  emptyCopy: { fontSize: 13, color: UI.muted, fontFamily: "Poppins-Regular" },
  footer: {
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  fulfillment: { marginTop: 8, gap: 10 },
  fulfillmentLabel: { fontSize: 16, color: UI.text, fontFamily: "Poppins-Bold" },
  fulfillmentGrid: { flexDirection: "row", gap: 8 },
  fulfillmentCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    padding: 12,
    backgroundColor: UI.card,
  },
  fulfillmentCardActive: { borderColor: UI.purple, backgroundColor: "#F5F3FF" },
  fulfillmentDisabled: { opacity: 0.45 },
  fulfillmentTitle: { fontSize: 12, color: UI.text, fontFamily: "Poppins-SemiBold" },
  fulfillmentTitleActive: { color: UI.purple },
  fulfillmentBody: { marginTop: 2, fontSize: 10, color: UI.muted, fontFamily: "Poppins-Regular" },
  fulfillmentSchedule: {
    fontSize: 10,
    lineHeight: 14,
    color: UI.purpleDeep,
    fontFamily: "Poppins-Medium",
  },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  pressed: { opacity: 0.88 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  notFoundText: { fontSize: 15, color: UI.muted, fontFamily: "Poppins-Regular", textAlign: "center" },
  retryWrap: { paddingVertical: 8, paddingHorizontal: 16 },
  retryText: { color: UI.teal, fontSize: 15, fontFamily: "Poppins-SemiBold" },
});
