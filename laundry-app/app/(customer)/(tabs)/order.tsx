import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { useCustomerOrders } from "@/hooks/use-customer-orders";
import {
  findOrdersMissingFeedback,
  submitCustomerOrderFeedback,
  type CustomerOrderDisplayStatus,
  type CustomerOrderFeedbackType,
} from "@/lib/customer-orders";
import { getStrings } from "@/locales";
import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;
const PAD = 24;

function statusLabelKey(
  display: CustomerOrderDisplayStatus,
): "statusPending" | "statusAccepted" | "statusRejected" | "statusCompleted" {
  switch (display) {
    case "pending":
      return "statusPending";
    case "accepted":
      return "statusAccepted";
    case "rejected":
      return "statusRejected";
    case "completed":
      return "statusCompleted";
  }
}

export default function CustomerOrderScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { open: openSidebar } = useSidebar();
  const s = getStrings(locale).customer.ordersTab;
  const { orders, loading, error, refresh, deleteOrder } = useCustomerOrders(user?.id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<CustomerOrderFeedbackType>("feedback");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
    (orderId: string) => {
      Alert.alert(s.deleteTitle, s.deleteMessage, [
        { text: s.cancel, style: "cancel" },
        {
          text: s.deleteAction,
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteOrder(orderId);
              } catch (e) {
                Alert.alert(
                  s.deleteError,
                  e instanceof Error ? e.message : String(e),
                );
              }
            })();
          },
        },
      ]);
    },
    [s, deleteOrder],
  );

  const statusStyles = useMemo(
    () => ({
      pending: {
        borderColor: "rgba(171, 233, 254, 0.85)",
        color: c.white,
        backgroundColor: "transparent",
      },
      accepted: {
        borderColor: c.filledButtonBorder,
        color: c.white,
        backgroundColor: c.blue900,
      },
      rejected: {
        borderColor: "#f87171",
        color: "#fecaca",
        backgroundColor: "rgba(127, 29, 29, 0.35)",
      },
      completed: {
        borderColor: "#86efac",
        color: "#ecfdf5",
        backgroundColor: "rgba(22, 101, 52, 0.45)",
      },
    }),
    [],
  );

  useEffect(() => {
    if (!user?.id || orders.length === 0) return;
    if (feedbackVisible || feedbackOrderId) return;

    const completed = orders.filter((order) => order.displayStatus === "completed");
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
  }, [orders, user?.id, feedbackVisible, feedbackOrderId]);

  const feedbackOrder =
    feedbackOrderId != null ? orders.find((order) => order.id === feedbackOrderId) ?? null : null;

  const closeFeedback = useCallback(() => {
    setFeedbackVisible(false);
    setFeedbackOrderId(null);
    setRating(0);
    setFeedbackType("feedback");
    setFeedbackMessage("");
  }, []);

  const submitFeedback = useCallback(async () => {
    if (!user?.id || !feedbackOrder) return;
    if (rating < 1) {
      Alert.alert("Rating required", "Please select a star rating.");
      return;
    }
    if (!feedbackMessage.trim()) {
      Alert.alert("Feedback required", "Please add your feedback before submitting.");
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
      closeFeedback();
      Alert.alert("Thanks!", "Your review has been submitted.");
    } catch (e) {
      Alert.alert(
        "Unable to submit feedback",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [closeFeedback, feedbackMessage, feedbackOrder, feedbackType, rating, user?.id]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <AppHeader
          title={s.title}
          // subtitle={s.liveHint}
          onLeftPress={openSidebar}
          leftAccessibilityLabel="Menu"
        />
      </SafeAreaView>
      <Text style={styles.hint}>{s.liveHint}</Text>
      {!user?.id ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="account-outline" size={48} color={c.blue500} />
          <Text style={styles.muted}>{s.signIn}</Text>
        </View>
      ) : loading && orders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.white} />
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
          <MaterialCommunityIcons name="receipt-text-outline" size={48} color={c.blue500} />
          <Text style={styles.muted}>{s.empty}</Text>
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
              tintColor="#FFFFFF"
              colors={["#FFFFFF"]}
              progressBackgroundColor={c.blue900}
              progressViewOffset={8}
            />
          }
        >
          {orders.map((order) => {
            const st = statusStyles[order.displayStatus];
            const label = s[statusLabelKey(order.displayStatus)];
            const metaItems: {
              label: string;
              value: string;
              fullWidth?: boolean;
              valueLines?: number;
            }[] = [
              {
                label: s.services,
                value: order.servicesSummary || s.servicesNone,
                valueLines: 2,
              },
            ];
            if (order.placedAtIso) {
              metaItems.push({
                label: s.placed,
                value: new Date(order.placedAtIso).toLocaleDateString(
                  locale === "ur" ? "ur-PK" : "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                ),
              });
            }
            if (order.pickupFeeLabel) {
              metaItems.push({
                label: s.pickupFee,
                value: order.pickupFeeLabel,
              });
            }
            if (order.notesPreview) {
              metaItems.push({
                label: s.notes,
                value: order.notesPreview,
                fullWidth: true,
                valueLines: 2,
              });
            }
            if (order.displayStatus === "rejected" && order.rejectionReasonOption) {
              const rejectionText = order.rejectionReasonDetails
                ? `${order.rejectionReasonOption} - ${order.rejectionReasonDetails}`
                : order.rejectionReasonOption;
              metaItems.push({
                label: "Rejection",
                value: rejectionText,
                fullWidth: true,
                valueLines: 3,
              });
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
                      accessibilityLabel={s.deleteAction}
                      onPress={() => confirmDelete(order.id)}
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
                      <Text style={styles.swipeDeleteText}>{s.deleteAction}</Text>
                    </Pressable>
                  </View>
                )}
              >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(customer)/order-detail",
                      params: { orderId: order.id },
                    })
                  }
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.orderRef}>
                      {s.orderRef.replace("{{ref}}", order.orderRef)}
                    </Text>
                    <View style={[styles.statusPill, st]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{label}</Text>
                    </View>
                  </View>
                  <Text style={styles.partnerName}>{order.partnerName}</Text>
                  {(order.scheduleLines.length > 0
                    ? order.scheduleLines
                    : [s.schedulePending]
                  ).map((line, i) => (
                    <Text key={i} style={styles.scheduleLine}>
                      {line}
                    </Text>
                  ))}
                  <View style={styles.metaGrid}>
                    {metaItems.map((item, index) => (
                      <View
                        key={`${item.label}-${index}`}
                        style={[
                          styles.metaCell,
                          item.fullWidth ? styles.metaCellFull : styles.metaCellHalf,
                        ]}
                      >
                        <View style={styles.metaCellRow}>
                          <Text style={styles.metaLabel}>{item.label}</Text>
                          <Text style={styles.metaValue} numberOfLines={item.valueLines ?? 1}>
                            {item.value}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{s.estTotal}</Text>
                    <Text style={styles.totalValue}>{order.estimatedTotalLabel}</Text>
                  </View>
                  {order.displayStatus === "rejected" ? (
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          "Order rejected",
                          "This order was rejected by the launderer. Please place a new order.",
                          [
                            { text: s.cancel, style: "cancel" },
                            {
                              text: "Reorder now",
                              onPress: () => router.push("/(customer)/(tabs)"),
                            },
                          ],
                        )
                      }
                      style={({ pressed }) => [
                        styles.reorderButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.reorderButtonText}>{s.reorderAction}</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              </Swipeable>
            );
          })}
        </ScrollView>
      )}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="fade"
        onRequestClose={closeFeedback}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeFeedback} />
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
                    color={value <= rating ? "#FBBF24" : "rgba(255,255,255,0.45)"}
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
              placeholderTextColor={c.blue500}
              multiline
              maxLength={700}
              style={styles.feedbackInput}
              textAlignVertical="top"
            />
            <View style={styles.feedbackActionsRow}>
              <Pressable
                onPress={closeFeedback}
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
  safeTop: {
    paddingHorizontal: PAD,
    paddingBottom: 8,
  },
  hint: {
    marginHorizontal: PAD,
    fontSize: fs.descText,
    color: c.blue500,
    lineHeight: 18,
    opacity: 0.9,
    marginBottom: 15,
  },  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingBottom: 100,
    gap: 12,
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
  center: {
    flex: 1,
    paddingHorizontal: PAD,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  muted: {
    fontSize: fs.smallText,
    color: c.blue500,
    textAlign: "center",
  },
  errorText: {
    fontSize: fs.smallText,
    color: "#fecaca",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.outline,
  },
  retryLabel: {
    color: c.white,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.outline,
    backgroundColor: c.blue900,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  orderRef: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: c.white,
    letterSpacing: 0.5,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: fs.xxSmallText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  partnerName: {
    fontSize: fs.smallTitle,
    fontWeight: "600",
    color: c.white,
    marginBottom: 4,
  },
  scheduleLine: {
    fontSize: fs.descText,
    color: c.blue500,
    lineHeight: 16,
    opacity: 0.92,
    marginBottom: 2,
  },
  metaGrid: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(171, 233, 254, 0.2)",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 6,
    columnGap: 8,
  },
  metaCell: {
    minWidth: 0,
  },
  metaCellRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  metaCellHalf: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  metaCellFull: {
    flexBasis: "100%",
  },
  metaLabel: {
    width: 56,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
    color: c.blue500,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    paddingTop: 1,
  },
  metaValue: {
    flex: 1,
    fontSize: fs.xxSmallText,
    color: c.white,
    lineHeight: 15,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(171, 233, 254, 0.25)",
  },
  totalLabel: {
    fontSize: fs.xxSmallText,
    fontWeight: "600",
    color: c.blue500,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  totalValue: {
    fontSize: fs.descText,
    fontWeight: "700",
    color: c.white,
  },
  reorderButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: c.filledButtonBorder,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderButtonText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: PAD,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 14, 25, 0.72)",
  },
  feedbackModalCard: {
    width: "100%",
    backgroundColor: c.blue900,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 16,
  },
  feedbackTitle: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
  },
  feedbackSubtitle: {
    marginTop: 4,
    color: c.blue500,
    fontSize: fs.descText,
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
    borderColor: c.outline,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  feedbackTypeChipSelected: {
    borderColor: c.filledButtonBorder,
    backgroundColor: "rgba(31, 200, 255, 0.12)",
  },
  feedbackTypeText: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
  feedbackTypeTextSelected: {
    color: c.white,
  },
  feedbackInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.white,
    fontSize: fs.descText,
    marginBottom: 12,
  },
  feedbackActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  feedbackCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  feedbackCancelText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  feedbackSubmitBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.filledButtonBorder,
    backgroundColor: c.lightBlue,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  feedbackSubmitText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "700",
  },
});
