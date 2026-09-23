import { MaterialCommunityIcons } from "@expo/vector-icons";
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
} from "@/lib/customer-orders";
import { getStrings } from "@/locales";

type TrackStepKey = "sent" | "confirmed" | "processing" | "ready" | "completed";

type TrackStep = {
  key: TrackStepKey;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const STEPS: TrackStep[] = [
  { key: "sent", icon: "send-check-outline" },
  { key: "confirmed", icon: "storefront-outline" },
  { key: "processing", icon: "washing-machine" },
  { key: "ready", icon: "truck-delivery-outline" },
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
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
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

  const activeIndex = order ? stepIndexForStatus(order.rawStatus) : 0;
  const isTerminalBad =
    order?.rawStatus === "rejected" || order?.rawStatus === "cancelled";

  const hero = useMemo(() => {
    if (!order) return { title: "", subtitle: "" };
    if (order.rawStatus === "rejected") {
      return { title: s.heroRejected, subtitle: s.heroRejectedHint };
    }
    if (order.rawStatus === "cancelled") {
      return { title: s.heroCancelled, subtitle: s.heroCancelledHint };
    }
    if (order.rawStatus === "submitted" || order.rawStatus === "draft") {
      return { title: s.heroWaiting, subtitle: s.heroWaitingHint };
    }
    if (order.rawStatus === "accepted") {
      return { title: s.heroConfirmed, subtitle: s.heroConfirmedHint };
    }
    if (order.rawStatus === "in_progress") {
      return { title: s.heroProcessing, subtitle: s.heroProcessingHint };
    }
    if (order.rawStatus === "ready") {
      return {
        title: order.fulfillmentMode === "pickupDelivery" ? s.heroReadyDelivery : s.heroReadyPickup,
        subtitle:
          order.fulfillmentMode === "pickupDelivery"
            ? s.heroReadyDeliveryHint
            : s.heroReadyPickupHint,
      };
    }
    return { title: s.heroCompleted, subtitle: s.heroCompletedHint };
  }, [order, s]);

  const nextAction = useMemo(() => {
    if (!order || isTerminalBad) return null;
    if (order.rawStatus === "submitted" || order.rawStatus === "draft") {
      return { icon: "timer-sand" as const, title: s.nextWaiting, body: s.nextWaitingBody };
    }
    if (order.rawStatus === "accepted") {
      return {
        icon: "calendar-clock" as const,
        title: s.nextPickup,
        body: order.pickupSchedule || s.nextPickupFallback,
      };
    }
    if (order.rawStatus === "in_progress") {
      return { icon: "washing-machine" as const, title: s.nextProcessing, body: s.nextProcessingBody };
    }
    if (order.rawStatus === "ready") {
      return {
        icon: "map-marker-outline" as const,
        title: s.nextReady,
        body: order.partnerAddress || s.nextReadyFallback,
      };
    }
    return { icon: "star-outline" as const, title: s.nextDone, body: s.nextDoneBody };
  }, [isTerminalBad, order, s]);

  const stepLabel = (key: TrackStepKey) => {
    if (key === "sent") return s.stepSent;
    if (key === "confirmed") return s.stepConfirmed;
    if (key === "processing") return s.stepProcessing;
    if (key === "ready") {
      return order?.fulfillmentMode === "dropoff" ? s.stepReadyPickup : s.stepReady;
    }
    return s.stepCompleted;
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
    if (!phone) return;
    void Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
  };

  const openOrderDetail = () => {
    if (!order) return;
    router.push({
      pathname: "/(customer)/order-detail",
      params: { orderId: order.id },
    });
  };

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
            <MaterialCommunityIcons name="chevron-left" size={24} color={UI.text} />
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
            <View
              style={[
                styles.heroCard,
                isTerminalBad ? styles.heroCardBad : null,
                order.rawStatus === "completed" ? styles.heroCardDone : null,
              ]}
            >
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons
                  name={
                    isTerminalBad
                      ? "close-circle-outline"
                      : order.rawStatus === "completed"
                        ? "check-circle"
                        : "progress-clock"
                  }
                  size={28}
                  color={isTerminalBad ? UI.red : UI.teal}
                />
              </View>
              <Text style={styles.heroTitle}>{hero.title}</Text>
              <Text style={styles.heroSubtitle}>{hero.subtitle}</Text>
              {order.placedAtIso ? (
                <Text style={styles.heroMeta}>
                  {fill(s.updatedAt, { time: formatPlacedAt(order.placedAtIso) })}
                </Text>
              ) : null}
            </View>

            {!isTerminalBad ? (
              <View style={styles.timelineCard}>
                <Text style={styles.sectionTitle}>{s.timelineTitle}</Text>
                {STEPS.map((step, index) => {
                  const done = activeIndex > index;
                  const current = activeIndex === index;
                  const upcoming = activeIndex < index;
                  return (
                    <View key={step.key} style={styles.timelineRow}>
                      <View style={styles.timelineRail}>
                        <View
                          style={[
                            styles.timelineDot,
                            done && styles.timelineDotDone,
                            current && styles.timelineDotCurrent,
                            upcoming && styles.timelineDotUpcoming,
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
                              done && styles.timelineLineDone,
                            ]}
                          />
                        ) : null}
                      </View>
                      <View style={styles.timelineCopy}>
                        <Text
                          style={[
                            styles.timelineLabel,
                            (done || current) && styles.timelineLabelActive,
                          ]}
                        >
                          {stepLabel(step.key)}
                        </Text>
                        {current && order.placedAtIso && index === 0 ? (
                          <Text style={styles.timelineTime}>
                            {formatPlacedAt(order.placedAtIso)}
                          </Text>
                        ) : null}
                        {current && index > 0 && order.confirmedAt ? (
                          <Text style={styles.timelineTime}>
                            {formatPlacedAt(order.confirmedAt)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.timelineCard}>
                <Text style={styles.sectionTitle}>{s.timelineTitle}</Text>
                <Text style={styles.muted}>
                  {order.rejectionReasonDetails ||
                    order.rejectionReasonOption ||
                    (order.rawStatus === "cancelled" ? s.heroCancelledHint : s.heroRejectedHint)}
                </Text>
              </View>
            )}

            {nextAction ? (
              <View style={styles.nextCard}>
                <View style={styles.nextIcon}>
                  <MaterialCommunityIcons name={nextAction.icon} size={20} color={UI.purple} />
                </View>
                <View style={styles.nextCopy}>
                  <Text style={styles.nextTitle}>{nextAction.title}</Text>
                  <Text style={styles.nextBody}>{nextAction.body}</Text>
                </View>
              </View>
            ) : null}

            <Pressable style={styles.snapshotCard} onPress={openOrderDetail}>
              <View style={styles.snapshotTop}>
                <PartnerNameWithBadge
                  name={order.partnerName}
                  verified={order.partnerVerified}
                  nameStyle={styles.snapshotPartner}
                  containerStyle={styles.flex1}
                />
                <MaterialCommunityIcons name="chevron-right" size={20} color={UI.muted} />
              </View>
              <View style={styles.snapshotMeta}>
                <Text style={styles.snapshotMetaText}>
                  {fill(s.itemsCount, { count: order.totalItems })}
                </Text>
                <Text style={styles.snapshotDot}>·</Text>
                <Text style={styles.snapshotMetaText}>{order.estimatedTotalLabel}</Text>
              </View>
              {(order.pickupSchedule || order.deliverySchedule) && (
                <View style={styles.snapshotSchedule}>
                  {order.pickupSchedule ? (
                    <View style={styles.snapshotScheduleRow}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={14} color={UI.muted} />
                      <Text style={styles.snapshotScheduleText}>{order.pickupSchedule}</Text>
                    </View>
                  ) : null}
                  {order.deliverySchedule ? (
                    <View style={styles.snapshotScheduleRow}>
                      <MaterialCommunityIcons name="truck-delivery-outline" size={14} color={UI.muted} />
                      <Text style={styles.snapshotScheduleText}>{order.deliverySchedule}</Text>
                    </View>
                  ) : null}
                </View>
              )}
              <Text style={styles.viewFull}>{s.viewFullOrder}</Text>
            </Pressable>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: footerBottom }]}>
            <View style={styles.footerRow}>
              <AppCtaButton
                label={s.chat}
                onPress={openChat}
                width={order.partnerPhone?.trim() ? 55 : "full"}
                leftIcon="chat-processing-outline"
              />
              {order.partnerPhone?.trim() ? (
                <AppCtaButton
                  label={s.call}
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },
  heroCard: {
    backgroundColor: UI.mint,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  heroCardBad: {
    backgroundColor: UI.redBg,
    borderColor: "#FECACA",
  },
  heroCardDone: {
    backgroundColor: UI.mint,
    borderColor: "#6EE7B7",
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
  },
  heroMeta: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
  },
  timelineCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
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
    backgroundColor: UI.iconWell,
    borderWidth: 1.5,
    borderColor: UI.chipBorder,
  },
  timelineDotDone: {
    backgroundColor: UI.teal,
    borderColor: UI.teal,
  },
  timelineDotCurrent: {
    backgroundColor: UI.purple,
    borderColor: UI.purple,
  },
  timelineDotUpcoming: {
    backgroundColor: UI.card,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: UI.chipBorder,
    borderRadius: 1,
  },
  timelineLineDone: {
    backgroundColor: UI.teal,
  },
  timelineCopy: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 2,
  },
  timelineLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
  },
  timelineLabelActive: {
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  timelineTime: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  nextCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    padding: 14,
  },
  nextIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  nextCopy: { flex: 1, minWidth: 0, gap: 4 },
  nextTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  nextBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  snapshotCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 14,
    gap: 8,
  },
  snapshotTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flex1: { flex: 1, minWidth: 0 },
  snapshotPartner: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  snapshotMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  snapshotMetaText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
  },
  snapshotDot: { color: UI.muted },
  snapshotSchedule: { gap: 6, marginTop: 2 },
  snapshotScheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  snapshotScheduleText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  viewFull: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.purple,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
