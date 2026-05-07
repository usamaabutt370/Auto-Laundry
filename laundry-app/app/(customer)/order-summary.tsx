import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { submitCustomerOrder } from "@/lib/customer-order-submit";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { formatMoney } from "@/utils/format-money";

const c = theme.colors;

export default function OrderSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { draft, resetDraft } = useCustomerOrderDraft();
  const [submitting, setSubmitting] = useState(false);
  const s = strings.customer.orderSummary;
  const sServices = strings.customer.pickupServices;

  const { loading, error, estimate, profile, services, reload } = usePartnerOrderEstimate(
    draft.partnerId,
    draft,
  );

  const handleSubmitOrder = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in again to submit your order.");
      return;
    }
    if (!draft.partnerId) {
      Alert.alert("Missing launderer", "Please choose a launderer first.");
      return;
    }
    if (draft.selectedServiceIds.length === 0) {
      Alert.alert("No services selected", "Please select at least one service.");
      return;
    }
    setSubmitting(true);
    const result = await submitCustomerOrder({
      customerId: user.id,
      draft,
      estimate,
      profile,
      services,
    });
    setSubmitting(false);
    if (!result.ok) {
      Alert.alert("Unable to submit order", result.error);
      return;
    }
    resetDraft();
    Alert.alert("Order submitted", `Your order reference is ${result.orderId.slice(0, 8)}.`);
    router.replace("/(customer)/(tabs)");
  };

  const orderRef = useMemo(() => {
    const t = Date.now().toString(36).toUpperCase();
    return `AL-${t.slice(-8)}`;
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]}>
        <AppHeader
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel="Go back"
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!draft.partnerId ? (
          <View style={styles.centerBlock}>
            <Text style={styles.muted}>Select a launderer first.</Text>
            <Pressable
              onPress={() => router.replace("/(customer)/pick-launderer")}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Pick a launderer</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={c.white} />
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
            {draft.partnerName ? (
              <Text style={styles.partner}>{draft.partnerName}</Text>
            ) : null}
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
              <Text style={[styles.subheading, styles.mt]}>Estimate</Text>
              {estimate.lines.map((line) => (
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
        <Pressable
          onPress={handleSubmitOrder}
          disabled={!draft.partnerId || loading || Boolean(error) || submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            (!draft.partnerId || loading || error || submitting) && styles.submitDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.submitLabel}>
            {submitting ? "Submitting..." : s.submitOrder}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  pressed: { opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  centerBlock: { paddingVertical: 40, alignItems: "center", gap: 12 },
  partner: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 12,
  },
  card: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: c.white, marginBottom: 6 },
  ref: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 12 },
  subheading: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  mt: { marginTop: 14 },
  bullet: { fontSize: 15, color: c.white, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  rowName: { flex: 1, color: c.white, fontSize: 15, paddingRight: 8 },
  rowQty: { fontSize: 14, color: c.white, marginHorizontal: 6 },
  rowPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: c.white,
    minWidth: 72,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  totalLabel: { fontSize: 17, fontWeight: "700", color: c.white },
  totalValue: { fontSize: 20, fontWeight: "800", color: c.white },
  disclaimer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 12,
    lineHeight: 17,
  },
  muted: { color: "rgba(255,255,255,0.75)", textAlign: "center" },
  error: { color: "#FFB3B3", textAlign: "center" },
  linkBtn: { padding: 12 },
  linkText: { color: c.lightBlue, fontWeight: "600", fontSize: 16 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: c.background,
  },
  submitBtn: {
    backgroundColor: c.backgroundLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.45 },
  submitLabel: { fontSize: 17, fontWeight: "700", color: c.white },
});
