import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { theme } from "@/constants/theme";
import { getOrderDetail, type DemoOrderDetail } from "@/data/demo-order-details";
import { useLocale } from "@/contexts/locale-context";
import { fetchPartnerOrderDetail, type PartnerOrderDetailData } from "@/lib/partner-orders";
import { partnerUpdateOrderStatus } from "@/lib/partner-order-status";
import { getStrings } from "@/locales";
import { parsePriceDisplay, currencyPrefixFromDisplay } from "@/utils/parse-price-display";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;
const CARD_RADIUS = 18;
const REJECTION_OPTIONS = [
  "Items not serviceable",
  "Capacity full for selected slot",
  "Pickup area not covered",
  "Pricing mismatch",
  "Other",
] as const;
type RejectionOption = (typeof REJECTION_OPTIONS)[number];

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatMoney(value: string) {
  const numeric = parsePriceDisplay(String(value ?? ""));
  if (numeric == null) return String(value ?? "");
  const prefix = currencyPrefixFromDisplay(String(value ?? "")) || "Rs ";
  return `${prefix}${numeric % 1 === 0 ? numeric.toFixed(0) : numeric.toFixed(2)}`;
}

function mapDemoDetail(detail: DemoOrderDetail): PartnerOrderDetailData {
  const bags = detail.bags.map((bag) => ({
    id: bag.id,
    label: bag.label,
    service: bag.service,
    weight: bag.weight,
    numItems: bag.numItems,
    preferences: bag.preferences,
    estimatedPrice: bag.estimatedPrice,
  }));
  return {
    orderId: detail.orderId,
    orderNumber: detail.orderNumber,
    status:
      detail.status === "rejected"
        ? "rejected"
        : detail.status === "accepted"
          ? "accepted"
          : "pending",
    rawStatus:
      detail.status === "rejected"
        ? "rejected"
        : detail.status === "accepted"
          ? "accepted"
          : "submitted",
    clientName: detail.clientName,
    clientInitial: detail.clientInitial,
    phone: detail.phone,
    addressLine1: detail.addressLine1,
    addressLine2: detail.addressLine2,
    cityStateZip: detail.cityStateZip,
    pickup: detail.pickup,
    delivery: detail.delivery,
    courier: detail.courier,
    estimatedTotal: bags[0]?.estimatedPrice ?? "0",
    totalItems: String(
      bags.reduce((sum, bag) => sum + (Number.parseInt(bag.numItems, 10) || 0), 0),
    ),
    servicesSummary: Array.from(new Set(bags.map((bag) => bag.service))).join(", "),
    notes: Array.from(new Set(bags.map((bag) => bag.preferences).filter(Boolean))).join("\n"),
    rejectionReasonOption: null,
    rejectionReasonDetails: null,
    bags,
    serviceGroups: [
      {
        id: detail.orderId,
        title: "Order items",
        instructions:
          Array.from(new Set(bags.map((bag) => bag.preferences).filter(Boolean))).join("\n") ||
          "No special instructions",
        estimatedPrice: bags[0]?.estimatedPrice ?? "0",
        items: bags,
      },
    ],
  };
}

export default function PartnerOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.order;
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [liveDetail, setLiveDetail] = useState<PartnerOrderDetailData | null>(null);
  const [isLoadingLiveDetail, setIsLoadingLiveDetail] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRejectionOption, setSelectedRejectionOption] = useState<RejectionOption | null>(null);
  const [otherRejectionReason, setOtherRejectionReason] = useState("");

  const detail = useMemo(
    () => (params.orderId ? getOrderDetail(params.orderId) : null),
    [params.orderId],
  );

  const handleBack = () => router.back();
  const orderIdParam = typeof params.orderId === "string" ? params.orderId : "";

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  const shouldLoadLiveOrder = Boolean(orderIdParam && isUuid(orderIdParam));

  useEffect(() => {
    let cancelled = false;
    if (!shouldLoadLiveOrder) {
      setLiveDetail(null);
      setIsLoadingLiveDetail(false);
      return;
    }

    setIsLoadingLiveDetail(true);
    fetchPartnerOrderDetail(orderIdParam)
      .then((data) => {
        if (!cancelled) setLiveDetail(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setLiveDetail(null);
          Alert.alert(
            "Unable to load order detail",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLiveDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderIdParam, shouldLoadLiveOrder]);

  const resolvedDetail = liveDetail ?? detail;

  const handleOrderAction = async (
    target: "accepted" | "rejected" | "ready" | "completed",
    rejectionPayload?: { option: string; details?: string },
  ) => {
    if (!orderIdParam || !isUuid(orderIdParam)) {
      Alert.alert(
        "Demo order",
        "This order detail is using demo data. Live actions only work for real database orders.",
      );
      return;
    }

    try {
      if (target === "rejected") {
        setIsRejecting(true);
      } else {
        setIsConfirming(true);
      }
      const result = await partnerUpdateOrderStatus(orderIdParam, target, rejectionPayload);
      setLiveDetail((prev) =>
        prev
          ? {
              ...prev,
              status:
                target === "rejected"
                  ? "rejected"
                  : target === "completed"
                    ? "accepted"
                    : "accepted",
              rawStatus: result.status,
              rejectionReasonOption:
                target === "rejected"
                  ? rejectionPayload?.option ?? null
                  : prev.rejectionReasonOption,
              rejectionReasonDetails:
                target === "rejected"
                  ? rejectionPayload?.details?.trim() || null
                  : prev.rejectionReasonDetails,
            }
          : prev,
      );
      if (target === "ready") {
        Alert.alert("Order marked ready", "Order is ready for pick up / delivery.");
      } else if (target === "completed") {
        Alert.alert(
          "Order completed",
          `Charged: ${result.charged} credits\nCurrent balance: ${result.balance} credits`,
          [
            {
              text: "OK",
              onPress: () =>
                router.navigate({
                  pathname: "/(partner)/order",
                  params: { filter: "accepted" },
                }),
            },
          ],
        );
      } else if (target === "accepted") {
        Alert.alert("Order accepted", "The order has been accepted.", [
          {
            text: "OK",
            onPress: () =>
              router.navigate({
                pathname: "/(partner)/order",
                params: { filter: "accepted" },
              }),
          },
        ]);
      } else {
        Alert.alert("Order rejected", "The order has been rejected.");
      }
    } catch (error) {
      const actionLabel =
        target === "accepted"
          ? "accept"
          : target === "ready"
            ? "mark ready"
            : target === "completed"
              ? "complete"
              : "reject";
      Alert.alert(
        `Unable to ${actionLabel} order`,
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsConfirming(false);
      setIsRejecting(false);
    }
  };

  const submitRejection = () => {
    if (!selectedRejectionOption) {
      Alert.alert("Select rejection reason", "Please choose a reason before rejecting this order.");
      return;
    }
    const details = selectedRejectionOption === "Other" ? otherRejectionReason.trim() : "";
    if (selectedRejectionOption === "Other" && details.length === 0) {
      Alert.alert("Add details", "Please explain the rejection reason in the input box.");
      return;
    }
    setRejectModalVisible(false);
    void handleOrderAction("rejected", {
      option: selectedRejectionOption,
      details,
    });
  };

  const header = (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppHeader
        title={s.orderDetailTitle}
        leftIcon="arrow-left"
        onLeftPress={handleBack}
        leftAccessibilityLabel={s.orderDetailTitle}
      />
    </SafeAreaView>
  );

  if (resolvedDetail == null && !isLoadingLiveDetail) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Order not found.</Text>
        </View>
      </View>
    );
  }

  if (isLoadingLiveDetail && resolvedDetail == null) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading order...</Text>
        </View>
      </View>
    );
  }

  const finalDetail: PartnerOrderDetailData = liveDetail
    ? liveDetail
    : mapDemoDetail(detail!);
  const fullAddress = [finalDetail.addressLine1, finalDetail.addressLine2, finalDetail.cityStateZip]
    .filter((value) => Boolean(value?.trim()))
    .join("\n");
  const isPending = finalDetail.status === "pending";
  const statusColor =
    finalDetail.status === "rejected"
      ? "#D9534F"
      : finalDetail.status === "accepted"
        ? c.outline
        : c.white;

  return (
    <View style={styles.container}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.orderIdText}>
                {s.orderIdLabel.replace("{{number}}", finalDetail.orderNumber)}
              </Text>
              <Text style={styles.heroSubtitle}>{finalDetail.servicesSummary}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  borderColor: statusColor,
                  backgroundColor: finalDetail.status === "rejected" ? c.white : "transparent",
                },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {formatStatusLabel(finalDetail.status)}
              </Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Estimated total</Text>
              <Text style={styles.metricValue}>{formatMoney(finalDetail.estimatedTotal)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Items</Text>
              <Text style={styles.metricValue}>{finalDetail.totalItems}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Services</Text>
              <Text style={styles.metricValue}>{finalDetail.serviceGroups.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{finalDetail.clientInitial}</Text>
            </View>
            <View style={styles.customerTextWrap}>
              <Text style={styles.clientName}>{finalDetail.clientName}</Text>
              <Text style={styles.phone}>{finalDetail.phone}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={c.outline} />
            <Text style={styles.infoValue}>{fullAddress || "Address not available"}</Text>
          </View>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(partner)/chat/[orderId]",
                params: { orderId: finalDetail.orderId },
              })
            }
            style={({ pressed }) => [
              styles.chatButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons name="chat-processing-outline" size={16} color={c.white} />
            <Text style={styles.chatButtonText}>Chat with customer</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={c.outline} />
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>{s.pickup}</Text>
              <Text style={styles.infoValue}>{finalDetail.pickup}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="package-variant-closed" size={18} color={c.outline} />
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>{s.delivery}</Text>
              <Text style={styles.infoValue}>{finalDetail.delivery}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-switch-outline" size={18} color={c.outline} />
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>{s.courier}</Text>
              <Text style={styles.infoValue}>
                {finalDetail.courier === "Not Yet Assigned"
                  ? s.notYetAssigned
                  : finalDetail.courier}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Services</Text>
          {finalDetail.serviceGroups.map((group) => (
            <View key={group.id} style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View>
                  <Text style={styles.serviceTitle}>{group.title}</Text>
                  <Text style={styles.serviceSubprice}>{formatMoney(group.estimatedPrice)}</Text>
                </View>
                <Text style={styles.serviceCount}>{group.items.length} line(s)</Text>
              </View>
              {group.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemMeta}>
                      {s.nbrOfItems}: {item.numItems}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {s.preferences}: {item.preferences}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>{formatMoney(item.estimatedPrice)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order notes</Text>
          <Text style={styles.notesText}>{finalDetail.notes}</Text>
        </View>
        {finalDetail.rawStatus === "rejected" ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Rejection reason</Text>
            <Text style={styles.notesText}>
              {finalDetail.rejectionReasonOption || "Not provided"}
            </Text>
            {finalDetail.rejectionReasonDetails ? (
              <Text style={styles.rejectionDetailText}>{finalDetail.rejectionReasonDetails}</Text>
            ) : null}
          </View>
        ) : null}

        {isPending ? (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => handleOrderAction("accepted")}
              disabled={isConfirming || isRejecting}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed && !(isConfirming || isRejecting) && styles.pressed,
                (isConfirming || isRejecting) && styles.disabled,
              ]}
            >
              <Text style={styles.primaryActionText}>
                {isConfirming ? "Accepting..." : "Accept order"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRejectModalVisible(true)}
              disabled={isConfirming || isRejecting}
              style={({ pressed }) => [
                styles.rejectAction,
                pressed && !(isConfirming || isRejecting) && styles.pressed,
                (isConfirming || isRejecting) && styles.disabled,
              ]}
            >
              <Text style={styles.rejectActionText}>
                {isRejecting ? "Rejecting..." : "Reject order"}
              </Text>
            </Pressable>
          </View>
        ) : finalDetail.rawStatus !== "completed" && finalDetail.status !== "rejected" ? (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => handleOrderAction("ready")}
              disabled={isConfirming || isRejecting}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && !(isConfirming || isRejecting) && styles.pressed,
                (isConfirming || isRejecting) && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryActionText}>
                {isConfirming ? "Updating..." : "Mark ready"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleOrderAction("completed")}
              disabled={isConfirming || isRejecting}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed && !(isConfirming || isRejecting) && styles.pressed,
                (isConfirming || isRejecting) && styles.disabled,
              ]}
            >
              <Text style={styles.primaryActionText}>
                {isConfirming ? "Completing..." : "Complete order"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.footerStatusCard}>
            <Text style={styles.footerStatusLabel}>Current status</Text>
            <Text style={[styles.footerStatusValue, { color: statusColor }]}>
              {formatStatusLabel(finalDetail.status)}
            </Text>
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRejectModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject order</Text>
            <Text style={styles.modalSubtitle}>Select a reason to notify the customer.</Text>
            <View style={styles.reasonList}>
              {REJECTION_OPTIONS.map((option) => {
                const selected = selectedRejectionOption === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setSelectedRejectionOption(option)}
                    style={({ pressed }) => [
                      styles.reasonOption,
                      selected && styles.reasonOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonOptionText,
                        selected && styles.reasonOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedRejectionOption === "Other" ? (
              <TextInput
                multiline
                value={otherRejectionReason}
                onChangeText={setOtherRejectionReason}
                placeholder="Write reason for rejection"
                placeholderTextColor={c.blue500}
                style={styles.otherReasonInput}
                textAlignVertical="top"
              />
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setRejectModalVisible(false)}
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitRejection}
                style={({ pressed }) => [styles.modalRejectBtn, pressed && styles.pressed]}
              >
                <Text style={styles.modalRejectText}>Reject order</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    paddingBottom: 8,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTitleWrap: {
    flex: 1,
  },
  orderIdText: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
  },
  heroSubtitle: {
    marginTop: 6,
    color: c.blue500,
    fontSize: fs.smallText,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: fs.inputTitle,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  metricLabel: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
    marginBottom: 6,
  },
  metricValue: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 18,
  },
  sectionTitle: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
    marginBottom: 14,
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
  },
  customerTextWrap: {
    flex: 1,
  },
  clientName: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
  },
  phone: {
    marginTop: 4,
    color: c.blue500,
    fontSize: fs.smallText,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  infoValue: {
    flex: 1,
    color: c.white,
    fontSize: fs.smallText,
    lineHeight: 22,
  },
  chatButton: {
    marginTop: 2,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.background,
  },
  chatButtonText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "600",
  },
  serviceCard: {
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  serviceTitle: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  serviceSubprice: {
    color: c.blue500,
    fontSize: fs.descText,
    marginTop: 4,
  },
  serviceCount: {
    color: c.white,
    fontSize: fs.descText,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  itemTextWrap: {
    flex: 1,
  },
  itemLabel: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemMeta: {
    color: c.blue500,
    fontSize: fs.descText,
    lineHeight: 18,
  },
  itemPrice: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  notesText: {
    color: c.white,
    fontSize: fs.smallText,
    lineHeight: 22,
  },
  rejectionDetailText: {
    color: c.blue500,
    fontSize: fs.descText,
    lineHeight: 20,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: c.lightBlue,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.filledButtonBorder,
  },
  primaryActionText: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9534F",
  },
  secondaryActionText: {
    color: "#D9534F",
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  rejectAction: {
    flex: 1,
    backgroundColor: c.white,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.white,
  },
  rejectActionText: {
    color: "#D9534F",
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  footerStatusCard: {
    alignItems: "center",
    paddingVertical: 18,
  },
  footerStatusLabel: {
    color: c.blue500,
    fontSize: fs.descText,
    marginBottom: 6,
  },
  footerStatusValue: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  bottomSpacing: {
    height: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: H_PAD,
  },
  emptyText: {
    fontSize: fs.smallText,
    color: c.blue500,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: H_PAD,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 14, 25, 0.65)",
  },
  modalCard: {
    width: "100%",
    backgroundColor: c.blue900,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 16,
  },
  modalTitle: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: c.blue500,
    fontSize: fs.descText,
    marginTop: 4,
    marginBottom: 12,
  },
  reasonList: {
    gap: 8,
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: c.background,
  },
  reasonOptionSelected: {
    borderColor: c.filledButtonBorder,
    backgroundColor: "rgba(31, 200, 255, 0.1)",
  },
  reasonOptionText: {
    color: c.white,
    fontSize: fs.descText,
  },
  reasonOptionTextSelected: {
    color: c.lightBlue,
    fontWeight: "700",
  },
  otherReasonInput: {
    marginTop: 12,
    minHeight: 84,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.white,
    fontSize: fs.descText,
  },
  modalActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.outline,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  modalRejectBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D9534F",
    backgroundColor: c.white,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalRejectText: {
    color: "#D9534F",
    fontSize: fs.descText,
    fontWeight: "700",
  },
});
