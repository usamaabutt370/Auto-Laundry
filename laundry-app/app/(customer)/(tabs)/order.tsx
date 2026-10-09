import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { CustomerOrderCard } from "@/components/customer-order-card";
import { GuestSignInPrompt } from "@/components/guest-sign-in-prompt";
import { OrderCompletedCelebration } from "@/components/order-completed-celebration";
import { OrderReviewSheet } from "@/components/order-review-sheet";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { GradientLoader, APP_LOADER_TINT } from "@/components/ui/gradient-loader";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useCustomerOrderActions } from "@/hooks/use-customer-order-actions";
import { useCustomerOrders } from "@/hooks/use-customer-orders";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  findOrdersMissingFeedback,
  isCustomerOrderRemovable,
  submitCustomerOrderFeedback,
  type CustomerOrderListItem,
} from "@/lib/customer-orders";
import {
  getCelebratedOrderIds,
  isRecentlyCompleted,
  markOrdersCelebrated,
} from "@/lib/celebrated-orders";
import { getStrings } from "@/locales";
import { runAfterModalTeardown } from "@/utils/run-after-modal-teardown";
import { gradients, theme, UI } from "@/constants/theme";

const fs = theme.fontSize;
const PAD = 16;

type OrderFilter = "all" | "active" | "completed" | "cancelled";

/** Active = partner has accepted (accepted / in_progress / ready). Pending stays under All only. */
function orderMatchesFilter(order: CustomerOrderListItem, filter: OrderFilter): boolean {
  if (filter === "all") return true;
  if (filter === "completed") return order.displayStatus === "completed";
  if (filter === "cancelled") {
    return order.displayStatus === "rejected" || order.rawStatus === "cancelled";
  }
  // active (accepted)
  return order.displayStatus === "accepted";
}

/**
 * Persist dismissed order IDs across screen transitions for the current session.
 * This prevents the rating modal from reappearing if the screen unmounts/remounts.
 */
let sessionDismissedOrderIds: string[] = [];

export default function CustomerOrderScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.ordersTab;
  const { orders, loading, error, refresh } = useCustomerOrders(user?.id);
  const { isWeb } = useResponsiveLayout();
  const orderActions = useCustomerOrderActions();
  useSuppressWebScreenHeader();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [, setTriggerUpdate] = useState(0); // For forcing re-render when module var changes
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [celebrationOrders, setCelebrationOrders] = useState<CustomerOrderListItem[]>([]);
  const [celebrationReviewableIds, setCelebrationReviewableIds] = useState<Set<string>>(
    () => new Set(),
  );

  const filterCounts = useMemo(() => {
    let active = 0;
    let completed = 0;
    let cancelled = 0;
    for (const order of orders) {
      if (order.displayStatus === "completed") completed += 1;
      else if (order.displayStatus === "rejected" || order.rawStatus === "cancelled") {
        cancelled += 1;
      } else if (order.displayStatus === "accepted") {
        active += 1;
      }
    }
    return { all: orders.length, active, completed, cancelled };
  }, [orders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderMatchesFilter(order, filter)),
    [filter, orders],
  );

  const filterTabs = useMemo(
    () =>
      [
        { id: "all" as const, label: s.filterAll, count: filterCounts.all },
        { id: "active" as const, label: s.filterActive, count: filterCounts.active },
        { id: "completed" as const, label: s.filterCompleted, count: filterCounts.completed },
        { id: "cancelled" as const, label: s.filterCancelled, count: filterCounts.cancelled },
      ] as const,
    [filterCounts, s.filterActive, s.filterAll, s.filterCancelled, s.filterCompleted],
  );

  const onRefresh = useCallback(() => {
    void (async () => {
      setIsRefreshing(true);
      try {
        await refresh();
      } finally {
        setIsRefreshing(false);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (!isFocused || !user?.id || orders.length === 0) return;
    if (feedbackVisible || feedbackOrderId || celebrationOrders.length > 0) return;

    const completed = orders.filter((order) => order.displayStatus === "completed");
    if (completed.length === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const celebrated = await getCelebratedOrderIds(user.id);
        const fresh = completed.filter(
          (order) => !celebrated.has(order.id) && isRecentlyCompleted(order.updatedAt),
        );
        const missing = await findOrdersMissingFeedback(
          user.id,
          completed.map((order) => order.id),
        );
        if (cancelled) return;
        if (fresh.length > 0) {
          setCelebrationReviewableIds(missing);
          setCelebrationOrders(fresh);
          return;
        }
        const target = completed.find(
          (order) => missing.has(order.id) && !sessionDismissedOrderIds.includes(order.id),
        );
        if (!target) return;
        setFeedbackOrderId(target.id);
        setFeedbackVisible(true);
      } catch {
        // keep orders screen functional if feedback lookup fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orders, user?.id, feedbackVisible, feedbackOrderId, isFocused, celebrationOrders.length]);

  const finishCelebration = useCallback(() => {
    const ids = celebrationOrders.map((order) => order.id);
    ids.forEach((id) => {
      if (!sessionDismissedOrderIds.includes(id)) sessionDismissedOrderIds.push(id);
    });
    if (user?.id) void markOrdersCelebrated(user.id, ids);
    setCelebrationOrders([]);
  }, [celebrationOrders, user?.id]);

  const celebrationLeaveReview = useCallback(
    (order: CustomerOrderListItem) => {
      finishCelebration();
      runAfterModalTeardown(() => {
        setFeedbackOrderId(order.id);
        setFeedbackVisible(true);
      });
    },
    [finishCelebration],
  );

  const celebrationViewDetails = useCallback(
    (order: CustomerOrderListItem) => {
      finishCelebration();
      runAfterModalTeardown(() => {
        router.push({ pathname: "/(customer)/order-detail", params: { orderId: order.id } });
      });
    },
    [finishCelebration, router],
  );

  const celebrationViewProvider = useCallback(
    (order: CustomerOrderListItem) => {
      finishCelebration();
      runAfterModalTeardown(() => {
        router.push({
          pathname: "/(customer)/launderer-detail",
          params: { id: order.partnerId, name: order.partnerName, mode: order.fulfillmentMode },
        });
      });
    },
    [finishCelebration, router],
  );

  const feedbackOrder =
    feedbackOrderId != null ? orders.find((order) => order.id === feedbackOrderId) ?? null : null;

  const closeFeedback = useCallback(() => {
    setFeedbackVisible(false);
    setFeedbackOrderId(null);
  }, []);

  const dismissAllFeedback = useCallback(() => {
    const completedIds = orders
      .filter((o) => o.displayStatus === "completed")
      .map((o) => o.id);
    completedIds.forEach((id) => {
      if (!sessionDismissedOrderIds.includes(id)) {
        sessionDismissedOrderIds.push(id);
      }
    });
    setTriggerUpdate((n) => n + 1);
    closeFeedback();
  }, [orders, closeFeedback]);

  const submitFeedback = useCallback(
    async ({ rating, message }: { rating: number; message: string }) => {
      if (!user?.id || !feedbackOrder) return;
      await submitCustomerOrderFeedback({
        orderId: feedbackOrder.id,
        customerId: user.id,
        partnerId: feedbackOrder.partnerId,
        rating,
        feedbackType: "feedback",
        message,
      });
      if (!sessionDismissedOrderIds.includes(feedbackOrder.id)) {
        sessionDismissedOrderIds.push(feedbackOrder.id);
      }
      setTriggerUpdate((n) => n + 1);
    },
    [feedbackOrder, user?.id],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {!isWeb ? (
        <SafeAreaView style={styles.safeTop} edges={["top"]}>
          <AppHeader
            appearance="light"
            title={s.title}
            subtitle={user?.id ? s.liveHint : null}
            titleAlign="left"
            titleStyle={styles.screenTitle}
          />
        </SafeAreaView>
      ) : (
        <WebHeaderSpacer />
      )}
      {!user?.id ? (
        <GuestSignInPrompt
          appearance="light"
          variant="orders"
          title={s.signInTitle}
          subtitle={s.signInSubtitle}
          buttonLabel={s.logIn}
          onPressLogin={() =>
            router.push({
              pathname: "/(auth)/login",
              params: { returnTo: "orders" },
            })
          }
        />
      ) : loading && orders.length === 0 ? (
        <View style={styles.center}>
          <GradientLoader />
          <Text style={styles.muted}>{s.loading}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{s.error}</Text>
          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.retryLabel}>{s.retry}</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="receipt-text-outline" size={32} color={UI.teal} />
          </View>
          <Text style={styles.muted}>{s.empty}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {filterTabs.map((tab) => {
              const selected = filter === tab.id;
              const label = `${tab.label} (${tab.count})`;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setFilter(tab.id)}
                  style={[styles.filterChipWrap, selected && styles.filterChipWrapSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                >
                  {selected ? (
                    <LinearGradient
                      colors={[...gradients.cta]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.filterChip}
                    >
                      <Text style={styles.filterChipTextSelected}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.filterChip}>
                      <Text style={styles.filterChipText}>{label}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredOrders.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.muted}>
                {filter === "all"
                  ? s.emptyAll
                  : filter === "active"
                    ? s.emptyActive
                    : filter === "completed"
                      ? s.emptyCompleted
                      : s.emptyCancelled}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor={APP_LOADER_TINT}
                  colors={[APP_LOADER_TINT]}
                  progressBackgroundColor={UI.card}
                  progressViewOffset={8}
                />
              }
            >
              {filteredOrders.map((order) => {
                const removable = isCustomerOrderRemovable(order.rawStatus);
                const deleteOrder = () => orderActions.remove(order, () => void refresh());
                const card = (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  strings={{
                    orderRef: s.orderRef,
                    estTotal: s.estTotal,
                    schedulePending: s.schedulePending,
                    servicesNone: s.servicesNone,
                    yourServices: s.yourServices,
                    statusPending: s.statusPending,
                    statusAccepted: s.statusAccepted,
                    statusRejected: s.statusRejected,
                    statusCompleted: s.statusCompleted,
                    statusWaiting: s.statusWaiting,
                    statusInProgress: s.statusInProgress,
                    statusReady: s.statusReady,
                    chatProvider: s.chatProvider,
                    trackOrder: s.trackOrder,
                    addOns: s.addOns,
                    addOnOne: s.addOnOne,
                    stepSent: s.stepSent,
                    stepConfirmed: s.stepConfirmed,
                    stepPickedUp: s.stepPickedUp,
                    stepOnTheWay: s.stepOnTheWay,
                    stepCompleted: s.stepCompleted,
                    reviewsCount: s.reviewsCount,
                    reorder: s.orderActions.reorder,
                    deleteOrder: s.orderActions.delete,
                  }}
                  onReorder={() => void orderActions.reorder(order)}
                  onDelete={
                    isWeb || order.displayStatus === "rejected" || order.rawStatus === "cancelled"
                      ? deleteOrder
                      : undefined
                  }
                  reordering={orderActions.reorderingId === order.id}
                  deleting={orderActions.removingId === order.id}
                  onOpenDetail={() =>
                    router.push({
                      pathname: "/(customer)/order-detail",
                      params: { orderId: order.id },
                    })
                  }
                  onTrack={() =>
                    router.push({
                      pathname: "/(customer)/track-order",
                      params: { orderId: order.id },
                    })
                  }
                  onChat={() =>
                    router.push({
                      pathname: "/(customer)/chat/[orderId]",
                      params: { orderId: order.id },
                    })
                  }
                />
                );
                if (!removable || isWeb) return card;
                return (
                  <Swipeable
                    key={order.id}
                    friction={2}
                    overshootRight={false}
                    renderRightActions={() => (
                      <View style={styles.swipeActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={s.orderActions.deleteOrder}
                          onPress={deleteOrder}
                          style={({ pressed }) => [styles.swipeDeleteBtn, pressed && styles.swipePressed]}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={26} color="#FFFFFF" />
                          <Text style={styles.swipeDeleteText}>{s.orderActions.delete}</Text>
                        </Pressable>
                      </View>
                    )}
                  >
                    {card}
                  </Swipeable>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
      {celebrationOrders.length > 0 ? (
        <OrderCompletedCelebration
          orders={celebrationOrders}
          reviewableOrderIds={celebrationReviewableIds}
          strings={s.orderCompleted}
          onClose={finishCelebration}
          onLeaveReview={celebrationLeaveReview}
          onViewDetails={celebrationViewDetails}
          onViewProvider={celebrationViewProvider}
        />
      ) : null}
      {feedbackVisible && feedbackOrder ? (
        <OrderReviewSheet
          key={feedbackOrder.id}
          partner={feedbackOrder}
          strings={s.review}
          onSubmit={submitFeedback}
          onDismiss={dismissAllFeedback}
          onDone={closeFeedback}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  swipeActions: {
    justifyContent: "center",
    marginVertical: 2,
    paddingLeft: 10,
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
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  swipePressed: { opacity: 0.85 },
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  safeTop: {
    backgroundColor: UI.bg,
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: PAD,
  },
  filterChipWrap: {
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#F3F0FF",
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipWrapSelected: {
    backgroundColor: "transparent",
  },
  filterChip: {
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.purpleDeep,
    textAlign: "center",
  },
  filterChipTextSelected: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingBottom: 100,
    gap: 12,
  },
  center: {
    flex: 1,
    paddingHorizontal: PAD,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI.openBg,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: {
    fontSize: fs.smallText,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
  },
  errorText: {
    fontSize: fs.smallText,
    fontFamily: "Poppins-Regular",
    color: UI.red,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
  },
  retryLabel: {
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
});
