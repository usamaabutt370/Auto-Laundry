import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";

import { showAppAlert } from "@/components/app-alert";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { BlockingLoader } from "@/components/blocking-loader";
import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import {
  alertIfInsufficientCreditsError,
  ensurePartnerCreditsForAccept,
} from "@/components/partner-insufficient-credits-alert";
import { PartnerOrderListCard } from "@/components/partner-order-list-card";
import { GradientLoader, APP_LOADER_TINT } from "@/components/ui/gradient-loader";
import { useConfirmDialog } from "@/components/confirm-dialog";
import {
  PartnerOrderSuccessModal,
  type PartnerOrderSuccessPayload,
} from "@/components/partner-order-success-modal";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { PartnerRiderPickerModal } from "@/components/partner-rider-picker-modal";
import { theme, UI } from "@/constants/theme";
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

type OrderFilter = "all" | "new" | "active" | "completed";

function filterFromParam(value?: string): OrderFilter {
  if (value === "pending" || value === "new") return "new";
  if (value === "accepted" || value === "active") return "active";
  if (value === "completed") return "completed";
  return "all";
}

function orderBucket(status: PartnerOrderListItem["rawStatus"]): OrderFilter | null {
  if (status === "submitted") return "new";
  if (status === "accepted" || status === "in_progress" || status === "ready") return "active";
  if (status === "completed") return "completed";
  return null;
}

function acceptedSummary(
  order: PartnerOrderListItem | undefined,
  riderName?: string | null,
): PartnerOrderSuccessPayload {
  if (!order) return { type: "accepted" };
  return {
    type: "accepted",
    order: {
      id: order.id,
      orderRef: order.orderRef,
      customerName: order.customerName,
      avatarUrl: order.avatarUrl,
      address: order.addressPreview,
      serviceLabel:
        order.extraServiceCount > 0
          ? `${order.primaryServiceLabel} +${order.extraServiceCount}`
          : order.primaryServiceLabel || order.servicesSummary,
      itemCount: order.itemCount,
      totalLabel: order.estimatedTotalLabel,
      pickupWhen: order.pickupWhen,
      deliveryWhen: order.deliveryWhen,
      riderName,
    },
  };
}

export default function PartnerOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { locale } = useLocale();
  const { user } = useAuth();
  const s = getStrings(locale).partner.order;
  const commonStrings = getStrings(locale).common;
  const profileCopy = getStrings(locale).partner.profileScreen;
  const insufficientCreditsCopy = useMemo(
    () => ({
      title: s.insufficientCreditsTitle,
      message: s.insufficientCreditsMessage,
      recharge: s.insufficientCreditsRecharge,
      cancel: s.insufficientCreditsCancel,
      whatsappError: profileCopy.whatsappError,
    }),
    [
      profileCopy.whatsappError,
      s.insufficientCreditsCancel,
      s.insufficientCreditsMessage,
      s.insufficientCreditsRecharge,
      s.insufficientCreditsTitle,
    ],
  );
  const partnerDisplayName =
    typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : "Partner";

  const paramFilter = typeof params.filter === "string" ? params.filter : undefined;
  const initialFilter = filterFromParam(paramFilter);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>(initialFilter);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const tabBarInset = getTabBarBottomInset(Math.max(insets.bottom, 8));
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
  useSuppressWebScreenHeader();
  const custStrings = getStrings(locale).customer.ordersTab;
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [pendingAcceptOrderId, setPendingAcceptOrderId] = useState<string | null>(null);
  const [partnerRiders, setPartnerRiders] = useState<PartnerRider[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<PartnerOrderSuccessPayload | null>(null);
  const ordersRef = useRef<PartnerOrderListItem[]>([]);
  ordersRef.current = orders;

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

  const listedOrders = useMemo(
    () => orders.filter((order) => orderBucket(order.rawStatus) != null),
    [orders],
  );
  const counts = useMemo(
    () => ({
      all: listedOrders.length,
      new: listedOrders.filter((order) => orderBucket(order.rawStatus) === "new").length,
      active: listedOrders.filter((order) => orderBucket(order.rawStatus) === "active").length,
      completed: listedOrders.filter((order) => orderBucket(order.rawStatus) === "completed").length,
    }),
    [listedOrders],
  );
  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return listedOrders.filter((order) => {
      if (orderFilter !== "all" && orderBucket(order.rawStatus) !== orderFilter) return false;
      if (!query) return true;
      const haystack = [
        order.orderRef,
        order.customerName,
        order.primaryServiceLabel,
        order.servicesSummary,
        order.addressPreview,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [listedOrders, orderFilter, searchQuery]);

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
        // Clear blocking overlay before opening another Modal (success / alert).
        setActionOrderId(null);
        if (status === "accepted") {
          setSuccessPayload(acceptedSummary(ordersRef.current.find((o) => o.id === orderId)));
        } else {
          showAppAlert("Order rejected", "The order has been rejected.");
        }
      } catch (error) {
        setActionOrderId(null);
        if (
          status === "accepted" &&
          alertIfInsufficientCreditsError(error, {
            copy: insufficientCreditsCopy,
            partnerName: partnerDisplayName,
          })
        ) {
          return;
        }
        showAppAlert(
          `Unable to ${status === "accepted" ? "accept" : "reject"} order`,
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    },
    [insufficientCreditsCopy, partnerDisplayName],
  );

  const openAcceptFlow = useCallback(
    async (order: PartnerOrderListItem) => {
      try {
        const allowed = await ensurePartnerCreditsForAccept({
          orderAmount: order.amount,
          partnerName: partnerDisplayName,
          copy: insufficientCreditsCopy,
        });
        if (!allowed) return;
      } catch (error) {
        showAppAlert(
          "Unable to accept order",
          error instanceof Error ? error.message : "Please try again.",
        );
        return;
      }

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
      insufficientCreditsCopy,
      partnerDisplayName,
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
      setActionOrderId(null);
      setSuccessPayload(
        acceptedSummary(
          ordersRef.current.find((o) => o.id === pendingAcceptOrderId),
          partnerRiders.find((r) => r.id === selectedRiderId)?.name,
        ),
      );
    } catch (error) {
      setActionOrderId(null);
      if (
        alertIfInsufficientCreditsError(error, {
          copy: insufficientCreditsCopy,
          partnerName: partnerDisplayName,
        })
      ) {
        return;
      }
      showAppAlert(
        "Unable to accept order",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [
    insufficientCreditsCopy,
    partnerDisplayName,
    partnerRiders,
    pendingAcceptOrderId,
    s.selectRiderRequired,
    selectedRiderId,
    user?.id,
  ]);

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

  const chipMeta: Record<OrderFilter, { label: string; idle: string; active: string }> = {
    all: { label: s.chipAll, idle: "#F3F4F6", active: "#2563EB" },
    new: { label: s.chipNew, idle: "#FFF4EC", active: "#F59E0B" },
    active: { label: s.chipActive, idle: "#ECFDF3", active: "#16A34A" },
    completed: { label: s.chipCompleted, idle: "#ECFDF5", active: "#059669" },
  };
  const localeTag = locale === "ur" ? "ur-PK" : "en-GB";

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {dialog}
      <SafeAreaView edges={isWeb ? [] : ["top"]} style={styles.safeArea}>
        {isWeb ? <WebHeaderSpacer /> : null}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.subtitle}>{s.listSubtitle}</Text>
          </View>
          <Pressable
            onPress={() => {
              setSearchOpen((open) => !open);
              setFilterMenuOpen(false);
            }}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={s.searchA11y}
          >
            <MaterialCommunityIcons name="magnify" size={22} color={UI.text} />
          </Pressable>
          <Pressable
            onPress={() => setFilterMenuOpen((open) => !open)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={s.filterA11y}
          >
            <MaterialCommunityIcons name="tune-variant" size={20} color={UI.text} />
          </Pressable>
        </View>
        {searchOpen ? (
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={s.searchPlaceholder}
            placeholderTextColor={UI.muted}
            style={styles.searchInput}
            autoFocus
          />
        ) : null}
        {filterMenuOpen ? (
          <View style={styles.filterMenu}>
            {(Object.keys(chipMeta) as OrderFilter[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  setOrderFilter(key);
                  setFilterMenuOpen(false);
                }}
                style={styles.filterMenuItem}
              >
                <Text style={styles.filterMenuText}>
                  {chipMeta[key].label} ({counts[key]})
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </SafeAreaView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {(Object.keys(chipMeta) as OrderFilter[]).map((key) => {
          const selected = orderFilter === key;
          const meta = chipMeta[key];
          return (
            <Pressable
              key={key}
              onPress={() => setOrderFilter(key)}
              style={[
                styles.chip,
                { backgroundColor: selected ? meta.active : meta.idle },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{meta.label}</Text>
              <View style={[styles.chipCount, selected && styles.chipCountSelected]}>
                <Text style={[styles.chipCountText, selected && styles.chipCountTextSelected]}>
                  {counts[key]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarInset + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={APP_LOADER_TINT}
            colors={[APP_LOADER_TINT]}
            progressBackgroundColor={UI.card}
            progressViewOffset={8}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.emptyWrap}>
            <GradientLoader />
            <Text style={styles.emptyText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{s.emptyList}</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const orderCard = (
              <PartnerOrderListCard
                order={order}
                copy={s}
                localeTag={localeTag}
                actionsDisabled={actionOrderId === order.id}
                onAccept={
                  order.rawStatus === "submitted" ? () => void openAcceptFlow(order) : undefined
                }
                onDecline={
                  order.rawStatus === "submitted" ? () => openRejectModal(order.id) : undefined
                }
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
                      color={UI.red}
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
                        color="#FFFFFF"
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
        onViewDetails={(orderId) => {
          setSuccessPayload(null);
          router.push({ pathname: "/(partner)/order-detail", params: { orderId } });
        }}
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
        confirming={actionOrderId === pendingAcceptOrderId && pendingAcceptOrderId !== null}
        confirmingLabel={commonStrings.acceptingOrder}
        onClose={() => {
          if (actionOrderId === pendingAcceptOrderId) return;
          setRiderModalVisible(false);
          setPendingAcceptOrderId(null);
          setSelectedRiderId(null);
        }}
      />
      <BlockingLoader
        visible={actionOrderId !== null && !riderModalVisible}
        message={commonStrings.acceptingOrder}
      />
      {rejectModalVisible ? (
        <View style={styles.modalOverlay} pointerEvents="auto" accessibilityViewIsModal>
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
                placeholderTextColor={UI.muted}
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  safeArea: {
    paddingBottom: 4,
    zIndex: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: H_PAD,
    paddingTop: 4,
  },
  headerText: { flex: 1 },
  title: { fontSize: 28, fontWeight: "800", color: UI.text },
  subtitle: { marginTop: 2, fontSize: fs.descText, color: UI.muted },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    marginHorizontal: H_PAD,
    marginTop: 10,
    backgroundColor: UI.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: UI.text,
    fontSize: fs.descText,
  },
  filterMenu: {
    marginHorizontal: H_PAD,
    marginTop: 8,
    backgroundColor: UI.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    overflow: "hidden",
  },
  filterMenuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  filterMenuText: { fontSize: fs.descText, fontWeight: "600", color: UI.text },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  chipLabel: { fontSize: 14, fontWeight: "700", color: UI.text },
  chipLabelSelected: { color: "#FFFFFF" },
  chipCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  chipCountSelected: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipCountText: { fontSize: 12, fontWeight: "800", color: UI.text },
  chipCountTextSelected: { color: "#FFFFFF" },
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
  filterRowWeb: {
    justifyContent: "center",
    width: "100%",
    marginBottom: 12,
  },
  filterChipPress: {
    borderRadius: 999,
    overflow: "hidden",
  },
  filterChip: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipIdle: {
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: UI.muted,
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
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
    color: UI.muted,
    textAlign: "center",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: H_PAD,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  modalCard: {
    width: "100%",
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    zIndex: 1,
    borderColor: UI.chipBorder,
    padding: 16,
  },
  modalTitle: {
    color: UI.text,
    fontSize: fs.smallTitle,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: UI.muted,
    fontSize: fs.descText,
    marginTop: 4,
    marginBottom: 12,
  },
  reasonList: {
    gap: 8,
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: UI.card,
  },
  reasonOptionSelected: {
    borderColor: UI.teal,
    backgroundColor: UI.mint,
  },
  reasonOptionText: {
    color: UI.text,
    fontSize: fs.descText,
  },
  reasonOptionTextSelected: {
    color: UI.teal,
    fontWeight: "700",
  },
  otherReasonInput: {
    marginTop: 12,
    minHeight: 84,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: UI.text,
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
    borderColor: UI.chipBorder,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: UI.text,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  modalRejectBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.red,
    backgroundColor: UI.card,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalRejectText: {
    color: UI.red,
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
    color: "#FFFFFF",
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
    backgroundColor: "#FEE2E2",
  },
  webDeleteRowText: {
    color: UI.red,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
});
