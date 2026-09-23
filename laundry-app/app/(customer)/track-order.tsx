import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { AppCtaButton } from "@/components/ui/cta-button";
import { GradientLoader, APP_LOADER_TINT } from "@/components/ui/gradient-loader";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { UI } from "@/constants/theme";
import {
  fetchCustomerOrderDetail,
  type CustomerOrderDbStatus,
  type CustomerOrderDetailData,
  type CustomerOrderDetailLineItem,
} from "@/lib/customer-orders";
import { imageForServiceItem } from "@/lib/service-item-images";
import { getStrings } from "@/locales";
import { getDeviceCoordinates } from "@/utils/device-location";
import type { Coordinates } from "@/utils/geocoding";
import { getPartnerOpenStatus } from "@/utils/partner-hours";

type TrackStepKey = "sent" | "confirmed" | "picked" | "onWay" | "completed";

type TrackStep = {
  key: TrackStepKey;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const STEPS: TrackStep[] = [
  { key: "sent", icon: "check" },
  { key: "confirmed", icon: "storefront-outline" },
  { key: "picked", icon: "shopping-outline" },
  { key: "onWay", icon: "truck-delivery-outline" },
  { key: "completed", icon: "check-circle-outline" },
];

function stepIndexForStatus(status: CustomerOrderDbStatus): number {
  switch (status) {
    case "draft":
    case "submitted":
      return 0;
    case "accepted":
      return 1;
    case "in_progress":
      return 2;
    case "ready":
      return 3;
    case "completed":
      return 4;
    case "rejected":
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}

function formatPlacedAt(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  if (km < 1) return `${Math.max(0.1, km).toFixed(1)} km`;
  return `${km.toFixed(1)} km`;
}

function parseAddOns(instructions: string) {
  if (!instructions || instructions === "None") return [];
  const match = instructions.match(/Add-ons:\s*(.+)/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serviceJobFromTitle(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("dry")) return "dryCleaning";
  if (lower.includes("press") || lower.includes("iron")) return "ironing";
  if (lower.includes("tailor")) return "tailoring";
  return "washAndFold";
}

export default function TrackOrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.trackOrder;
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CustomerOrderDetailData | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);

  const footerBottom = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0, 12);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!user?.id || !orderId) {
        setLoading(false);
        setOrder(null);
        setError(null);
        return;
      }
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const detail = await fetchCustomerOrderDetail(user.id, orderId);
        setOrder(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : s.loadError);
        setOrder(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, s.loadError, user?.id],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  useEffect(() => {
    void getDeviceCoordinates().then((coords) => {
      if (coords) setUserCoords(coords);
    });
  }, []);

  const activeIndex = order ? stepIndexForStatus(order.rawStatus) : 0;
  const isTerminalBad =
    order?.rawStatus === "rejected" || order?.rawStatus === "cancelled";

  const openStatus = getPartnerOpenStatus(order?.partnerAvailableTime);
  const ratingLabel =
    order?.partnerRatingAvg != null && order.partnerRatingCount > 0
      ? Number.isInteger(order.partnerRatingAvg)
        ? String(order.partnerRatingAvg)
        : order.partnerRatingAvg.toFixed(1)
      : null;

  const distanceLabel = useMemo(() => {
    if (
      !userCoords ||
      order?.partnerLatitude == null ||
      order?.partnerLongitude == null
    ) {
      return null;
    }
    return formatKm(
      distanceKm(userCoords, {
        latitude: order.partnerLatitude,
        longitude: order.partnerLongitude,
      }),
    );
  }, [order?.partnerLatitude, order?.partnerLongitude, userCoords]);

  const statusBadge = useMemo(() => {
    if (!order) return { label: "", icon: "clock-outline" as const };
    if (isTerminalBad) {
      return { label: s.statusCancelledBadge, icon: "close-circle-outline" as const };
    }
    switch (order.rawStatus) {
      case "accepted":
        return { label: s.statusConfirmedBadge, icon: "check-circle-outline" as const };
      case "in_progress":
        return { label: s.statusProcessingBadge, icon: "progress-clock" as const };
      case "ready":
        return { label: s.statusReadyBadge, icon: "truck-delivery-outline" as const };
      case "completed":
        return { label: s.statusCompletedBadge, icon: "check-circle" as const };
      default:
        return { label: s.waitingForConfirmation, icon: "clock-outline" as const };
    }
  }, [isTerminalBad, order, s]);

  const serviceItems = useMemo(() => {
    if (!order) return [] as Array<{
      item: CustomerOrderDetailLineItem;
      groupTitle: string;
      addOns: string[];
    }>;
    return order.serviceGroups.flatMap((group) => {
      const addOns = parseAddOns(group.instructions);
      return group.items.map((item, index) => ({
        item,
        groupTitle: group.title,
        addOns: index === group.items.length - 1 ? addOns : [],
      }));
    });
  }, [order]);

  const visibleServiceItems = useMemo(() => {
    if (showAllServices || serviceItems.length <= 3) return serviceItems;
    return serviceItems.slice(0, 3);
  }, [serviceItems, showAllServices]);

  const hasMoreServices = serviceItems.length > 3;

  const canEditSchedule =
    order?.displayStatus === "pending" && order.fulfillmentMode === "pickupDelivery";

  const stepCopy = (key: TrackStepKey) => {
    const dropoffReady = order?.fulfillmentMode === "dropoff";
    switch (key) {
      case "sent":
        return { title: s.stepSent, hint: s.stepSentHint };
      case "confirmed":
        return { title: s.stepConfirmed, hint: s.stepConfirmedHint };
      case "picked":
        return { title: s.stepPickedUp, hint: s.stepPickedUpHint };
      case "onWay":
        return dropoffReady
          ? { title: s.stepReadyPickup, hint: s.stepReadyPickupHint }
          : { title: s.stepOnTheWay, hint: s.stepOnTheWayHint };
      case "completed":
        return { title: s.stepCompleted, hint: s.stepCompletedHint };
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(customer)/(tabs)/order");
  };

  const openChat = () => {
    if (!order) return;
    router.push({
      pathname: "/(customer)/chat/[orderId]",
      params: { orderId: order.id },
    });
  };

  const openCall = () => {
    const phone = order?.partnerPhone?.trim();
    if (!phone || phone === "Not provided") {
      showAppAlert(s.callProvider, s.noPhone);
      return;
    }
    void Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
  };

  const openOrderDetail = () => {
    if (!order) return;
    router.push({
      pathname: "/(customer)/order-detail",
      params: { orderId: order.id },
    });
  };

  const openProvider = () => {
    if (!order) return;
    router.push({
      pathname: "/(customer)/launderer-detail",
      params: {
        id: order.partnerId,
        name: order.partnerName,
        mode: order.fulfillmentMode,
      },
    });
  };

  const scheduleDay =
    order?.pickupDayLabel || order?.deliveryDayLabel || s.schedulePending;
  const scheduleTime = order?.pickupTimeLabel || order?.deliveryTimeLabel || "";
  const pickupAddress =
    order?.customerPickupAddress?.trim() ||
    (order?.fulfillmentMode === "dropoff" ? s.dropoffTitle : order?.partnerAddress);

  const hasPhone = Boolean(order?.partnerPhone?.trim() && order.partnerPhone !== "Not provided");

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleBack}
            style={styles.roundBtn}
            accessibilityRole="button"
            accessibilityLabel={s.back}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={UI.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{s.title}</Text>
            {order ? (
              <Text style={styles.headerRef}>
                {fill(s.orderRef, { ref: order.orderRef })}
              </Text>
            ) : null}
          </View>
          <View style={styles.roundBtnPlaceholder} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <GradientLoader />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <AppCtaButton label={s.retry} onPress={() => void load("initial")} width="auto" />
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{s.notFound}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load("refresh")}
                tintColor={APP_LOADER_TINT}
              />
            }
          >
            <View style={styles.card}>
              <View style={styles.providerRow}>
                {order.partnerImageUrl ? (
                  <Image
                    source={{ uri: order.partnerImageUrl }}
                    style={styles.providerImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.providerImage, styles.providerImageFallback]}>
                    <MaterialCommunityIcons name="storefront-outline" size={22} color={UI.muted} />
                  </View>
                )}
                <View style={styles.providerCopy}>
                  <PartnerNameWithBadge
                    name={order.partnerName}
                    verified={order.partnerVerified}
                    nameStyle={styles.providerName}
                  />
                  <View style={styles.metaRow}>
                    {ratingLabel ? (
                      <>
                        <MaterialCommunityIcons name="star" size={13} color={UI.star} />
                        <Text style={styles.metaStrong}>{ratingLabel}</Text>
                        <Text style={styles.metaMuted}>
                          {fill(s.reviewsCount, { count: order.partnerRatingCount })}
                        </Text>
                        {distanceLabel ? <Text style={styles.metaDot}>•</Text> : null}
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
                <Pressable onPress={openProvider} style={styles.viewProviderBtn} hitSlop={8}>
                  <Text style={styles.viewProviderText}>{s.viewProvider}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={UI.purple} />
                </Pressable>
              </View>

              <View style={styles.providerActions}>
                <Pressable
                  onPress={openChat}
                  style={({ pressed }) => [styles.providerActionBtn, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="chat-processing-outline" size={18} color={UI.purpleDeep} />
                  <Text style={styles.providerActionText}>{s.chat}</Text>
                </Pressable>
                <Pressable
                  onPress={openCall}
                  style={({ pressed }) => [styles.providerActionBtn, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="phone-outline" size={18} color={UI.purpleDeep} />
                  <Text style={styles.providerActionText}>{s.call}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{s.orderStatus}</Text>
                <View style={styles.statusBadge}>
                  <MaterialCommunityIcons name={statusBadge.icon} size={13} color={UI.purpleDeep} />
                  <Text style={styles.statusBadgeText}>{statusBadge.label}</Text>
                </View>
              </View>

              {isTerminalBad ? (
                <Text style={styles.mutedLeft}>
                  {order.rejectionReasonDetails ||
                    order.rejectionReasonOption ||
                    s.statusCancelledBadge}
                </Text>
              ) : (
                <View style={styles.timeline}>
                  {STEPS.map((step, index) => {
                    const done = activeIndex > index;
                    const current = activeIndex === index;
                    const copy = stepCopy(step.key);
                    const showTime =
                      (current || done) &&
                      index === 0 &&
                      order.placedAtIso
                        ? formatPlacedAt(order.placedAtIso)
                        : (current || done) && index === 1 && order.confirmedAt
                          ? formatPlacedAt(order.confirmedAt)
                          : null;
                    return (
                      <View key={step.key} style={styles.timelineRow}>
                        <View style={styles.timelineRail}>
                          <View
                            style={[
                              styles.timelineDot,
                              done && styles.timelineDotDone,
                              current && styles.timelineDotCurrent,
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={done ? "check" : step.icon}
                              size={14}
                              color={done || current ? "#FFFFFF" : UI.muted}
                            />
                          </View>
                          {index < STEPS.length - 1 ? (
                            <View
                              style={[
                                styles.timelineLine,
                                (done || current) && styles.timelineLineActive,
                              ]}
                            />
                          ) : null}
                        </View>
                        <View style={styles.timelineCopy}>
                          <Text
                            style={[
                              styles.timelineTitle,
                              (done || current) && styles.timelineTitleActive,
                            ]}
                          >
                            {copy.title}
                          </Text>
                          {showTime ? (
                            <Text style={styles.timelineTime}>{showTime}</Text>
                          ) : null}
                          <Text style={styles.timelineHint}>{copy.hint}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {order.fulfillmentMode === "pickupDelivery" ? (
              <View style={styles.card}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>{s.pickupDeliveryDetails}</Text>
                  {canEditSchedule ? (
                    <Pressable onPress={openOrderDetail} hitSlop={8}>
                      <Text style={styles.inlineLinkText}>{s.edit}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.pickupGrid}>
                  <View style={styles.pickupLeft}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={UI.muted} />
                    <View style={styles.flex1}>
                      <Text style={styles.pickupLabel}>{s.pickupFrom}</Text>
                      <Text style={styles.pickupValue}>{pickupAddress}</Text>
                    </View>
                  </View>
                  <View style={styles.pickupDivider} />
                  <View style={styles.pickupRight}>
                    <View style={styles.scheduleRow}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={15} color={UI.muted} />
                      <Text style={styles.scheduleText}>{scheduleDay}</Text>
                    </View>
                    {scheduleTime ? (
                      <View style={styles.scheduleRow}>
                        <MaterialCommunityIcons name="clock-outline" size={15} color={UI.muted} />
                        <Text style={styles.scheduleText}>{scheduleTime}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>
                  {s.yourServices} ({serviceItems.length})
                </Text>
                <Pressable onPress={openOrderDetail} hitSlop={8} style={styles.inlineLink}>
                  <Text style={styles.inlineLinkText}>{s.viewDetails}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={UI.purple} />
                </Pressable>
              </View>
              {visibleServiceItems.map(({ item, groupTitle, addOns }, index) => {
                const qty = Math.max(1, item.confirmedQuantity ?? item.quantity);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.serviceBlock,
                      index < visibleServiceItems.length - 1 || hasMoreServices
                        ? styles.serviceBlockBorder
                        : null,
                    ]}
                  >
                    <View style={styles.serviceRow}>
                      <Image
                        source={imageForServiceItem(undefined, item.name, serviceJobFromTitle(groupTitle))}
                        style={styles.serviceImage}
                        contentFit="cover"
                      />
                      <View style={styles.serviceCopy}>
                        <Text style={styles.serviceName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.metaMuted}>{fill(s.pieces, { count: qty })}</Text>
                      </View>
                      <Text style={styles.lineTotal}>
                        {item.confirmedPriceLabel || item.estimatedPriceLabel}
                      </Text>
                    </View>
                    {addOns.map((addon) => (
                      <View key={`${item.id}-${addon}`} style={styles.addonRow}>
                        <MaterialCommunityIcons name="sparkles" size={14} color={UI.purple} />
                        <Text style={styles.addonText}>{addon}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
              {hasMoreServices ? (
                <Pressable
                  onPress={() => setShowAllServices((prev) => !prev)}
                  style={({ pressed }) => [styles.showAllBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.showAllText}>
                    {showAllServices ? s.showLess : s.showAll}
                  </Text>
                  <MaterialCommunityIcons
                    name={showAllServices ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={UI.purple}
                  />
                </Pressable>
              ) : null}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: footerBottom }]}>
            <View style={styles.totalCard}>
              <View style={styles.totalIcon}>
                <MaterialCommunityIcons name="receipt" size={18} color="#2563EB" />
              </View>
              <View style={styles.totalCopy}>
                <Text style={styles.totalLabel}>{s.estimatedTotal}</Text>
                <Text style={styles.totalHint}>{s.finalAmountHint}</Text>
              </View>
              <Text style={styles.totalValue}>
                {order.confirmedTotalLabel || order.grandTotalLabel || order.estimatedTotalLabel}
              </Text>
            </View>
            <View style={styles.footerRow}>
              <AppCtaButton
                label={s.chatProvider}
                onPress={openChat}
                width={hasPhone ? 55 : "full"}
                leftIcon="chat-processing-outline"
              />
              {hasPhone ? (
                <AppCtaButton
                  label={s.callProvider}
                  onPress={openCall}
                  width={45}
                  variant="outline"
                  leftIcon="phone-outline"
                />
              ) : null}
            </View>
          </View>
        </>
      )}
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
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    textAlign: "center",
  },
  headerRef: {
    marginTop: 1,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
    textAlign: "center",
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  roundBtnPlaceholder: { width: 36, height: 36 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.red,
    textAlign: "center",
  },
  muted: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
  },
  mutedLeft: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 19,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },
  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 14,
    gap: 12,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  providerImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: UI.iconWell,
  },
  providerImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  providerCopy: { flex: 1, minWidth: 0, gap: 3 },
  providerName: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  metaStrong: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  metaMuted: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  metaDot: {
    fontSize: 12,
    color: UI.muted,
    marginHorizontal: 2,
  },
  openText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.openText,
  },
  closedText: {
    color: UI.red,
  },
  viewProviderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
  },
  viewProviderText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.purple,
  },
  providerActions: {
    flexDirection: "row",
    gap: 10,
  },
  providerActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#F3F0FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  providerActionText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.purpleDeep,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3F0FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: "58%",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: UI.purpleDeep,
    flexShrink: 1,
  },
  timeline: {
    gap: 0,
    paddingTop: 4,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
  },
  timelineRail: {
    width: 28,
    alignItems: "center",
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.card,
    borderWidth: 1.5,
    borderColor: UI.chipBorder,
  },
  timelineDotDone: {
    backgroundColor: UI.teal,
    borderColor: UI.teal,
  },
  timelineDotCurrent: {
    backgroundColor: UI.teal,
    borderColor: UI.teal,
  },
  timelineLine: {
    flex: 1,
    width: 0,
    marginTop: 4,
    marginBottom: 4,
    borderLeftWidth: 2,
    borderStyle: "dashed",
    borderColor: UI.chipBorder,
  },
  timelineLineActive: {
    borderColor: UI.teal,
  },
  timelineCopy: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: 14,
    gap: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
  },
  timelineTitleActive: {
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  timelineTime: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  timelineHint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  pickupGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  pickupLeft: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  pickupRight: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  pickupDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: UI.chipBorder,
    alignSelf: "stretch",
  },
  pickupLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
    marginBottom: 2,
  },
  pickupValue: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduleText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  flex1: { flex: 1, minWidth: 0 },
  inlineLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  inlineLinkText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.purple,
  },
  serviceBlock: {
    gap: 8,
    paddingBottom: 12,
  },
  serviceBlockBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
    marginBottom: 4,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serviceImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: UI.iconWell,
  },
  serviceCopy: { flex: 1, minWidth: 0, gap: 2 },
  serviceName: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  lineTotal: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  addonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 58,
  },
  addonText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
  },
  totalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  totalCopy: { flex: 1, minWidth: 0, gap: 2 },
  totalLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  totalHint: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  showAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 4,
    paddingBottom: 2,
  },
  showAllText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.purple,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pressed: { opacity: 0.85 },
});
