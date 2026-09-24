import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
  CustomerItemizedOrderLayout,
} from "@/components/customer-itemized-order-layout";
import { CustomerLiveEstimateFooter } from "@/components/customer-live-estimate-footer";
import { AppCtaButton } from "@/components/ui/cta-button";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { strings } from "@/constants/strings";
import { initialTailoringQuantities, isLadiesTailoringItem } from "@/constants/tailoring-items";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  listPricedTailoringDefs,
  tailoringUnitForItem,
} from "@/lib/customer-order-estimate";
import { getStrings } from "@/locales";
import { formatMoney } from "@/utils/format-money";
import { UI } from "@/constants/theme";

export default function TailoringItemizedByUserScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const { isNarrow, ms } = useResponsiveLayout();
  const onboardingStrings = getStrings(locale).partner.onboarding;
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
      press: null,
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

  const displayName = (item: { id: string; name: string }) => {
    const onboarding = onboardingStrings as Record<string, string>;
    return onboarding[item.id]?.trim() || item.name;
  };

  const hasSelectedItems = useMemo(() => {
    return Object.values(quantities).some((q) => q > 0);
  }, [quantities]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={UI.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {s.tailoring}
          </Text>
          <View style={styles.headerSide} />
        </View>
      </SafeAreaView>

      <CustomerItemizedOrderLayout
        appearance="light"
        scrollContentStyle={styles.scrollContent}
        footer={
          <>
            {hasSelectedItems ? (
              <CustomerLiveEstimateFooter
                appearance="light"
                strings={sLive}
                partnerId={draft.partnerId}
                partnerName={draft.partnerName}
                loading={loading}
                hasPartner={Boolean(draft.partnerId)}
                estimate={estimate}
              />
            ) : null}
            <AppCtaButton
              label={sDet.save}
              onPress={handleSave}
              width="full"
              accessibilityLabel={sDet.save}
              style={styles.confirmBtn}
            />
          </>
        }
      >
        <Text style={styles.lead}>
          Set quantities for each type. Line totals use your launderer’s prices
          when available.
        </Text>

        {(() => {
          let ladiesHeaderShown = false;
          return availableItems.map((item) => {
          const qty = quantities[item.id] ?? 0;
          const { amount: unit, priceLabel } = tailoringUnitForItem(services, item);
          const lineTotal =
            unit != null && qty > 0 ? Math.round(unit * qty * 100) / 100 : null;
          const isLadies = isLadiesTailoringItem(item.id);
          const showHeader = isLadies && !ladiesHeaderShown;
          if (isLadies) ladiesHeaderShown = true;
          const ladiesLabel = (onboardingStrings as Record<string, string>).tailoringLadiesSection ?? "Ladies Stitching";

          return (
            <React.Fragment key={item.id}>
              {showHeader ? (
                <Text style={styles.sectionHeader}>{ladiesLabel}</Text>
              ) : null}
            <View style={[styles.itemCard, isNarrow && styles.itemCardNarrow]}>
              <View style={styles.itemLeft}>
                <Text style={[styles.itemName, { fontSize: ms(isNarrow ? 14 : 16) }]} numberOfLines={2}>
                  {displayName(item)}
                </Text>
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
              <QtyStepper
                value={qty}
                onDecrement={() => setQty(item.id, -1)}
                onIncrement={() => setQty(item.id, 1)}
                incrementColor={UI.teal}
              />
            </View>
            </React.Fragment>
          );
        })})()}
        {availableItems.length === 0 ? (
          <Text style={styles.emptyText}>No tailoring item prices have been configured by this Laundry Captain.</Text>
        ) : null}

        <Text style={styles.sectionLabel}>{sDet.instructions}</Text>
        <TextInput
          style={styles.instructions}
          value={instructions}
          onChangeText={setInstructions}
          placeholder={sDet.instructionsPlaceholder}
          placeholderTextColor={UI.muted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </CustomerItemizedOrderLayout>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  headerSide: { width: 36 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  lead: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 22,
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  instructions: {
    backgroundColor: UI.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: UI.text,
    minHeight: 88,
    maxHeight: CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: UI.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  itemCardNarrow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  itemLeft: { flex: 1, minWidth: 0, paddingRight: 12 },
  itemName: {
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  unitPrice: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginTop: 4,
  },
  lineSubtotal: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: UI.teal,
    marginTop: 6,
  },
  emptyText: {
    color: UI.muted,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 12,
  },
  confirmBtn: {
    marginTop: 8,
    marginBottom: 8,
  },
});
