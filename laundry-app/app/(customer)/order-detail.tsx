import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showAppAlert } from "@/components/app-alert";
import { CustomerTrustBanner } from "@/components/customer-trust-banner";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { ReportOrderProblemModal } from "@/components/report-order-problem-modal";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { fetchCustomerOrderForEdit } from "@/lib/customer-order-edit";
import {
  fetchCustomerOrderDetail,
  hasCustomerOrderFeedback,
  submitCustomerOrderFeedback,
  deleteCustomerOrder,
  type CustomerOrderFeedbackType,
  type CustomerOrderDetailData,
  type CustomerOrderDisplayStatus,
} from "@/lib/customer-orders";
import { hasCustomerOrderDispute } from "@/lib/order-disputes";

const c = theme.colors;
const fs = theme.fontSize;
const PAD = 24;
const CARD_RADIUS = 18;

function statusLabel(status: CustomerOrderDisplayStatus): string {
  if (status === "pending") return "Pending";
  if (status === "accepted") return "Accepted";
  if (status === "completed") return "Completed";
  return "Rejected";
}

function statusColor(status: CustomerOrderDisplayStatus): string {
  if (status === "rejected") return "#D9534F";
  if (status === "accepted") return c.outline;
  if (status === "completed") return "#86efac";
  return c.white;
}

export default function CustomerOrderDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const sDetail = getStrings(locale).customer.orderDetail;
  const sReport = getStrings(locale).customer.reportProblem;
  const params = useLocalSearchParams<{ orderId?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CustomerOrderDetailData | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackChecked, setFeedbackChecked] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<CustomerOrderFeedbackType>("feedback");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [hasReportedProblem, setHasReportedProblem] = useState(false);
  const { loadDraftForEdit } = useCustomerOrderDraft();

  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !orderId) {
      setLoading(false);
      setOrder(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchCustomerOrderDetail(user.id, orderId)
      .then((detail) => {
        if (cancelled) return;
        setOrder(detail);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unable to load order.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, user?.id]);

  useEffect(() => {
    if (!user?.id || !orderId || !order || order.displayStatus === "rejected") {
      setHasReportedProblem(false);
      return;
    }

    let cancelled = false;
    void hasCustomerOrderDispute(user.id, orderId).then((reported) => {
      if (!cancelled) setHasReportedProblem(reported);
    });

    return () => {
      cancelled = true;
    };
  }, [order, orderId, user?.id]);

  useEffect(() => {
    if (!user?.id || !order || order.displayStatus !== "completed") {
      setFeedbackChecked(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const alreadySubmitted = await hasCustomerOrderFeedback(user.id, order.id);
        if (cancelled) return;
        setFeedbackChecked(true);
        if (!alreadySubmitted) {
          setFeedbackVisible(true);
        }
      } catch {
        if (!cancelled) {
          setFeedbackChecked(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [order, user?.id]);

  const handleDeleteOrder = () => {
    if (!order) return;
    showAppAlert(
      "Delete order",
      "Are you sure you want to delete this order? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteCustomerOrder(order.id);
              router.back();
            } catch (e) {
              showAppAlert("Error", e instanceof Error ? e.message : "Could not delete order.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleEditOrder = async () => {
    if (!user?.id || !order) return;
    setIsLoadingEdit(true);
    try {
      const loaded = await fetchCustomerOrderForEdit(user.id, order.id);
      if (!loaded) {
        showAppAlert("Order not found", "This order could not be loaded for editing.");
        return;
      }
      loadDraftForEdit(loaded.draft, order.id);
      router.push("/(customer)/pickup-services");
    } catch (e) {
      showAppAlert(
        "Cannot edit order",
        e instanceof Error ? e.message : sDetail.editOrderUnavailable,
      );
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user?.id || !order) return;
    if (rating < 1) {
      showAppAlert("Rating required", "Please rate the service before submitting.");
      return;
    }
    if (!feedbackMessage.trim()) {
      showAppAlert("Feedback required", "Please write a short feedback or complaint.");
      return;
    }
    if (!order.partnerId) {
      showAppAlert("Unable to submit feedback", "This laundry captain's account no longer exists.");
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      await submitCustomerOrderFeedback({
        orderId: order.id,
        customerId: user.id,
        partnerId: order.partnerId,
        rating,
        feedbackType,
        message: feedbackMessage.trim(),
      });
      setFeedbackVisible(false);
      setFeedbackChecked(true);
      setFeedbackMessage("");
      setRating(0);
      showAppAlert("Thank you!", "Your feedback has been submitted.");
    } catch (e) {
      showAppAlert(
        "Unable to submit feedback",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Order detail</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.white} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Order not found.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.heroCard}>
            <View style={styles.topRow}>
              <Text style={styles.orderRef}>Order #{order.orderRef}</Text>
              <View
                style={[
                  styles.statusPill,
                  {
                    borderColor: statusColor(order.displayStatus),
                    backgroundColor: order.displayStatus === "rejected" ? c.white : "transparent",
                  },
                ]}
              >
                <Text style={[styles.status, { color: statusColor(order.displayStatus) }]}>
                  {statusLabel(order.displayStatus)}
                </Text>
              </View>
            </View>
            <PartnerNameWithBadge
              name={order.partnerName}
              verified={order.partnerVerified}
              nameStyle={styles.partner}
            />
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{sDetail.estimatedTotal}</Text>
                <Text style={styles.metricValue}>{order.estimatedTotalLabel}</Text>
              </View>
              {order.confirmedTotalLabel ? (
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{sDetail.confirmedTotal}</Text>
                  <Text style={[styles.metricValue, styles.confirmedValue]}>
                    {order.confirmedTotalLabel}
                  </Text>
                  <Text style={styles.metricHint}>{sDetail.confirmedAtPickup}</Text>
                </View>
              ) : null}
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Items</Text>
                <Text style={styles.metricValue}>{order.totalItems}</Text>
              </View>
            </View>
          </View>

          {order.displayStatus !== "rejected" ? (
            <CustomerTrustBanner verified={order.partnerVerified} />
          ) : null}

          <View style={styles.detailCard}>
            <Text style={styles.secLabel}>Partner</Text>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="storefront-outline" size={16} color={c.outline} />
              <PartnerNameWithBadge
                name={order.partnerName}
                verified={order.partnerVerified}
                nameStyle={styles.detailValue}
                containerStyle={styles.flex1}
              />
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="phone-outline" size={16} color={c.outline} />
              <Text style={styles.detailValue}>{order.partnerPhone}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={c.outline} />
              <Text style={styles.detailValue}>{order.partnerAddress}</Text>
            </View>
            <View style={styles.partnerActionsRow}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/chat/[orderId]",
                    params: { orderId: order.id },
                  })
                }
                style={({ pressed }) => [styles.chatButton, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons name="chat-processing-outline" size={15} color={c.white} />
                <Text style={styles.chatButtonText}>Chat with partner</Text>
              </Pressable>
              {order.displayStatus !== "rejected" ? (
                <Pressable
                  onPress={() => setReportVisible(true)}
                  style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons
                    name={hasReportedProblem ? "check-circle-outline" : "alert-circle-outline"}
                    size={15}
                    color={hasReportedProblem ? c.outline : "#F6D36B"}
                  />
                  <Text style={styles.reportButtonText}>
                    {hasReportedProblem ? sReport.reportedButton : sReport.reportButton}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.sectionDivider} />

            <Text style={styles.secLabel}>Schedule</Text>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={16} color={c.outline} />
              <View style={styles.flex1}>
                <Text style={styles.detailMeta}>Pickup</Text>
                <Text style={styles.detailValue}>{order.pickupSchedule}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="package-variant-closed" size={16} color={c.outline} />
              <View style={styles.flex1}>
                <Text style={styles.detailMeta}>Delivery</Text>
                <Text style={styles.detailValue}>{order.deliverySchedule}</Text>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            <Text style={styles.secLabel}>Services</Text>
            {order.serviceGroups.map((group, gi) => (
              <View key={group.id} style={[styles.serviceGroup, gi > 0 && styles.serviceGroupSep]}>
                <View style={styles.serviceGroupHeader}>
                  <Text style={styles.serviceGroupTitle}>{group.title}</Text>
                  <Text style={styles.serviceGroupPrice}>{group.estimatedPriceLabel}</Text>
                </View>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.serviceItem}>
                    <View style={styles.flex1}>
                      <Text style={styles.serviceItemName}>{item.name}</Text>
                      <Text style={styles.detailMeta}>
                        {item.confirmedQuantity != null
                          ? `${sDetail.qtyConfirmed}: ${item.confirmedQuantity} (est. ${item.quantity})`
                          : `Qty: ${item.quantity}`}
                      </Text>
                      {item.preferences && item.preferences !== "None" ? (
                        <Text style={styles.detailMeta}>Preferences: {item.preferences}</Text>
                      ) : null}
                    </View>
                    <View style={styles.serviceItemPriceCol}>
                      <Text style={styles.serviceItemPrice}>{item.estimatedPriceLabel}</Text>
                      {item.confirmedPriceLabel ? (
                        <Text style={styles.serviceItemPriceConfirmed}>{item.confirmedPriceLabel}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.secLabel}>Payment Summary</Text>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Order fee</Text>
              <Text style={styles.payValue}>{order.estimatedTotalLabel}</Text>
            </View>
            {order.pickupFeeLabel ? (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Delivery fee</Text>
                <Text style={styles.payValue}>{order.pickupFeeLabel}</Text>
              </View>
            ) : null}
            <View style={styles.sectionDivider} />
            <View style={styles.payRow}>
              <Text style={styles.payTotalLabel}>
                {order.confirmedTotalLabel ? "Confirmed total" : "Estimated total"}
              </Text>
              <Text style={styles.payTotalValue}>{order.grandTotalLabel}</Text>
            </View>
          </View>

          {order.notes ? (
            <View style={styles.detailCard}>
              <Text style={styles.secLabel}>Order notes</Text>
              <Text style={styles.detailValue}>{order.notes}</Text>
            </View>
          ) : null}

          {order.displayStatus === "rejected" && order.rejectionReasonOption ? (
            <View style={styles.detailCard}>
              <Text style={styles.secLabel}>Rejection reason</Text>
              <Text style={styles.detailValue}>
                {order.rejectionReasonDetails
                  ? `${order.rejectionReasonOption} - ${order.rejectionReasonDetails}`
                  : order.rejectionReasonOption}
              </Text>
            </View>
          ) : null}

          {order.displayStatus === "pending" && order.rawStatus === "submitted" ? (
            <View style={styles.detailCard}>
              <Text style={styles.secLabel}>Actions</Text>
              <Pressable
                onPress={handleDeleteOrder}
                disabled={isDeleting}
                style={({ pressed }) => [
                  styles.deleteOrderBtn,
                  pressed && !isDeleting && styles.pressed,
                  isDeleting && styles.editOrderBtnDisabled,
                ]}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#f87171" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#f87171" />
                    <Text style={[styles.editOrderBtnText, styles.deleteOrderBtnText]}>Delete order</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
          </ScrollView>
        </>
      )}
      {order?.displayStatus === "completed" && feedbackChecked ? (
        <Modal
          visible={feedbackVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFeedbackVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setFeedbackVisible(false)} />
            <View style={styles.feedbackModalCard}>
              <Text style={styles.feedbackTitle}>How was your laundry service?</Text>
              <Text style={styles.feedbackSubtitle}>
                Rate this completed order and share your feedback.
              </Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setRating(value)}
                    style={({ pressed }) => [styles.starBtn, pressed && styles.pressed]}
                  >
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
                ).map((typeOption) => {
                  const selected = feedbackType === typeOption.id;
                  return (
                    <Pressable
                      key={typeOption.id}
                      onPress={() => setFeedbackType(typeOption.id)}
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
                        {typeOption.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={feedbackMessage}
                onChangeText={setFeedbackMessage}
                placeholder="Tell us what went well, or what needs to improve..."
                placeholderTextColor={c.blue500}
                multiline
                style={styles.feedbackInput}
                textAlignVertical="top"
                maxLength={700}
              />
              <View style={styles.feedbackActionsRow}>
                <Pressable
                  onPress={() => setFeedbackVisible(false)}
                  style={[styles.feedbackCancelBtn, isSubmittingFeedback && styles.disabled]}
                  disabled={isSubmittingFeedback}
                >
                  <Text style={styles.feedbackCancelText}>Later</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSubmitFeedback()}
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
      {order && user?.id && order.displayStatus !== "rejected" ? (
        <ReportOrderProblemModal
          visible={reportVisible}
          orderId={order.id}
          orderRef={order.orderRef}
          customerId={user.id}
          partnerId={order.partnerId}
          onClose={() => setReportVisible(false)}
          onSubmitted={() => setHasReportedProblem(true)}
        />
      ) : null}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: c.white,
    fontSize: fs.titleMedium,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PAD,
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    backgroundColor: c.blue900,
    padding: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  orderRef: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
  },
  status: {
    fontSize: fs.descText,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  partner: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "600",
    marginTop: 6,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
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
  confirmedValue: {
    color: c.lightBlue,
  },
  metricHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 14,
  },
  detailCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    backgroundColor: c.blue900,
    padding: 18,
  },
  secLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: c.blue500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 18,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  detailMeta: {
    fontSize: 11,
    color: c.blue500,
    fontWeight: "600",
    marginBottom: 2,
  },
  detailValue: {
    flex: 1,
    color: c.white,
    fontSize: 14,
    lineHeight: 20,
  },
  flex1: {
    flex: 1,
  },
  partnerActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: c.background,
  },
  chatButtonText: {
    color: c.white,
    fontSize: 13,
    fontWeight: "600",
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(246, 211, 107, 0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(246, 211, 107, 0.08)",
  },
  reportButtonText: {
    color: c.white,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#f87171",
    borderRadius: 12,
    paddingVertical: 14,
  },
  editOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.backgroundLight,
    borderRadius: 12,
    paddingVertical: 14,
  },
  editOrderBtnFlex: {
    flex: 1,
  },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.backgroundLight,
    borderRadius: 12,
    paddingVertical: 14,
  },
  editOrderBtnDisabled: {
    opacity: 0.6,
  },
  editOrderBtnText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  deleteOrderBtnText: {
    color: "#f87171",
  },
  serviceGroup: {},
  serviceGroupSep: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.09)",
  },
  serviceGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceGroupTitle: {
    color: c.white,
    fontSize: 14,
    fontWeight: "700",
  },
  serviceGroupPrice: {
    color: c.blue500,
    fontSize: 13,
    fontWeight: "700",
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  serviceItemName: {
    color: c.white,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 3,
  },
  serviceItemPriceCol: {
    alignItems: "flex-end",
    gap: 3,
  },
  serviceItemPrice: {
    color: c.white,
    fontSize: 14,
    fontWeight: "700",
  },
  serviceItemPriceConfirmed: {
    color: c.lightBlue,
    fontSize: 13,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAD,
  },
  errorText: {
    color: "#fecaca",
    textAlign: "center",
    fontSize: fs.smallText,
  },
  mutedText: {
    color: c.blue500,
    textAlign: "center",
    fontSize: fs.smallText,
  },
  pressed: {
    opacity: 0.8,
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
  disabled: {
    opacity: 0.55,
  },
  payRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  payLabel: {
    fontSize: fs.descText,
    color: c.blue500,
  },
  payValue: {
    fontSize: fs.descText,
    fontWeight: "600",
    color: c.white,
  },
  payTotalLabel: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: c.white,
  },
  payTotalValue: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: c.lightBlue,
  },
});
