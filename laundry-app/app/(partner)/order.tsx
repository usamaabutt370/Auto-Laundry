import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter, useNavigation } from "expo-router";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";

import { showAppAlert } from "@/components/app-alert";
import { AppHeader } from "@/components/app-header";
import { OrderCard } from "@/components/order-card";
import { useConfirmDialog } from "@/components/confirm-dialog";
import {
  PartnerOrderSuccessModal,
  type PartnerOrderSuccessPayload,
} from "@/components/partner-order-success-modal";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { PartnerRiderPickerModal } from "@/components/partner-rider-picker-modal";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  acceptOrderWithRider,
  partnerOrderNeedsRider,
} from "@/lib/order-rider-assignment";
import { partnerUpdateOrderStatus } from "@/lib/partner-order-status";
import { fetchPartnerOrders, type PartnerOrderListItem } from "@/lib/partner-orders";
import { fetchPartnerRiders, type PartnerRider } from "@/lib/partner-riders";
import { supabase } from "@/lib/supabase";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;
const REJECTION_OPTIONS = [
  "Items not serviceable",
  "Capacity full for selected slot",
  "Pickup area not covered",
  "Pricing mismatch",
  "Other",
] as const;
type RejectionOption = (typeof REJECTION_OPTIONS)[number];

type OrderFilter = "pending" | "accepted" | "completed" | "rejected";

export default function PartnerOrderScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { locale } = useLocale();
  const { user } = useAuth();
  const s = getStrings(locale).partner.order;

  const initialFilter =
    params.filter === "accepted" ||
    params.filter === "completed" ||
    params.filter === "rejected" ||
    params.filter === "pending"
      ? params.filter
      : "pending";
  const [orderFilter, setOrderFilter] = useState<OrderFilter>(initialFilter);
  const [orders, setOrders] = useState<PartnerOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [pendingRejectOrderId, setPendingRejectOrderId] = useState<string | null>(null);
  const [selectedRejectionOption, setSelectedRejectionOption] = useState<RejectionOption | null>(null);
  const [otherRejectionReason, setOtherRejectionReason] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const { isWeb } = useResponsiveLayout();
  const custStrings = getStrings(locale).customer.ordersTab;
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [pendingAcceptOrderId, setPendingAcceptOrderId] = useState<string | null>(null);
  const [partnerRiders, setPartnerRiders] = useState<PartnerRider[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<PartnerOrderSuccessPayload | null>(null);

  const filterLabels: Record<OrderFilter, string> = {
    pending: "Pending",
    accepted: "Accepted",
    completed: "Completed",
    rejected: "Rejected",
  };

  const loadOrders = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const data = await fetchPartnerOrders();
      setOrders(data);
    } catch (error) {
      showAppAlert(
        "Unable to load orders",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrderFilter(initialFilter);
  }, [initialFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadOrders(true);
    }, [loadOrders]),
  );

  // Auto-refresh when new orders arrive or existing orders are updated.
  const loadOrdersRef = useRef(loadOrders);
  loadOrdersRef.current = loadOrders;
  useEffect(() => {
    if (!supabase || !user?.id) return;
    const channel = supabase
      .channel(`partner_orders_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_orders",
          filter: `partner_id=eq.${user.id}`,
        },
        () => { void loadOrdersRef.current(false); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await loadOrders(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadOrders]);

  const filteredOrders = orders.filter((order) => {
    if (orderFilter === "pending") {
      return order.rawStatus === "submitted";
    }
    if (orderFilter === "accepted") {
      return (
        order.rawStatus === "accepted" ||
        order.rawStatus === "in_progress" ||
        order.rawStatus === "ready"
      );
    }
    if (orderFilter === "completed") {
      return order.rawStatus === "completed";
    }
    // rejected
    return order.rawStatus === "rejected" || order.rawStatus === "cancelled";
  });

  const handleOrderAction = useCallback(
    async (
      orderId: string,
      status: "accepted" | "rejected",
      rejectionPayload?: { option: string; details?: string },
    ) => {
      try {
        setActionOrderId(orderId);
        const result = await partnerUpdateOrderStatus(orderId, status, rejectionPayload);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: status === "rejected" ? "rejected" : "accepted",
                  rawStatus: result.status,
                }
              : order,
          ),
        );
        if (status === "accepted") {
          setSuccessPayload({ type: "accepted" });
        } else {
          showAppAlert("Order rejected", "The order has been rejected.");
        }
      } catch (error) {
        showAppAlert(
          `Unable to ${status === "accepted" ? "accept" : "reject"} order`,
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setActionOrderId(null);
      }
    },
    [],
  );

  const openAcceptFlow = useCallback(
    async (order: PartnerOrderListItem) => {
      if (!partnerOrderNeedsRider(order)) {
        void handleOrderAction(order.id, "accepted");
        return;
      }

      if (!user?.id) return;

      setPendingAcceptOrderId(order.id);
      setSelectedRiderId(null);
      setLoadingRiders(true);
      setRiderModalVisible(true);

      try {
        const riders = await fetchPartnerRiders(user.id);
        setPartnerRiders(riders);
        if (riders.length === 0) {
          setRiderModalVisible(false);
          setPendingAcceptOrderId(null);
          showAppAlert(s.noRidersTitle, s.noRidersMessage);
        }
      } catch (error) {
        setRiderModalVisible(false);
        setPendingAcceptOrderId(null);
        showAppAlert(
          "Unable to load riders",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setLoadingRiders(false);
      }
    },
    [
      handleOrderAction,
      s.noRidersMessage,
      s.noRidersTitle,
      user?.id,
    ],
  );

  const confirmRiderAccept = useCallback(async () => {
    if (!pendingAcceptOrderId || !user?.id) return;
    if (!selectedRiderId) {
      showAppAlert(s.selectRiderRequired);
      return;
    }

    try {
      setActionOrderId(pendingAcceptOrderId);
      await acceptOrderWithRider({
        orderId: pendingAcceptOrderId,
        partnerId: user.id,
        riderId: selectedRiderId,
      });
      setOrders((prev) =>
        prev.map((order) =>
          order.id === pendingAcceptOrderId
            ? {
                ...order,
                status: "accepted",
                rawStatus: "accepted",
              }
            : order,
        ),
      );
      setRiderModalVisible(false);
      setPendingAcceptOrderId(null);
      setSelectedRiderId(null);
      setSuccessPayload({ type: "accepted" });
    } catch (error) {
      showAppAlert(
        "Unable to accept order",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setActionOrderId(null);
    }
  }, [pendingAcceptOrderId, s.acceptSuccess, s.selectRiderRequired, selectedRiderId, user?.id]);

  const openRejectModal = useCallback((orderId: string) => {
    setPendingRejectOrderId(orderId);
    setSelectedRejectionOption(null);
    setOtherRejectionReason("");
    setRejectModalVisible(true);
  }, []);

  const submitRejection = useCallback(() => {
    if (!pendingRejectOrderId) return;
    if (!selectedRejectionOption) {
      showAppAlert("Select rejection reason", "Please choose a reason before rejecting this order.");
      return;
    }
    const details = selectedRejectionOption === "Other" ? otherRejectionReason.trim() : "";
    if (selectedRejectionOption === "Other" && details.length === 0) {
      showAppAlert("Add details", "Please explain the rejection reason in the input box.");
      return;
    }
    const orderId = pendingRejectOrderId;
    setRejectModalVisible(false);
    setPendingRejectOrderId(null);
    void handleOrderAction(orderId, "rejected", {
      option: selectedRejectionOption,
      details,
    });
  }, [handleOrderAction, otherRejectionReason, pendingRejectOrderId, selectedRejectionOption]);

  const handleCompleteOrder = useCallback(async (orderId: string) => {
    try {
      setActionOrderId(orderId);
      const result = await partnerUpdateOrderStatus(orderId, "completed");
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "completed",
                rawStatus: result.status,
              }
            : order,
        ),
      );
      setSuccessPayload({
        type: "completed",
        charged: result.charged,
        balance: result.balance,
      });
    } catch (error) {
      showAppAlert(
        "Unable to complete order",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setActionOrderId(null);
    }
  }, []);

  const confirmDelete = useCallback(
    async (orderId: string) => {
      const ok = await confirm({
        title: custStrings.deleteTitle,
        message: custStrings.deleteMessage,
        confirmLabel: custStrings.deleteAction,
        cancelLabel: custStrings.cancel,
        destructive: true,
      });
      if (!ok) return;
      try {
        try {
          await partnerUpdateOrderStatus(orderId, "cancelled");
        } catch {
          // ignore backend failure; still remove locally
        }
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } catch (e) {
        showAppAlert(
          custStrings.deleteError,
          e instanceof Error ? e.message : String(e),
        );
      }
    },
    [confirm, custStrings.cancel, custStrings.deleteAction, custStrings.deleteError, custStrings.deleteMessage, custStrings.deleteTitle],
  );

  return (
    <View style={styles.container}>
      {dialog}
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppHeader
          title={s.title}
         
          leftAccessibilityLabel={s.title}
        />
      </SafeAreaView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {(Object.keys(filterLabels) as OrderFilter[]).map((key) => {
          const selected = orderFilter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setOrderFilter(key)}
              style={({ pressed }) => [
                styles.filterChip,
                selected && styles.filterChipSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${filterLabels[key]} orders`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selected && styles.filterChipTextSelected,
                ]}
                numberOfLines={1}
              >
                {filterLabels[key]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
            progressBackgroundColor={c.blue900}
            progressViewOffset={8}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator color={c.white} />
            <Text style={styles.emptyText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{s.emptyList}</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const detailRows = [
              { label: s.cardEstTotal, value: order.estimatedTotalLabel },
              ...(order.servicesSummary
                ? [{ label: s.cardServices, value: order.servicesSummary }]
                : []),
              ...(order.addressPreview
                ? [{ label: s.cardAddress, value: order.addressPreview }]
                : []),
            ];
            const canComplete =
              order.rawStatus === "accepted" ||
              order.rawStatus === "in_progress" ||
              order.rawStatus === "ready";

            const orderCard = (
              <OrderCard
                customerName={order.customerName}
                initial={order.initial}
                subtitle={order.subtitle}
                rightIcon={order.rightIcon ?? "none"}
                statusLabel={order.status}
                detailRows={detailRows}
                onAccept={
                  order.status === "pending"
                    ? () => void openAcceptFlow(order)
                    : undefined
                }
                onReject={
                  order.status === "pending"
                    ? () => openRejectModal(order.id)
                    : undefined
                }
                onComplete={
                  canComplete ? () => handleCompleteOrder(order.id) : undefined
                }
                completeLabel={s.completeOrder}
                actionsDisabled={actionOrderId === order.id}
                onPress={() =>
                  router.push({
                    pathname: "/(partner)/order-detail",
                    params: { orderId: order.id },
                  })
                }
              />
            );

            if (isWeb) {
              return (
                <View key={order.id} style={styles.webOrderWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={custStrings.deleteAction}
                    onPress={() => void confirmDelete(order.id)}
                    style={({ pressed }) => [
                      styles.webDeleteRowBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={18}
                      color="#fecaca"
                    />
                    <Text style={styles.webDeleteRowText}>{custStrings.deleteAction}</Text>
                  </Pressable>
                  {orderCard}
                </View>
              );
            }

            return (
              <Swipeable
                key={order.id}
                friction={2}
                overshootRight={false}
                renderRightActions={() => (
                  <View style={styles.swipeActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={custStrings.deleteAction}
                      onPress={() => void confirmDelete(order.id)}
                      style={({ pressed }) => [
                        styles.swipeDeleteBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={26}
                        color={c.white}
                      />
                      <Text style={styles.swipeDeleteText}>{custStrings.deleteAction}</Text>
                    </Pressable>
                  </View>
                )}
              >
                {orderCard}
              </Swipeable>
            );
          })
        )}
      </ScrollView>
      <PartnerOrderSuccessModal
        payload={successPayload}
        onClose={() => setSuccessPayload(null)}
      />
      <PartnerRiderPickerModal
        visible={riderModalVisible}
        riders={partnerRiders}
        loading={loadingRiders}
        selectedRiderId={selectedRiderId}
        title={s.selectRiderTitle}
        subtitle={s.selectRiderSubtitle}
        confirmLabel={s.selectRiderConfirm}
        cancelLabel={s.selectRiderCancel}
        loadingLabel={s.loadingRiders}
        emptyLabel={s.noRidersMessage}
        onSelectRider={setSelectedRiderId}
        onConfirm={() => void confirmRiderAccept()}
        onClose={() => {
          setRiderModalVisible(false);
          setPendingAcceptOrderId(null);
          setSelectedRiderId(null);
        }}
      />
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
  pressed: { opacity: 0.85 },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
    maxHeight: 44,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: H_PAD,
    paddingVertical: 2,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.45)",
    backgroundColor: "transparent",
  },
  filterChipSelected: {
    backgroundColor: c.blue900,
    borderColor: c.outline,
  },
  filterChipText: {
    fontSize: fs.descText,
    fontWeight: "500",
    color: c.blue500,
  },
  filterChipTextSelected: {
    color: c.white,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 100,
    gap: 12,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fs.smallText,
    color: c.blue500,
    textAlign: "center",
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
  swipeActions: {
    justifyContent: "center",
    marginVertical: 2,
  },
  swipeDeleteBtn: {
    flex: 1,
    backgroundColor: "#b91c1c",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    width: 92,
    paddingVertical: 12,
    gap: 4,
  },
  swipeDeleteText: {
    color: c.white,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
  webOrderWrap: {
    gap: 8,
  },
  webDeleteRowBtn: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(185, 28, 28, 0.2)",
  },
  webDeleteRowText: {
    color: "#fecaca",
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
});
