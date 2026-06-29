import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { AppHeader } from "@/components/app-header";

import {
  CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
  CustomerItemizedOrderLayout,
} from "@/components/customer-itemized-order-layout";
import { CustomerLiveEstimateFooter } from "@/components/customer-live-estimate-footer";
import { strings } from "@/constants/strings";
import { initialTailoringQuantities } from "@/constants/tailoring-items";
import { theme } from "@/constants/theme";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import {
  listPricedTailoringDefs,
  tailoringUnitForItem,
} from "@/lib/customer-order-estimate";
import { formatMoney } from "@/utils/format-money";

const c = theme.colors;

export default function TailoringItemizedByUserScreen() {
  const router = useRouter();
  const {
    draft,
    setTailoringItemizedQuantities,
    setTailoringItemizedInstructions,
  } = useCustomerOrderDraft();
  const s = strings.customer.pickupServices;
  const sDet = strings.customer.laundryBagDetail;
  const sLive = strings.customer.liveEstimate;

  const [quantities, setQuantities] = useState<Record<string, number>>(() => ({
    ...initialTailoringQuantities(),
    ...(draft.tailoring?.itemizedQuantities ?? {}),
  }));
  const [instructions, setInstructions] = useState(
    () => draft.tailoring?.itemizedInstructions ?? "",
  );

  useEffect(() => {
    setTailoringItemizedQuantities(quantities);
  }, [quantities, setTailoringItemizedQuantities]);

  useEffect(() => {
    setTailoringItemizedInstructions(instructions.trim());
  }, [instructions, setTailoringItemizedInstructions]);

  const tailoringOnlyDraft: CustomerOrderDraft = useMemo(
    () => ({
      ...draft,
      selectedServiceIds: ["tailoring"],
      washFold: null,
      dryClean: null,
      pickup: null,
      delivery: null,
    }),
    [draft],
  );

  const { loading, estimate, services } = usePartnerOrderEstimate(
    draft.partnerId,
    tailoringOnlyDraft,
  );

  const setQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = (prev[id] ?? 0) + delta;
      return { ...prev, [id]: Math.max(0, next) };
    });
  };

  const handleSave = () => {
    router.back();
  };

  const currencyPrefix = estimate.currencyPrefix;
  const availableItems = useMemo(
    () => listPricedTailoringDefs(services),
    [services],
  );

  const hasSelectedItems = useMemo(() => {
    return Object.values(quantities).some((q) => q > 0);
  }, [quantities]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]}>
        <AppHeader
          title={s.tailoring}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel="Go back"
        />
      </SafeAreaView>

      <CustomerItemizedOrderLayout
        scrollContentStyle={styles.scrollContent}
        footer={
          <>
            {hasSelectedItems ? (
              <CustomerLiveEstimateFooter
                strings={sLive}
                partnerId={draft.partnerId}
                partnerName={draft.partnerName}
                loading={loading}
                hasPartner={Boolean(draft.partnerId)}
                estimate={estimate}
              />
            ) : null}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [styles.continueBtn, pressed && styles.pressed]}
            >
              <Text style={styles.continueLabel}>{sDet.save}</Text>
            </Pressable>
          </>
        }
      >
        <Text style={styles.lead}>
          Set quantities for each type. Line totals use your launderer’s prices
          when available.
        </Text>

        {availableItems.map((item) => {
          const qty = quantities[item.id] ?? 0;
          const { amount: unit, priceLabel } = tailoringUnitForItem(services, item);
          const lineTotal =
            unit != null && qty > 0 ? Math.round(unit * qty * 100) / 100 : null;

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.unitPrice}>
                  {unit != null
                    ? `${formatMoney(currencyPrefix || "", unit)} each · ${priceLabel}`
                    : `Rate: ${priceLabel}`}
                </Text>
                {qty > 0 && lineTotal != null ? (
                  <Text style={styles.lineSubtotal}>
                    Subtotal: {formatMoney(currencyPrefix || "", lineTotal)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setQty(item.id, -1)}
                  style={styles.stepperBtn}
                  disabled={qty <= 0}
                >
                  <MaterialCommunityIcons
                    name="minus"
                    size={20}
                    color={qty <= 0 ? "rgba(255,255,255,0.5)" : c.white}
                  />
                </Pressable>
                <Text style={styles.stepperValue}>{qty}</Text>
                <Pressable
                  onPress={() => setQty(item.id, 1)}
                  style={styles.stepperBtn}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={c.white} />
                </Pressable>
              </View>
            </View>
          );
        })}
        {availableItems.length === 0 ? (
          <Text style={styles.emptyText}>No tailoring item prices have been configured by this Laundry Captain.</Text>
        ) : null}

        <Text style={styles.sectionLabel}>{sDet.instructions}</Text>
        <TextInput
          style={styles.instructions}
          value={instructions}
          onChangeText={setInstructions}
          placeholder={sDet.instructionsPlaceholder}
          placeholderTextColor="rgba(0,0,0,0.4)"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </CustomerItemizedOrderLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  pressed: { opacity: 0.8 },
  lead: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  instructions: {
    backgroundColor: c.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: c.themeBlack,
    minHeight: 88,
    maxHeight: CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.blue900,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  itemLeft: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 17, fontWeight: "700", color: c.white },
  unitPrice: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },
  lineSubtotal: {
    fontSize: 14,
    fontWeight: "700",
    color: c.lightBlue,
    marginTop: 6,
  },
  emptyText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    marginBottom: 12,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
    minWidth: 28,
    textAlign: "center",
  },
  continueBtn: {
    marginHorizontal: 24,
    marginBottom: 8,
    marginTop: 4,
    backgroundColor: c.backgroundLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  continueLabel: { fontSize: 17, fontWeight: "700", color: c.white },
});
