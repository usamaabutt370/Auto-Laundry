import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { AppHeader } from "@/components/app-header";
import { CustomerOrderCard } from "@/components/customer-order-card";
import { GuestSignInPrompt } from "@/components/guest-sign-in-prompt";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { GradientLoader, APP_LOADER_TINT } from "@/components/ui/gradient-loader";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useCustomerOrders } from "@/hooks/use-customer-orders";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  findOrdersMissingFeedback,
  submitCustomerOrderFeedback,
  type CustomerOrderFeedbackType,
  type CustomerOrderListItem,
} from "@/lib/customer-orders";
import { getStrings } from "@/locales";
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
  const { orders, loading, error, refresh, deleteOrder } = useCustomerOrders(user?.id);
  const { confirm, dialog } = useConfirmDialog();
  const { isWeb } = useResponsiveLayout();
  useSuppressWebScreenHeader();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [, setTriggerUpdate] = useState(0); // For forcing re-render when module var changes
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<CustomerOrderFeedbackType>("feedback");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [filter, setFilter] = useState<OrderFilter>("all");

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

  const confirmDelete = useCallback(
    async (orderId: string) => {
      const ok = await confirm({
        title: s.deleteTitle,
        message: s.deleteMessage,
        confirmLabel: s.deleteAction,
        cancelLabel: s.cancel,
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteOrder(orderId);
      } catch (e) {
        showAppAlert(s.deleteError, e instanceof Error ? e.message : String(e));
      }
    },
    [confirm, deleteOrder, s.cancel, s.deleteAction, s.deleteError, s.deleteMessage, s.deleteTitle],
  );

  const handleReorder = useCallback(
    (orderId: string, fulfillmentMode: "dropoff" | "pickupDelivery") => {
      router.push({
        pathname: "/(customer)/pick-launderer",
        params: {
          reorderOrderId: orderId,
          mode: fulfillmentMode,
        },
      });
    },
    [router],
  );

  useEffect(() => {
    if (!isFocused || !user?.id || orders.length === 0) return;
    if (feedbackVisible || feedbackOrderId) return;

    const completed = orders.filter(
      (order) =>
        order.displayStatus === "completed" && !sessionDismissedOrderIds.includes(order.id),
    );
    if (completed.length === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const missing = await findOrdersMissingFeedback(
          user.id,
          completed.map((order) => order.id),
        );
        if (cancelled || missing.size === 0) return;
        const target = completed.find((order) => missing.has(order.id));
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
  }, [orders, user?.id, feedbackVisible, feedbackOrderId, isFocused]);

  const feedbackOrder =
    feedbackOrderId != null ? orders.find((order) => order.id === feedbackOrderId) ?? null : null;

  const closeFeedback = useCallback(() => {
    setFeedbackVisible(false);
    setFeedbackOrderId(null);
    setRating(0);
    setFeedbackType("feedback");
    setFeedbackMessage("");
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

  const submitFeedback = useCallback(async () => {
    if (!user?.id || !feedbackOrder) return;
    if (rating < 1) {
      showAppAlert("Rating required", "Please select a star rating.");
      return;
    }
    if (!feedbackMessage.trim()) {
      showAppAlert("Feedback required", "Please add your feedback before submitting.");
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      await submitCustomerOrderFeedback({
        orderId: feedbackOrder.id,
        customerId: user.id,
        partnerId: feedbackOrder.partnerId,
        rating,
        feedbackType,
        message: feedbackMessage.trim(),
      });
      // After success, dismiss just this one (it's already in DB now anyway)
      if (!sessionDismissedOrderIds.includes(feedbackOrder.id)) {
        sessionDismissedOrderIds.push(feedbackOrder.id);
      }
      setTriggerUpdate((n) => n + 1);
      closeFeedback();
      showAppAlert("Thanks!", "Your review has been submitted.");
    } catch (e) {
      showAppAlert(
        "Unable to submit feedback",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [closeFeedback, feedbackMessage, feedbackOrder, feedbackType, rating, user?.id]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {dialog}
      {!isWeb ? (
        <SafeAreaView style={styles.safeTop} edges={["top"]}>
          <AppHeader appearance="light" title={s.title} />
        </SafeAreaView>
      ) : (
        <WebHeaderSpacer />
      )}
      {!isWeb && user?.id ? <Text style={styles.hint}>{s.liveHint}</Text> : null}
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
              {filteredOrders.map((order) => (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  strings={{
                    orderRef: s.orderRef,
                    estTotal: s.estTotal,
                    schedulePending: s.schedulePending,
                    servicesNone: s.servicesNone,
                    statusPending: s.statusPending,
                    statusAccepted: s.statusAccepted,
                    statusRejected: s.statusRejected,
                    statusCompleted: s.statusCompleted,
                    statusWaiting: s.statusWaiting,
                    statusInProgress: s.statusInProgress,
                    statusReady: s.statusReady,
                    chatProvider: s.chatProvider,
                    trackOrder: s.trackOrder,
                    pickupFrom: s.pickupFrom,
                    addOns: s.addOns,
                    addOnOne: s.addOnOne,
                    stepSent: s.stepSent,
                    stepConfirmed: s.stepConfirmed,
                    stepPickedUp: s.stepPickedUp,
                    stepOnTheWay: s.stepOnTheWay,
                    stepCompleted: s.stepCompleted,
                    deleteAction: s.deleteAction,
                    reorderAction: s.reorderAction,
                    reviewsCount: s.reviewsCount,
                    menu: s.menu,
                    viewDetails: s.viewDetails,
                  }}
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
                  onDelete={() => void confirmDelete(order.id)}
                  onReorder={() => handleReorder(order.id, order.fulfillmentMode)}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}
      {feedbackVisible ? (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={dismissAllFeedback}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={dismissAllFeedback} />
          <View style={styles.feedbackModalCard}>
            <Text style={styles.feedbackTitle}>Rate your completed order</Text>
            <Text style={styles.feedbackSubtitle}>
              {feedbackOrder
                ? `Order #${feedbackOrder.orderRef} with ${feedbackOrder.partnerName}`
                : "Share your experience with this service."}
            </Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setRating(value)} style={styles.starBtn}>
                  <MaterialCommunityIcons
                    name={value <= rating ? "star" : "star-outline"}
                    size={30}
                    color={value <= rating ? "#F5B301" : UI.muted}
                  />
                </Pressable>
              ))}
            </View>
            <View style={styles.feedbackTypeRow}>
              {(
                [
                  { id: "feedback", label: "Feedback" },
                  { id: "complaint", label: "Complaint" },
                  { id: "suggestion", label: "Suggestion" },
                ] as const
              ).map((opt) => {
                const selected = feedbackType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setFeedbackType(opt.id)}
                    style={[
                      styles.feedbackTypeChip,
                      selected && styles.feedbackTypeChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.feedbackTypeText,
                        selected && styles.feedbackTypeTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              placeholder="Tell us what went well, or share your complaint..."
              placeholderTextColor={UI.muted}
              multiline
              maxLength={700}
              style={styles.feedbackInput}
              textAlignVertical="top"
            />
            <View style={styles.feedbackActionsRow}>
              <Pressable
                onPress={dismissAllFeedback}
                style={[styles.feedbackCancelBtn, isSubmittingFeedback && styles.disabled]}
                disabled={isSubmittingFeedback}
              >
                <Text style={styles.feedbackCancelText}>Later</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitFeedback()}
                style={[styles.feedbackSubmitBtn, isSubmittingFeedback && styles.disabled]}
                disabled={isSubmittingFeedback}
              >
                <Text style={styles.feedbackSubmitText}>
                  {isSubmittingFeedback ? "Submitting..." : "Submit"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  safeTop: {
    backgroundColor: UI.bg,
    paddingBottom: 4,
  },
  hint: {
    marginHorizontal: PAD,
    fontSize: fs.descText,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 12,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: PAD,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  feedbackModalCard: {
    width: "100%",
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 16,
  },
  feedbackTitle: {
    color: UI.text,
    fontSize: fs.smallTitle,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  feedbackSubtitle: {
    marginTop: 4,
    color: UI.muted,
    fontSize: fs.descText,
    fontFamily: "Poppins-Regular",
    marginBottom: 12,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  starBtn: {
    padding: 4,
  },
  feedbackTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  feedbackTypeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: UI.iconWell,
  },
  feedbackTypeChipSelected: {
    borderColor: UI.teal,
    backgroundColor: UI.openBg,
  },
  feedbackTypeText: {
    color: UI.muted,
    fontSize: fs.xxSmallText,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  feedbackTypeTextSelected: {
    color: UI.openText,
  },
  feedbackInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: UI.text,
    fontSize: fs.descText,
    fontFamily: "Poppins-Regular",
    marginBottom: 12,
    backgroundColor: UI.bg,
  },
  feedbackActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  feedbackCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: UI.card,
  },
  feedbackCancelText: {
    color: UI.text,
    fontSize: fs.descText,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  feedbackSubmitBtn: {
    flex: 1,
    backgroundColor: UI.teal,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  feedbackSubmitText: {
    color: "#FFFFFF",
    fontSize: fs.descText,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.55,
  },
});
