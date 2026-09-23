import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  initialWindowMetrics,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { AppCtaButton } from "@/components/ui/cta-button";
import { OrderCelebration } from "@/components/ui/order-celebration";
import { useAuth } from "@/contexts/auth-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { imageForServiceItem } from "@/lib/service-item-images";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ServiceJob } from "@/lib/service-jobs";
import { getStrings } from "@/locales";
import { UI } from "@/constants/theme";
import { getDeviceCoordinates } from "@/utils/device-location";
import { formatMoney } from "@/utils/format-money";
import type { Coordinates } from "@/utils/geocoding";
import { getPartnerOpenStatus } from "@/utils/partner-hours";
import { runAfterModalTeardown } from "@/utils/run-after-modal-teardown";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function formatOrderReference(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
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
  if (km < 1) return `${Math.max(0.1, km).toFixed(1)} km`;
  return `${km.toFixed(1)} km`;
}

function parseQty(label: string) {
  const match = label.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function displayServiceTitle(title: string) {
  return title
    .replace(/^wash\s*&\s*fold\s*-\s*/i, "")
    .replace(/^dry\s*cleaning\s*-\s*/i, "")
    .replace(/^press\s*-\s*/i, "")
    .replace(/^tailoring\s*-\s*/i, "")
    .trim();
}

function parseLineKey(key: string): { job: ServiceJob; id: string } | null {
  if (key.startsWith("wash_fold_")) return { job: "washAndFold", id: key.slice("wash_fold_".length) };
  if (key.startsWith("dry_")) return { job: "dryCleaning", id: key.slice("dry_".length) };
  if (key.startsWith("press_")) return { job: "ironing", id: key.slice("press_".length) };
  if (key.startsWith("tailoring_")) return { job: "tailoring", id: key.slice("tailoring_".length) };
  return null;
}

function familyInstructions(
  draft: ReturnType<typeof useCustomerOrderDraft>["draft"],
  job: ServiceJob,
) {
  if (job === "washAndFold") return draft.washFold?.itemizedInstructions ?? "";
  if (job === "dryCleaning") return draft.dryClean?.itemizedInstructions ?? "";
  if (job === "ironing") return draft.press?.itemizedInstructions ?? "";
  return draft.tailoring?.itemizedInstructions ?? "";
}

function parseAddOns(instructions: string) {
  const match = instructions.match(/Add-ons:\s*(.+)/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const JOB_ORDER: ServiceJob[] = ["washAndFold", "dryCleaning", "ironing", "tailoring"];

const STATUS_STEPS = [
  { key: "sent", icon: "check" as const },
  { key: "confirmed", icon: "storefront-outline" as const },
  { key: "picked", icon: "shopping-outline" as const },
  { key: "onWay", icon: "truck-delivery-outline" as const },
  { key: "completed", icon: "check-circle-outline" as const },
];

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId: orderIdParam } = useLocalSearchParams<{ orderId?: string }>();
  const orderId = typeof orderIdParam === "string" ? orderIdParam : "";
  const { user } = useAuth();
  const { locale } = useLocale();
  const { draft, resetDraft } = useCustomerOrderDraft();
  const s = getStrings(locale).customer.orderSummary;
  const footerBottom = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0, 12);

  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [customerAddress, setCustomerAddress] = useState("");
  const partnerVerified = usePartnerVerified(draft.partnerId);
  const { estimate, profile } = usePartnerOrderEstimate(draft.partnerId, draft);

  useEffect(() => {
    void getDeviceCoordinates().then((coords) => {
      if (coords) setUserCoords(coords);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user?.id || !isSupabaseConfigured() || !supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("address")
        .eq("id", user.id)
        .maybeSingle<{ address: string | null }>();
      if (!cancelled) setCustomerAddress(data?.address?.trim() ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const badgeScale = useSharedValue(0.4);
  const badgeOpacity = useSharedValue(0);

  useEffect(() => {
    badgeOpacity.value = withTiming(1, { duration: 280 });
    badgeScale.value = withSequence(
      withTiming(1.12, { duration: 320, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 10, stiffness: 160 }),
    );
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [badgeOpacity, badgeScale]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));

  const placedAtLabel = useMemo(() => {
    return new Date().toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const serviceLines = useMemo(
    () => estimate.lines.filter((line) => line.key !== "pickup_delivery"),
    [estimate.lines],
  );

  const orderRef = orderId ? formatOrderReference(orderId) : "—";

  const partnerName = profile?.business_name?.trim() || draft.partnerName || "";
  const partnerImage =
    (Array.isArray(profile?.business_images)
      ? profile.business_images.find(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : null) || avatarUrlWithCacheBuster(profile?.image_url, profile?.updated_at);
  const openStatus = getPartnerOpenStatus(profile?.available_time);
  const partnerCoords =
    profile && Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude)
      ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) }
      : null;
  const distanceLabel =
    userCoords && partnerCoords ? formatKm(distanceKm(userCoords, partnerCoords)) : null;
  const ratingAvg = profile?.ratingAvg;
  const ratingCount = profile?.ratingCount ?? 0;
  const ratingLabel =
    ratingAvg != null && Number.isFinite(ratingAvg)
      ? Number.isInteger(ratingAvg)
        ? String(ratingAvg)
        : ratingAvg.toFixed(1)
      : null;

  const totalDisplay =
    estimate.total != null
      ? formatMoney(estimate.currencyPrefix, estimate.total)
      : estimate.partialTotal > 0
        ? `${formatMoney(estimate.currencyPrefix, estimate.partialTotal)} *`
        : "—";

  const addressLabel =
    customerAddress.trim() ||
    (draft.pickupDeliveryRequested ? s.noAddress : s.dropoffTitle);

  const scheduleDate = draft.pickup?.dayLabel || draft.pickup?.dateIso || s.noSchedule;
  const scheduleTime = draft.pickup?.timeSlotLabel ?? "";

  const leaveToOrder = () => {
    if (!orderId) return;
    try {
      if (typeof router.dismissAll === "function") {
        router.dismissAll();
      }
    } catch {
      // ignore
    }
    router.replace({
      pathname: "/(customer)/track-order",
      params: { orderId },
    });
    // Clear after leave so confirmation doesn't flash empty while closing.
    runAfterModalTeardown(() => {
      resetDraft();
    });
  };

  const leaveToHome = () => {
    try {
      if (typeof router.dismissAll === "function") {
        router.dismissAll();
      }
    } catch {
      // ignore
    }
    router.replace("/(customer)/(tabs)");
    // Clear after leave so confirmation doesn't flash empty while closing.
    runAfterModalTeardown(() => {
      resetDraft();
    });
  };

  const shareOrderRef = () => {
    void Share.share({ message: fill(s.orderIdChip, { ref: orderRef }) });
  };

  const openShop = () => {
    if (!draft.partnerId) return;
    router.push({
      pathname: "/(customer)/launderer-detail",
      params: {
        id: draft.partnerId,
        ...(draft.partnerName ? { name: draft.partnerName } : {}),
        mode: draft.pickupDeliveryRequested ? "pickupDelivery" : "dropoff",
      },
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <View style={styles.headerSide} />
          <View style={styles.headerCopy} />
          <Pressable
            onPress={leaveToHome}
            style={styles.roundBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={UI.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.celebrationHost}>
            <OrderCelebration />
            <Animated.View style={[styles.successRing, badgeAnimStyle]}>
              <View style={styles.successBadge}>
                <MaterialCommunityIcons name="check" size={34} color="#FFFFFF" />
              </View>
            </Animated.View>
          </View>
          <Text style={styles.heroTitle}>{s.orderConfirmedTitle}</Text>
          <Text style={styles.heroMessage}>{s.orderConfirmedMessage}</Text>
          <Pressable onPress={shareOrderRef} style={styles.orderChip}>
            <Text style={styles.orderChipText}>{fill(s.orderIdChip, { ref: orderRef })}</Text>
            <MaterialCommunityIcons name="content-copy" size={14} color={UI.purple} />
          </Pressable>
          <Text style={styles.placedAt}>{placedAtLabel}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.providerRow}>
            {partnerImage ? (
              <Image source={{ uri: partnerImage }} style={styles.providerImage} contentFit="cover" />
            ) : (
              <View style={[styles.providerImage, styles.providerImageFallback]}>
                <MaterialCommunityIcons name="storefront-outline" size={22} color={UI.muted} />
              </View>
            )}
            <View style={styles.providerCopy}>
              <PartnerNameWithBadge
                name={partnerName || "—"}
                verified={partnerVerified}
                nameStyle={styles.providerName}
              />
              <View style={styles.metaRow}>
                {ratingLabel ? (
                  <>
                    <MaterialCommunityIcons name="star" size={13} color={UI.star} />
                    <Text style={styles.metaText}>{ratingLabel}</Text>
                    {ratingCount > 0 ? (
                      <Text style={styles.metaMuted}>{fill(s.reviewsCount, { count: ratingCount })}</Text>
                    ) : null}
                    <Text style={styles.metaDot}>•</Text>
                  </>
                ) : null}
                {distanceLabel ? (
                  <>
                    <MaterialCommunityIcons name="map-marker-outline" size={13} color={UI.muted} />
                    <Text style={styles.metaMuted}>{distanceLabel}</Text>
                  </>
                ) : null}
              </View>
              <View style={styles.metaRow}>
                {openStatus === "open" || openStatus === "closed" ? (
                  <>
                    <Text
                      style={[
                        styles.openText,
                        openStatus === "closed" && styles.closedText,
                      ]}
                    >
                      {openStatus === "open" ? s.openNow : s.closedNow}
                    </Text>
                    <Text style={styles.metaDot}>·</Text>
                  </>
                ) : null}
                <Text style={styles.metaMuted}>{s.usuallyConfirms}</Text>
              </View>
            </View>
            <Pressable onPress={openShop} style={styles.viewProviderBtn} hitSlop={8}>
              <Text style={styles.viewProviderText}>{s.viewProvider}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={UI.purple} />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>
              {s.yourServices} ({serviceLines.length})
            </Text>
            <Pressable onPress={leaveToOrder} hitSlop={8} style={styles.inlineLink}>
              <Text style={styles.inlineLinkText}>{s.viewDetails}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={UI.purple} />
            </Pressable>
          </View>
          {serviceLines.length === 0 ? (
            <Text style={styles.metaMuted}>{s.noInstructions}</Text>
          ) : (
            JOB_ORDER.flatMap((job) => {
              const lines = serviceLines.filter(
                (line) => (parseLineKey(line.key)?.job ?? "washAndFold") === job,
              );
              if (lines.length === 0) return [];
              const addOns = parseAddOns(familyInstructions(draft, job));
              return lines.map((line, index) => {
                const parsed = parseLineKey(line.key);
                const qty = parseQty(line.qtyLabel);
                const unit = line.amount != null && qty > 0 ? line.amount / qty : null;
                return (
                  <View
                    key={line.key}
                    style={[
                      styles.serviceBlock,
                      index < lines.length - 1 || addOns.length > 0 ? styles.serviceBlockBorder : null,
                    ]}
                  >
                    <View style={styles.serviceRow}>
                      <Image
                        source={imageForServiceItem(parsed?.id, line.title, job)}
                        style={styles.serviceImage}
                        contentFit="cover"
                      />
                      <View style={styles.serviceCopy}>
                        <Text style={styles.serviceName} numberOfLines={2}>
                          {displayServiceTitle(line.title)}
                        </Text>
                        {unit != null ? (
                          <Text style={styles.unitPrice}>
                            {formatMoney(estimate.currencyPrefix, unit)}
                            {s.perPiece}
                          </Text>
                        ) : null}
                        <Text style={styles.metaMuted}>{fill(s.pieces, { count: qty || 1 })}</Text>
                      </View>
                      <Text style={styles.lineTotal}>
                        {line.amount != null
                          ? formatMoney(estimate.currencyPrefix, line.amount)
                          : "—"}
                      </Text>
                    </View>
                    {index === lines.length - 1
                      ? addOns.map((addon) => (
                          <View key={`${line.key}-${addon}`} style={styles.addonRow}>
                            <Text style={styles.addonText}>{addon}</Text>
                          </View>
                        ))
                      : null}
                  </View>
                );
              });
            })
          )}
        </View>

        <Pressable style={styles.infoCard} onPress={leaveToOrder}>
          <View style={[styles.infoIcon, styles.infoIconBlue]}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={18} color="#2563EB" />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoBody} numberOfLines={2}>
              {addressLabel}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={UI.muted} />
        </Pressable>

        {draft.pickupDeliveryRequested ? (
          <Pressable style={styles.infoCard} onPress={leaveToOrder}>
            <View style={[styles.infoIcon, styles.infoIconBlue]}>
              <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoBody}>{scheduleDate}</Text>
              {scheduleTime ? <Text style={styles.infoMeta}>{scheduleTime}</Text> : null}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={UI.muted} />
          </Pressable>
        ) : null}

        <View style={styles.totalCard}>
          <View style={styles.totalIcon}>
            <MaterialCommunityIcons name="receipt" size={18} color={UI.purple} />
          </View>
          <View style={styles.totalCopy}>
            <Text style={styles.totalLabel}>{s.estimatedTotal}</Text>
            <Text style={styles.totalHint}>{s.finalAmountHint}</Text>
          </View>
          <Text style={styles.totalValue}>{totalDisplay}</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHead}>
            <Text style={styles.statusTitle}>{s.orderStatus}</Text>
            <View style={styles.statusWaiting}>
              <Text style={styles.statusWaitingText}>{s.waitingForProvider}</Text>
              <MaterialCommunityIcons name="information-outline" size={14} color={UI.muted} />
            </View>
          </View>
          <View style={styles.statusTrack}>
            <View style={styles.statusRail} />
            {STATUS_STEPS.map((step, index) => {
              const active = index === 0;
              return (
                <View key={step.key} style={styles.statusStep}>
                  <View style={[styles.statusDot, active && styles.statusDotActive]}>
                    <MaterialCommunityIcons
                      name={step.icon}
                      size={14}
                      color={active ? "#FFFFFF" : UI.muted}
                    />
                  </View>
                  <Text style={[styles.statusStepLabel, active && styles.statusStepLabelActive]}>
                    {step.key === "sent"
                      ? s.statusRequestSent
                      : step.key === "confirmed"
                        ? s.statusConfirmed
                        : step.key === "picked"
                          ? s.statusPickedUp
                          : step.key === "onWay"
                            ? s.statusOnTheWay
                            : s.statusCompleted}
                  </Text>
                  {active ? <Text style={styles.statusStepTime}>{placedAtLabel}</Text> : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        <AppCtaButton
          label={s.trackOrder}
          onPress={leaveToOrder}
          width="full"
          rightIcon="arrow-right"
        />
        <AppCtaButton
          label={s.backToHome}
          onPress={leaveToHome}
          width="full"
          variant="outline"
          style={styles.homeBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  headerSafe: { backgroundColor: UI.bg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  headerCopy: { flex: 1 },
  headerSide: { width: 36, height: 36 },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  hero: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
    overflow: "visible",
  },
  celebrationHost: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    overflow: "visible",
  },
  successRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: UI.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  successBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: UI.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    textAlign: "center",
  },
  heroMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  orderChip: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  orderChipText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.purple,
  },
  placedAt: {
    marginTop: 8,
    fontSize: 12,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 14,
    gap: 10,
  },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  providerImage: { width: 52, height: 52, borderRadius: 12, backgroundColor: UI.iconWell },
  providerImageFallback: { alignItems: "center", justifyContent: "center" },
  providerCopy: { flex: 1, minWidth: 0, gap: 4 },
  providerName: { fontSize: 15, fontFamily: "Poppins-Bold", color: UI.text },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Poppins-SemiBold", color: UI.text },
  metaMuted: { fontSize: 12, fontFamily: "Poppins-Regular", color: UI.muted },
  metaDot: { fontSize: 12, color: UI.muted },
  openText: { fontSize: 12, fontFamily: "Poppins-SemiBold", color: UI.open },
  closedText: { color: UI.closed },
  viewProviderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  viewProviderText: { fontSize: 11, fontFamily: "Poppins-SemiBold", color: UI.purple },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontFamily: "Poppins-Bold", color: UI.text },
  inlineLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  inlineLinkText: { fontSize: 12, fontFamily: "Poppins-SemiBold", color: UI.purple },
  serviceBlock: { paddingVertical: 10, gap: 8 },
  serviceBlockBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  serviceRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  serviceImage: { width: 48, height: 48, borderRadius: 10, backgroundColor: UI.iconWell },
  serviceCopy: { flex: 1, minWidth: 0, gap: 2 },
  serviceName: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: UI.text },
  unitPrice: { fontSize: 12, fontFamily: "Poppins-Regular", color: UI.muted },
  lineTotal: { fontSize: 14, fontFamily: "Poppins-Bold", color: UI.text },
  addonRow: { paddingLeft: 58 },
  addonText: { fontSize: 12, fontFamily: "Poppins-Regular", color: UI.muted },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoIconBlue: { backgroundColor: "#EFF6FF" },
  infoCopy: { flex: 1, minWidth: 0, gap: 2 },
  infoBody: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: UI.text },
  infoMeta: { fontSize: 12, fontFamily: "Poppins-Regular", color: UI.muted },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  totalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  totalCopy: { flex: 1, minWidth: 0, gap: 4 },
  totalLabel: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: UI.text },
  totalValue: { fontSize: 20, fontFamily: "Poppins-Bold", color: UI.text },
  totalHint: { fontSize: 11, lineHeight: 16, fontFamily: "Poppins-Regular", color: UI.muted },
  statusCard: {
    backgroundColor: UI.mint,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusTitle: { fontSize: 15, fontFamily: "Poppins-Bold", color: UI.open },
  statusWaiting: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  statusWaitingText: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "right",
  },
  statusTrack: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
    position: "relative",
  },
  statusRail: {
    position: "absolute",
    left: "10%",
    right: "10%",
    top: 18,
    height: 2,
    backgroundColor: "#D1D5DB",
    borderRadius: 1,
  },
  statusStep: { flex: 1, alignItems: "center", gap: 6 },
  statusDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: UI.card,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  statusDotActive: { backgroundColor: UI.teal, borderColor: UI.teal },
  statusStepLabel: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
    fontFamily: "Poppins-Medium",
    color: UI.muted,
  },
  statusStepLabelActive: { color: UI.open, fontFamily: "Poppins-SemiBold" },
  statusStepTime: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  homeBtn: { marginBottom: 2 },
});
