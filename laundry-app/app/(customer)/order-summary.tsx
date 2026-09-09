import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showAppAlert } from "@/components/app-alert";
import { CustomerTrustBanner } from "@/components/customer-trust-banner";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { SignInRequiredModal } from "@/components/sign-in-required-modal";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import { strings } from "@/constants/strings";
import { useAuth } from "@/contexts/auth-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { updateCustomerOrder } from "@/lib/customer-order-edit";
import { submitCustomerOrder } from "@/lib/customer-order-submit";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { formatMoney } from "@/utils/format-money";
import { runAfterModalTeardown } from "@/utils/run-after-modal-teardown";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  backBg: "#EEF2F6",
  chipBorder: "#E5E7EB",
  shadow: "rgba(17, 24, 39, 0.08)",
};

function formatOrderReference(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function goToSubmittedOrderDetail(
  router: ReturnType<typeof useRouter>,
  orderId: string,
) {
  runAfterModalTeardown(() => {
    if (typeof router.dismissAll === "function") {
      try {
        router.dismissAll();
      } catch {
        // Some navigators may not support dismissAll in every state.
      }
    }
    router.replace({
      pathname: "/(customer)/order-detail",
      params: { orderId },
    });
  });
}

/**
 * Open auth from guest order submit as a sheet on top of the current screen.
 * Do not dismiss order-summary / pick-launderer first — that caused a close-then-open flash.
 */
function goToAuthFromOrderSummary(
  router: ReturnType<typeof useRouter>,
  pathname: "/(auth)/login" | "/(auth)/sign-up",
) {
  router.push({
    pathname,
    params: { returnTo: "order-summary" },
  });
}

export default function OrderSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { draft, editingOrderId, resetDraft } = useCustomerOrderDraft();
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signInPromptVisible, setSignInPromptVisible] = useState(false);
  const isEditing = Boolean(editingOrderId);
  const s = strings.customer.orderSummary;
  const sServices = strings.customer.pickupServices;

  const partnerVerified = usePartnerVerified(draft.partnerId);
  const { loading, error, estimate, profile, services, reload } = usePartnerOrderEstimate(
    draft.partnerId,
    draft,
  );

  const handleSubmitOrder = async () => {
    const fail = (title: string, message: string) => {
      setSubmitError(message);
      showAppAlert(title, message);
      // Native alert as hard fallback — custom Modal alerts can fail silently on some builds.
      Alert.alert(title, message);
    };

    if (!user?.id) {
      setSignInPromptVisible(true);
      return;
    }
    if (!draft.partnerId) {
      fail("No Laundry Captain selected", "Please select a Laundry Captain first.");
      return;
    }
    if (draft.selectedServiceIds.length === 0) {
      fail("No services selected", "Please select at least one service.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (isEditing && editingOrderId) {
        const result = await updateCustomerOrder({
          customerId: user.id,
          orderId: editingOrderId,
          draft,
          estimate,
          services,
        });
        if (!result.ok) {
          fail("Unable to save changes", result.error || "Unknown error while saving.");
          return;
        }
        const savedOrderId = editingOrderId;
        setSubmittedOrderId(null);
        resetDraft();
        showAppAlert(s.orderUpdated, s.orderUpdatedMessage, [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/(customer)/order-detail",
                params: { orderId: savedOrderId },
              }),
          },
        ]);
        return;
      }

      const result = await submitCustomerOrder({
        customerId: user.id,
        draft,
        estimate,
        profile,
        services,
      });
      if (!result.ok) {
        const message = result.error || "Unknown error while submitting.";
        console.warn("[order-summary] submit failed", message);
        fail("Unable to submit order", message);
        return;
      }
      console.log("[order-summary] submit ok", result.orderId);
      setSubmittedOrderId(result.orderId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while submitting.";
      console.warn("[order-summary] submit threw", err);
      fail("Unable to submit order", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmittedOrderContinue = () => {
    if (!submittedOrderId) return;
    const orderId = submittedOrderId;
    setSubmittedOrderId(null);
    resetDraft();
    goToSubmittedOrderDetail(router, orderId);
  };

  const orderRef = useMemo(() => {
    if (isEditing && editingOrderId) {
      return editingOrderId.replace(/-/g, "").slice(0, 8).toUpperCase();
    }
    const t = Date.now().toString(36).toUpperCase();
    return `AL-${t.slice(-8)}`;
  }, [editingOrderId, isEditing]);

  const serviceLines = useMemo(
    () => estimate.lines.filter((line) => line.key !== "pickup_delivery"),
    [estimate.lines],
  );
  const pickupLine = useMemo(
    () => estimate.lines.find((line) => line.key === "pickup_delivery"),
    [estimate.lines],
  );
  const pickupFeeDisplay = useMemo(() => {
    if (pickupLine?.amount != null) {
      return formatMoney(estimate.currencyPrefix, pickupLine.amount);
    }
    const raw = profile?.pickup_delivery_amount?.trim();
    if (!raw) return "—";
    return raw;
  }, [estimate.currencyPrefix, pickupLine?.amount, profile?.pickup_delivery_amount]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEditing ? s.editTitle : s.title}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={UI.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!draft.partnerId ? (
          <View style={styles.centerBlock}>
            <Text style={styles.muted}>Select a Laundry Captain first.</Text>
            <Pressable
              onPress={() => router.replace("/(customer)/pick-launderer")}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Pick a Laundry Captain</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={UI.teal} />
          </View>
        ) : error ? (
          <View style={styles.centerBlock}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={reload} style={styles.linkBtn}>
              <Text style={styles.linkText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {isEditing ? (
              <Text style={styles.lockedPartnerNote}>{s.lockedLaundererNote}</Text>
            ) : null}
            {draft.partnerName ? (
              <PartnerNameWithBadge
                name={draft.partnerName}
                verified={partnerVerified}
                nameStyle={styles.partner}
              />
            ) : null}
            <CustomerTrustBanner
              appearance="light"
              verified={partnerVerified}
              onPressChat={() => {
                if (editingOrderId) {
                  router.push({
                    pathname: "/(customer)/chat/[orderId]",
                    params: {
                      orderId: editingOrderId,
                      memberName: draft.partnerName ?? "",
                    },
                  });
                  return;
                }
                router.push("/(customer)/(tabs)/chat");
              }}
            />
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{s.service}</Text>
              <Text style={styles.ref}>
                {s.orderNumber}: {orderRef}
              </Text>
              <Text style={styles.subheading}>Services</Text>
              {draft.selectedServiceIds.map((id) => (
                <Text key={id} style={styles.bullet}>
                  • {sServices[id]}
                </Text>
              ))}
              {serviceLines.length > 0 ? (
                <>
                  <Text style={[styles.subheading, styles.mt]}>Estimate</Text>
                  {serviceLines.map((line) => (
                    <View key={line.key} style={styles.row}>
                      <Text style={styles.rowName} numberOfLines={2}>
                        {line.title}
                      </Text>
                      <Text style={styles.rowQty}>{line.qtyLabel}</Text>
                      <Text style={styles.rowPrice}>
                        {line.amount != null
                          ? formatMoney(estimate.currencyPrefix, line.amount)
                          : "—"}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
              {draft.pickupDeliveryRequested ? (
                <>
                  <Text style={[styles.subheading, styles.mt]}>{s.pickupDelivery}</Text>
                  <View style={styles.row}>
                    <Text style={styles.rowName}>{s.pickupDeliveryFee}</Text>
                    <Text style={styles.rowPrice}>{pickupFeeDisplay}</Text>
                  </View>
                </>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{s.estimatedTotal}</Text>
                <Text style={styles.totalValue}>
                  {estimate.total != null
                    ? formatMoney(estimate.currencyPrefix, estimate.total)
                    : estimate.partialTotal > 0
                      ? `${formatMoney(estimate.currencyPrefix, estimate.partialTotal)} *`
                      : "—"}
                </Text>
              </View>
              {estimate.disclaimer ? (
                <Text style={styles.disclaimer}>{estimate.disclaimer}</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        <Pressable
          onPress={handleSubmitOrder}
          disabled={!draft.partnerId || loading || Boolean(error) || submitting}
          style={({ pressed }) => [
            styles.submitWrap,
            (!draft.partnerId || loading || error || submitting) && styles.submitDisabled,
            pressed && styles.pressed,
          ]}
        >
          <LinearGradient
            colors={["#4A3AFF", "#12B886"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.submitBtn}
          >
            <Text style={styles.submitLabel}>
              {submitting
                ? isEditing
                  ? "Saving..."
                  : "Submitting..."
                : isEditing
                  ? s.saveChanges
                  : s.submitOrder}
            </Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>

      <SignInRequiredModal
        visible={signInPromptVisible}
        onClose={() => setSignInPromptVisible(false)}
        onSignIn={() => {
          goToAuthFromOrderSummary(router, "/(auth)/login");
          // Keep prompt until the sheet covers it (avoids close-then-open flash).
          setTimeout(() => setSignInPromptVisible(false), 500);
        }}
        onSignUp={() => {
          goToAuthFromOrderSummary(router, "/(auth)/sign-up");
          setTimeout(() => setSignInPromptVisible(false), 500);
        }}
      />

      {submittedOrderId != null ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={handleSubmittedOrderContinue}
        >
          <View style={styles.successOverlay}>
            <View style={styles.successCard}>
              <View style={styles.successIconRing}>
                <View style={styles.successIconWrap}>
                  <MaterialCommunityIcons name="check" size={32} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.successTitle}>{s.orderSubmitted}</Text>
              <Text style={styles.successMessage}>{s.orderSubmittedMessage}</Text>
              <View style={styles.successRefChip}>
                <Text style={styles.successRefLabel}>{s.orderSubmittedRef}</Text>
                <Text style={styles.successRefValue}>
                  {formatOrderReference(submittedOrderId)}
                </Text>
              </View>
              <Pressable
                onPress={handleSubmittedOrderContinue}
                style={({ pressed }) => [styles.successBtnWrap, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={s.orderSubmittedOk}
              >
                <LinearGradient
                  colors={["#4A3AFF", "#12B886"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.successBtn}
                >
                  <Text style={styles.successBtnLabel}>{s.orderSubmittedOk}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
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
    paddingVertical: 15,
    gap: 10,
  },
  headerSide: { width: 36 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  centerBlock: { paddingVertical: 40, alignItems: "center", gap: 12 },
  partner: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 12,
  },
  lockedPartnerNote: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginBottom: 8,
    lineHeight: 18,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 6,
  },
  ref: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginBottom: 14,
  },
  subheading: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  mt: { marginTop: 14 },
  bullet: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: UI.text,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI.chipBorder,
  },
  rowName: {
    flex: 1,
    color: UI.text,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    paddingRight: 8,
  },
  rowQty: {
    fontSize: 13,
    color: UI.muted,
    fontFamily: "Poppins-Medium",
    marginHorizontal: 6,
  },
  rowPrice: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: UI.teal,
    minWidth: 72,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: UI.chipBorder,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginTop: 12,
    lineHeight: 17,
  },
  muted: {
    color: UI.muted,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  error: {
    color: "#B91C1C",
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  linkBtn: { padding: 12 },
  linkText: {
    color: UI.teal,
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: UI.bg,
  },
  submitError: {
    color: "#B91C1C",
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    lineHeight: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  submitWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.45 },
  submitLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  successCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: UI.card,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  successIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    textAlign: "center",
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
    marginBottom: 14,
  },
  successRefChip: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    alignSelf: "stretch",
  },
  successRefLabel: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  successRefValue: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    letterSpacing: 1,
  },
  successBtnWrap: {
    alignSelf: "stretch",
    borderRadius: 16,
    overflow: "hidden",
  },
  successBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  successBtnLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
});
