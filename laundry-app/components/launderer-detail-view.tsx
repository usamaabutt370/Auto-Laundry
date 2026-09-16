import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { StarRating } from "@/components/star-rating";
import { assets } from "@/assets/assets";
import type { LaundererServiceType } from "@/constants/launderers";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
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
  jobIncludesServiceType,
  offeredJobsFromTypes,
  primaryServiceForJob,
  resolveActiveJob,
  type ServiceJob,
} from "@/lib/service-jobs";
import { getStrings } from "@/locales";
import { getDeviceCoordinates } from "@/utils/device-location";
import type { Coordinates } from "@/utils/geocoding";
import { parsePriceDisplay } from "@/utils/parse-price-display";
import { getPartnerHoursRange, getPartnerOpenStatus } from "@/utils/partner-hours";
import { partnerHasActiveOffer } from "@/utils/partner-offers";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  purple: "#5B4DFF",
  purpleDeep: "#2C1B6E",
  star: "#F5B301",
  openText: "#047857",
  closedText: "#B91C1C",
  chipBorder: "#E5E7EB",
  iconWell: "#F3F4F6",
  shadow: "rgba(17, 24, 39, 0.12)",
};

type DetailTab = "services" | "about" | "photos" | "reviews";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function formatRs(amount: number): string {
  if (Number.isInteger(amount)) return `Rs. ${amount}`;
  return `Rs. ${amount.toFixed(2).replace(/\.00$/, "")}`;
}

function serviceItemLabel(name: string, category: string): string {
  const trimmed = name.trim();
  const prefix = `${category} - `;
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
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

function categoryToType(category: string | null | undefined): LaundererServiceType | null {
  const c = (category ?? "").trim();
  if (c === "Wash & Fold") return "washAndFold";
  if (c === "Dry Cleaning") return "dryCleaning";
  if (c === "Tailoring") return "tailoring";
  if (c === "Press") return "press";
  return null;
}

function serviceThumb(category: string) {
  const type = categoryToType(category);
  if (type === "tailoring") return assets.images.home_deal_tailoring;
  if (type === "press") return assets.images.home_deal_ironing;
  if (type === "dryCleaning") return assets.images.home_deal_ironing;
  return assets.images.home_deal_laundry;
}

function formatReviewDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type PricedService = {
  key: string;
  label: string;
  price: string;
  category: string;
  serviceType: LaundererServiceType | null;
};

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
}

export function LaundererDetailView({
  partnerId,
  initialName,
  intentService,
  onBack,
  onSelect,
}: LaundererDetailViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.laundererDetail;
  const sHome = getStrings(locale).customer.home;
  const { isWeb } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const footerBottomPad = Math.max(insets.bottom, 16);
  const heroHeight = isWeb ? 420 : Math.round(windowWidth * 0.72);
  const popularCardWidth = Math.round((windowWidth - 40 - 12) / 2.35);

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
  const [tab, setTab] = useState<DetailTab>("services");
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [heroWidth, setHeroWidth] = useState(windowWidth);
  const [jobOverride, setJobOverride] = useState<ServiceJob | null>(null);
  const heroScrollRef = useRef<ScrollView | null>(null);
  const partnerVerified = usePartnerVerified(partnerId);

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
    setTab("services");
    setJobOverride(null);
  }, [profile?.id, intentService]);

  const pricedServices = useMemo<PricedService[]>(() => {
    const seen = new Set<string>();
    return services.flatMap((row, index) => {
      const amount = parsePriceDisplay(row.price_display);
      if (amount == null || amount <= 0) return [];
      const category = (row.category ?? "").trim();
      const label = serviceItemLabel(row.name, category) || row.name;
      const dedupeKey = `${category}::${label.trim().toLowerCase()}`;
      if (seen.has(dedupeKey)) return [];
      seen.add(dedupeKey);
      return [
        {
          key: `${dedupeKey}-${index}`,
          label,
          price: row.price_display.trim() || formatRs(amount),
          category,
          serviceType: categoryToType(category),
        },
      ];
    });
  }, [services]);

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

  const jobServices = useMemo(
    () => pricedServices.filter((row) => jobIncludesServiceType(activeJob, row.serviceType)),
    [activeJob, pricedServices],
  );

  const popularServices = useMemo(() => jobServices.slice(0, 4), [jobServices]);

  const primaryCategoryLabel =
    activeJob === "ironing"
      ? sHome.categoryIroning
      : activeJob === "tailoring"
        ? sHome.categoryTailoring
        : s.categoryLaundry;

  const jobSwitcherLabel = (job: ServiceJob) =>
    job === "ironing"
      ? sHome.categoryIroning
      : job === "tailoring"
        ? sHome.categoryTailoring
        : sHome.categoryLaundry;

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
  const hasOffer = partnerHasActiveOffer(profile?.offerPercent);
  const aboutText = profile?.business_description?.trim() ?? "";
  const address = profile?.address?.trim() || "—";
  const pickupAmount = profile?.pickup_delivery_amount?.trim() ?? "";
  const pickupLooksFree = !pickupAmount || /free|^0(\.0+)?$/i.test(pickupAmount);

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

  const features = useMemo(
    () => [
      {
        icon: "truck-delivery-outline" as const,
        label: hasPickup && pickupLooksFree ? s.featureFreePickup : s.featurePickup,
        color: "#2563EB",
      },
      {
        icon: "shield-check-outline" as const,
        label: s.featureQuality,
        color: "#2563EB",
      },
      {
        icon: "leaf" as const,
        label: s.featureEco,
        color: "#16A34A",
      },
      {
        icon: "clock-outline" as const,
        label: s.featureOnTime,
        color: "#2563EB",
      },
    ],
    [hasPickup, pickupLooksFree, s],
  );

  const handleHeroScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(Math.max(0, Math.min(carouselImages.length - 1, nextIndex)));
  };

  const handleSelect = (service?: LaundererServiceType, itemLabel?: string) => {
    if (!partnerId) return;
    onSelect(partnerId, profile?.business_name?.trim() || initialName || null, {
      service: service ?? primaryServiceForJob(activeJob, serviceTypes),
      job: activeJob,
      itemLabel,
    });
  };

  const renderServiceCard = (item: PricedService, width: number) => (
    <Pressable
      key={item.key}
      onPress={() => handleSelect(item.serviceType ?? undefined, item.label)}
      style={({ pressed }) => [styles.popularCard, { width }, pressed && styles.pressed]}
    >
      <Image
        source={serviceThumb(item.category)}
        style={[styles.popularImage, { width }]}
        contentFit="cover"
      />
      <Text style={styles.popularName} numberOfLines={1}>
        {item.label}
      </Text>
      <View style={styles.popularPriceRow}>
        <Text style={styles.popularPrice} numberOfLines={1}>
          {fill(s.fromPrice, { price: item.price })}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={UI.muted} />
      </View>
    </Pressable>
  );

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

  const renderHeroChrome = () => (
    <View pointerEvents="box-none" style={[styles.heroChrome, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.heroRoundBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <MaterialCommunityIcons name="chevron-left" size={26} color={UI.text} />
      </Pressable>
      <View style={styles.heroChromeRight}>
        <Pressable
          onPress={() => void handleShare()}
          style={({ pressed }) => [styles.heroRoundBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={s.share}
        >
          <MaterialCommunityIcons name="export-variant" size={20} color={UI.text} />
        </Pressable>
        <Pressable
          onPress={() => void handleFavorite()}
          style={({ pressed }) => [styles.heroRoundBtn, pressed && styles.pressed]}
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
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        {renderHeroChrome()}
        <View style={styles.centered}>
          <ActivityIndicator color={UI.teal} size="small" />
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
    { id: "services", label: s.tabServices },
    { id: "about", label: s.tabAbout },
    { id: "photos", label: s.tabPhotos },
    { id: "reviews", label: s.tabReviews },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
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
          {renderHeroChrome()}
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

        <View style={styles.sheet}>
          <View style={styles.identityRow}>
            <View style={styles.avatarWell}>
              <LinearGradient colors={["#A78BFA", "#6366F1"]} style={styles.avatarInner}>
                <MaterialCommunityIcons name="washing-machine" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.identityText}>
              <View style={styles.nameLine}>
                <Text style={styles.name} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{primaryCategoryLabel}</Text>
                </View>
              </View>
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
              <View style={styles.locHoursRow}>
                {distanceLabel ? (
                  <View style={styles.metaCluster}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={UI.purple} />
                    <Text style={styles.metaMuted} numberOfLines={1}>
                      {distanceLabel}
                    </Text>
                  </View>
                ) : null}
                {distanceLabel && hoursHint ? <View style={styles.metaDivider} /> : null}
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

          <View style={styles.featureRow}>
            {features.map((item) => (
              <View key={item.label} style={styles.featureChip}>
                <MaterialCommunityIcons name={item.icon} size={16} color={item.color} />
                <Text style={styles.featureLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {offeredJobs.length > 1 ? (
            <View style={styles.jobSwitch}>
              <Text style={styles.jobSwitchLabel}>{s.jobSwitcherLabel}</Text>
              <View style={styles.jobSwitchRow}>
                {offeredJobs.map((job) => {
                  const active = job === activeJob;
                  return (
                    <Pressable
                      key={job}
                      onPress={() => setJobOverride(job)}
                      style={[styles.jobSwitchChip, active && styles.jobSwitchChipActive]}
                    >
                      <Text
                        style={[styles.jobSwitchText, active && styles.jobSwitchTextActive]}
                      >
                        {jobSwitcherLabel(job)}
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
                  style={[styles.tabBtn, { width: item.id === "services" ? "30%" : "23%" }]}
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

          {tab === "services" ? (
            <View style={styles.tabBody}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{s.popularServices}</Text>
                {jobServices.length > 0 ? (
                  <Pressable
                    onPress={() => handleSelect()}
                    accessibilityRole="button"
                    accessibilityLabel={s.viewAll}
                  >
                    <Text style={styles.viewAll}>{s.viewAll}</Text>
                  </Pressable>
                ) : null}
              </View>
              {jobServices.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.popularRow}
                >
                  {popularServices.map((item) => renderServiceCard(item, popularCardWidth))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyCopy}>{s.noServices}</Text>
              )}

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

              <View style={styles.infoPair}>
                <View style={styles.infoCard}>
                  <View style={styles.infoIcon}>
                    <MaterialCommunityIcons name="map-marker" size={18} color={UI.purple} />
                  </View>
                  <Text style={styles.infoTitle}>{s.location}</Text>
                  <Text style={styles.infoBody} numberOfLines={3}>
                    {address}
                  </Text>
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

              <AboutBlock
                heading={fill(s.aboutHeading, { name: displayName })}
                text={aboutText || s.noAbout}
                expanded={aboutExpanded}
                onToggle={() => setAboutExpanded((value) => !value)}
                readMore={s.readMore}
                readLess={s.readLess}
              />
            </View>
          ) : null}

          {tab === "about" ? (
            <View style={styles.tabBody}>
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
                        setTab("services");
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
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottomPad }]}>
        <Pressable
          onPress={() => void handleChat()}
          style={({ pressed }) => [styles.chatBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="chat-outline" size={20} color={UI.purple} />
          <Text style={styles.chatLabel}>{s.chat}</Text>
        </Pressable>
        <Pressable
          onPress={() => handleSelect()}
          style={({ pressed }) => [styles.bookWrap, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={["#6D5CFF", "#8B5CF6", "#22D3EE"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.bookBtn}
          >
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#FFFFFF" />
            <Text style={styles.bookLabel}>{s.bookService}</Text>
          </LinearGradient>
        </Pressable>
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
  container: { flex: 1, backgroundColor: UI.card },
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
    paddingBottom: 16,
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
  nameLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    lineHeight: 24,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: "#DDD6FE",
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 0,
  },
  categoryChipText: { fontSize: 11, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  verifiedText: { fontSize: 12, color: UI.teal, fontFamily: "Poppins-SemiBold" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  locHoursRow: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap", marginTop: 4 },
  metaCluster: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  metaStrong: { fontSize: 13, color: UI.text, fontFamily: "Poppins-Bold" },
  metaMuted: { fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  metaDot: { color: UI.muted, marginHorizontal: 2, fontSize: 12 },
  openText: { fontSize: 12, color: UI.openText, fontFamily: "Poppins-SemiBold" },
  closedText: { color: UI.closedText },
  mutedText: { color: UI.muted },
  jobSwitch: { marginTop: 16, gap: 8 },
  jobSwitchLabel: { fontSize: 12, color: UI.muted, fontFamily: "Poppins-Medium" },
  jobSwitchRow: { flexDirection: "row", gap: 8 },
  jobSwitchChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 999,
    paddingVertical: 8,
    backgroundColor: UI.iconWell,
  },
  jobSwitchChipActive: { backgroundColor: UI.purple, borderColor: UI.purple },
  jobSwitchText: { fontSize: 12, color: UI.text, fontFamily: "Poppins-SemiBold" },
  jobSwitchTextActive: { color: "#FFFFFF" },
  featureRow: { flexDirection: "row", marginTop: 16, gap: 6 },
  featureChip: {
    width: "25%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  featureLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 9,
    color: UI.text,
    fontFamily: "Poppins-Regular",
    lineHeight: 12,
  },
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
  aboutHeading: { flex: 1 },
  viewAll: { fontSize: 13, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  popularRow: { gap: 12, paddingRight: 4 },
  popularCard: {},
  popularImage: { height: 92, borderRadius: 14, backgroundColor: UI.iconWell },
  popularName: { marginTop: 8, fontSize: 13, color: UI.text, fontFamily: "Poppins-SemiBold" },
  popularPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  popularPrice: { flex: 1, fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
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
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: UI.purple,
    backgroundColor: "#FFFFFF",
    minHeight: 52,
  },
  chatLabel: { fontSize: 15, color: UI.purple, fontFamily: "Poppins-Bold" },
  bookWrap: { flex: 1, borderRadius: 28, overflow: "hidden" },
  bookBtn: {
    minHeight: 52,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bookLabel: { fontSize: 16, color: "#FFFFFF", fontFamily: "Poppins-Bold" },
  pressed: { opacity: 0.88 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  notFoundText: { fontSize: 15, color: UI.muted, fontFamily: "Poppins-Regular", textAlign: "center" },
  retryWrap: { paddingVertical: 8, paddingHorizontal: 16 },
  retryText: { color: UI.teal, fontSize: 15, fontFamily: "Poppins-SemiBold" },
});
