import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { useStripe } from "@stripe/stripe-react-native";

import { theme } from "@/constants/theme";
import { env } from "@/constants/env";
import { createOrderPaymentIntent } from "@/lib/customer-payment";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/customer-order-submit";
import { formatMoney } from "@/utils/format-money";

const c = theme.colors;

export default function PaymentMethodScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardZip, setCardZip] = useState("");
  const [selectedCardLabel, setSelectedCardLabel] = useState(
    "Visa, Mastercard, American Express",
  );
  const [billingModalVisible, setBillingModalVisible] = useState(false);
  const [billingLine1, setBillingLine1] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountry, setBillingCountry] = useState("PK");
  const [billingSummary, setBillingSummary] = useState<string | null>(null);
  const params = useLocalSearchParams<{
    orderId?: string | string[];
    amount?: string | string[];
    currencyPrefix?: string | string[];
  }>();

  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const amountRaw = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  const currencyPrefixRaw = Array.isArray(params.currencyPrefix)
    ? params.currencyPrefix[0]
    : params.currencyPrefix;
  const amount = Number(amountRaw ?? "0");
  const currencyPrefix = currencyPrefixRaw ?? "";

  const amountLabel = useMemo(
    () => (Number.isFinite(amount) ? formatMoney(currencyPrefix, amount) : "—"),
    [amount, currencyPrefix],
  );

  const addCard = () => {
    const sanitizedNumber = cardNumber.replace(/\s/g, "");
    const sanitizedExpiry = cardExpiry.trim();
    const sanitizedCvc = cardCvc.trim();
    const holder = cardHolderName.trim();

    if (holder.length < 2) {
      setInlineError("Please enter the card holder name.");
      return;
    }
    if (!/^\d{13,19}$/.test(sanitizedNumber)) {
      setInlineError("Please enter a valid card number.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(sanitizedExpiry)) {
      setInlineError("Use expiry in MM/YY format.");
      return;
    }
    if (!/^\d{3,4}$/.test(sanitizedCvc)) {
      setInlineError("Please enter a valid CVC.");
      return;
    }

    const last4 = sanitizedNumber.slice(-4);
    setSelectedCardLabel(`Card ending in ${last4}`);
    setCardModalVisible(false);
    setInlineError(null);
  };

  const saveBillingAddress = () => {
    const line1 = billingLine1.trim();
    const city = billingCity.trim();
    const state = billingState.trim();
    const postal = billingPostalCode.trim();
    const country = billingCountry.trim().toUpperCase();
    if (!line1 || !city || !state || !postal) {
      setInlineError("Please fill all required billing address fields.");
      return;
    }
    if (!/^[A-Z]{2}$/.test(country)) {
      setInlineError("Country should be a 2-letter code (e.g., PK, US).");
      return;
    }
    setBillingCountry(country);
    setBillingSummary(`${line1}, ${city}, ${state} ${postal}, ${country}`);
    setBillingModalVisible(false);
    setInlineError(null);
  };

  const payWithCard = async () => {
    setInlineError(null);
    if (!orderId) {
      setInlineError("Order id was not provided.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setInlineError("Unable to process payment amount.");
      return;
    }
    if (!env.stripePublishableKey) {
      setInlineError(
        "Stripe is not configured. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY first.",
      );
      return;
    }

    setSubmitting(true);
    const intent = await createOrderPaymentIntent({
      orderId,
      amount,
      currencyPrefix,
    });
    if (!intent.ok) {
      setSubmitting(false);
      await markOrderPaymentFailed(orderId);
      setInlineError(intent.error);
      return;
    }

    const init = await initPaymentSheet({
      merchantDisplayName: "Auto Laundry",
      paymentIntentClientSecret: intent.data.clientSecret,
      allowsDelayedPaymentMethods: false,
      defaultBillingDetails: {
        name: cardHolderName.trim() || undefined,
        address: billingSummary
          ? {
              line1: billingLine1.trim(),
              city: billingCity.trim(),
              state: billingState.trim(),
              postalCode: billingPostalCode.trim(),
              country: billingCountry.trim().toUpperCase(),
            }
          : undefined,
      },
    });
    if (init.error) {
      setSubmitting(false);
      await markOrderPaymentFailed(orderId);
      setInlineError(init.error.message);
      return;
    }

    const present = await presentPaymentSheet();
    if (present.error) {
      setSubmitting(false);
      await markOrderPaymentFailed(orderId);
      setInlineError(present.error.message);
      return;
    }

    const finalize = await markOrderPaid(orderId, intent.data.paymentIntentId);
    setSubmitting(false);
    if (!finalize.ok) {
      Alert.alert(
        "Payment captured but order update failed",
        `${finalize.error}. Please contact support with order ${orderId.slice(0, 8)}.`,
      );
      return;
    }

    router.replace({
      pathname: "/(customer)/payment-success",
      params: { orderId: orderId.slice(0, 8) },
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.headerRight} />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Order total</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Payable amount</Text>
          <Text style={styles.amount}>{amountLabel}</Text>
          {orderId ? <Text style={styles.summaryRef}>Order #{orderId.slice(0, 8)}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Payment method</Text>
        <View style={[styles.cardTile, styles.cardTileActive]}>
          <MaterialCommunityIcons name="credit-card-outline" size={24} color={c.white} />
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTileLabel}>Card payment</Text>
            <Text style={styles.cardTileSub}>{selectedCardLabel}</Text>
          </View>
          <MaterialCommunityIcons name="check-circle" size={20} color={c.lightBlue} />
        </View>

        <Pressable style={styles.secondaryRow} onPress={() => setCardModalVisible(true)}>
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={20}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.secondaryRowLabel}>Add another payment method</Text>
          <Text style={styles.comingSoon}>Add</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Promo code</Text>
        <View style={styles.promoRow}>
          <TextInput
            value={promoCode}
            onChangeText={setPromoCode}
            placeholder="Enter promo code"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.promoInput}
            autoCapitalize="characters"
          />
          <Pressable
            onPress={() => Alert.alert("Promo code", "Promo support will be added soon.")}
            style={styles.applyBtn}
          >
            <Text style={styles.applyBtnLabel}>Apply</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Billing details</Text>
        <Pressable style={styles.secondaryRow} onPress={() => setBillingModalVisible(true)}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={20}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.secondaryRowLabel}>
            {billingSummary ? "Edit billing address" : "Add billing address"}
          </Text>
          <Text style={styles.comingSoon}>{billingSummary ? "Saved" : "Add"}</Text>
        </Pressable>
        {billingSummary ? (
          <Text style={styles.savedBillingText}>{billingSummary}</Text>
        ) : null}

        {inlineError ? <Text style={styles.inlineError}>{inlineError}</Text> : null}

        <Pressable
          onPress={payWithCard}
          disabled={submitting}
          style={({ pressed }) => [
            styles.payBtn,
            submitting && styles.payBtnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.payBtnLabel}>{submitting ? "Processing..." : "Pay now"}</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={cardModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCardModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add card details</Text>

            <TextInput
              value={cardHolderName}
              onChangeText={setCardHolderName}
              placeholder="Card holder name"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.modalInput}
            />
            <TextInput
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="Card number"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.modalInput}
              keyboardType="number-pad"
              maxLength={19}
            />
            <View style={styles.modalRow}>
              <TextInput
                value={cardExpiry}
                onChangeText={setCardExpiry}
                placeholder="MM/YY"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.modalInput, styles.modalInputHalf]}
                keyboardType="number-pad"
                maxLength={5}
              />
              <TextInput
                value={cardCvc}
                onChangeText={setCardCvc}
                placeholder="CVC"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.modalInput, styles.modalInputHalf]}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <TextInput
              value={cardZip}
              onChangeText={setCardZip}
              placeholder="ZIP / Postal code (optional)"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setCardModalVisible(false)}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalBtnLabel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={addCard} style={[styles.modalBtn, styles.modalSaveBtn]}>
                <Text style={styles.modalBtnLabel}>Save card</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={billingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBillingModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Billing address</Text>

            <TextInput
              value={billingLine1}
              onChangeText={setBillingLine1}
              placeholder="Address line 1"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.modalInput}
            />
            <View style={styles.modalRow}>
              <TextInput
                value={billingCity}
                onChangeText={setBillingCity}
                placeholder="City"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.modalInput, styles.modalInputHalf]}
              />
              <TextInput
                value={billingState}
                onChangeText={setBillingState}
                placeholder="State / Province"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.modalInput, styles.modalInputHalf]}
              />
            </View>
            <View style={styles.modalRow}>
              <TextInput
                value={billingPostalCode}
                onChangeText={setBillingPostalCode}
                placeholder="Postal code"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.modalInput, styles.modalInputHalf]}
              />
              <TextInput
                value={billingCountry}
                onChangeText={setBillingCountry}
                placeholder="Country code (PK)"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.modalInput, styles.modalInputHalf]}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setBillingModalVisible(false)}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={styles.modalBtnLabel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveBillingAddress} style={[styles.modalBtn, styles.modalSaveBtn]}>
                <Text style={styles.modalBtnLabel}>Save address</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: c.white },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30 },
  sectionTitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 14,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    backgroundColor: c.blue900,
    padding: 16,
  },
  summaryLabel: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  amount: { color: c.white, fontSize: 34, fontWeight: "800", marginTop: 6 },
  summaryRef: { marginTop: 8, color: "rgba(255,255,255,0.68)", fontSize: 13 },
  cardTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    backgroundColor: c.blue900,
    padding: 16,
  },
  cardTileActive: {
    borderColor: c.lightBlue,
  },
  cardTextWrap: { flex: 1, gap: 2 },
  cardTileLabel: { color: c.white, fontSize: 16, fontWeight: "600" },
  cardTileSub: { color: "rgba(255,255,255,0.68)", fontSize: 12 },
  secondaryRow: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    opacity: 0.85,
  },
  secondaryRowLabel: { flex: 1, color: c.white, fontSize: 14 },
  comingSoon: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "600",
  },
  promoRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.white,
    backgroundColor: c.blue900,
    fontSize: 15,
  },
  applyBtn: {
    backgroundColor: c.backgroundLight,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  applyBtnLabel: {
    color: c.white,
    fontWeight: "700",
    fontSize: 14,
  },
  inlineError: {
    marginTop: 14,
    color: "#FFC0C0",
    fontSize: 13,
    lineHeight: 18,
  },
  savedBillingText: {
    marginTop: 8,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: c.white,
    backgroundColor: "rgba(0,0,0,0.08)",
    fontSize: 15,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalInputHalf: {
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  modalSaveBtn: {
    backgroundColor: c.backgroundLight,
  },
  modalBtnLabel: {
    color: c.white,
    fontWeight: "700",
    fontSize: 14,
  },
  payBtn: {
    marginTop: 24,
    backgroundColor: c.backgroundLight,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 16,
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnLabel: { color: c.white, fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.8 },
});
