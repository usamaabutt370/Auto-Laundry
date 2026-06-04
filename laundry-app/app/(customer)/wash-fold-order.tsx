import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import {
  CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
  CustomerItemizedOrderLayout,
} from "@/components/customer-itemized-order-layout";
import { CustomerLiveEstimateFooter } from "@/components/customer-live-estimate-footer";
import {
  WashFoldPackageBox,
  WashFoldPackageGrid,
} from "@/components/wash-fold-package-box";
import { theme } from "@/constants/theme";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { initialWashFoldQuantities } from "@/constants/wash-fold-items";
import {
  getWashFoldPackageDescription,
  type WashFoldPackageCatalogKey,
} from "@/constants/partner-wash-fold-items";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import {
  listPricedWashFoldDefs,
  washFoldUnitForItem,
} from "@/lib/customer-order-estimate";
import { getStrings } from "@/locales";
import { formatMoney } from "@/utils/format-money";

const c = theme.colors;

export default function WashFoldOrderScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.washFoldOrder;
  const sDet = getStrings(locale).customer.laundryBagDetail;
  const sLive = getStrings(locale).customer.liveEstimate;

  const {
    draft,
    setWashFoldItemizedQuantities,
    setWashFoldItemizedInstructions,
  } = useCustomerOrderDraft();

  const [quantities, setQuantities] = useState<Record<string, number>>(() => ({
    ...initialWashFoldQuantities(),
    ...(draft.washFold?.itemizedQuantities ?? {}),
  }));
  const [instructions, setInstructions] = useState(
    () => draft.washFold?.itemizedInstructions ?? "",
  );
  const [washFoldTab, setWashFoldTab] = useState<"items" | "packages">("items");

  useEffect(() => {
    setWashFoldItemizedQuantities(quantities);
  }, [quantities, setWashFoldItemizedQuantities]);

  useEffect(() => {
    setWashFoldItemizedInstructions(instructions.trim());
  }, [instructions, setWashFoldItemizedInstructions]);

  const washOnlyDraft: CustomerOrderDraft = useMemo(
    () => ({
      ...draft,
      selectedServiceIds: ["washAndFold"],
      dryClean: null,
      tailoring: null,
      pickup: null,
      delivery: null,
    }),
    [draft],
  );

  const { loading, error, estimate, services, reload } = usePartnerOrderEstimate(
    draft.partnerId,
    washOnlyDraft,
  );

  useFocusEffect(
    useCallback(() => {
      if (draft.partnerId) reload();
    }, [draft.partnerId, reload]),
  );

  const setQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = (prev[id] ?? 0) + delta;
      return { ...prev, [id]: Math.max(0, next) };
    });
  };

  const currencyPrefix = estimate.currencyPrefix;

  const pricedDefs = useMemo(() => listPricedWashFoldDefs(services), [services]);

  const availableGarments = useMemo(
    () => pricedDefs.filter((item) => item.kind === "garment"),
    [pricedDefs],
  );

  const availablePackages = useMemo(
    () => pricedDefs.filter((item) => item.kind === "package"),
    [pricedDefs],
  );

  const hasSelectedItems = useMemo(
    () => Object.values(quantities).some((q) => q > 0),
    [quantities],
  );

  const hasAnyRates = availableGarments.length > 0 || availablePackages.length > 0;
  const showItemsTab = availableGarments.length > 0;
  const showPackagesTab = availablePackages.length > 0;
  const showWashFoldTabs = showItemsTab && showPackagesTab;
  const effectiveWashFoldTab: "items" | "packages" = showWashFoldTabs
    ? washFoldTab
    : showPackagesTab
      ? "packages"
      : "items";

  const selectedGarmentCount = useMemo(
    () =>
      availableGarments.reduce(
        (sum, def) => sum + Math.max(0, quantities[def.id] ?? 0),
        0,
      ),
    [availableGarments, quantities],
  );

  const selectedPackageCount = useMemo(
    () =>
      availablePackages.reduce(
        (sum, def) => sum + ((quantities[def.id] ?? 0) > 0 ? 1 : 0),
        0,
      ),
    [availablePackages, quantities],
  );

  useEffect(() => {
    if (!hasAnyRates) return;
    if (showItemsTab && !showPackagesTab) {
      setWashFoldTab("items");
    } else if (showPackagesTab && !showItemsTab) {
      setWashFoldTab("packages");
    }
  }, [draft.partnerId, hasAnyRates, showItemsTab, showPackagesTab]);

  const onboardingStrings = getStrings(locale).partner.onboarding;

  const displayName = (def: { id: string; name: string }) => {
    const onboarding = onboardingStrings as Record<string, string>;
    return onboarding[def.id]?.trim() || def.name;
  };

  const packageDescriptions = useMemo(
    () => ({
      washFoldPkg25: onboardingStrings.washFoldPkg25Desc,
      washFoldPkg50: onboardingStrings.washFoldPkg50Desc,
      washFoldPkg75: onboardingStrings.washFoldPkg75Desc,
      washFoldPkg100: onboardingStrings.washFoldPkg100Desc,
    }),
    [onboardingStrings],
  );

  const togglePackage = (id: string) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) > 0 ? 0 : 1,
    }));
  };

  const renderGarmentRow = (def: (typeof pricedDefs)[number]) => {
    const qty = quantities[def.id] ?? 0;
    const { amount: unit, priceLabel } = washFoldUnitForItem(services, def);
    const lineTotal =
      unit != null && qty > 0 ? Math.round(unit * qty * 100) / 100 : null;

    return (
      <View key={def.id} style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <Text style={styles.itemName}>{displayName(def)}</Text>
          <Text style={styles.unitPrice}>
            {unit != null
              ? `${formatMoney(currencyPrefix || "", unit)} ${s.each} · ${priceLabel}`
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
            onPress={() => setQty(def.id, -1)}
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
          <Pressable onPress={() => setQty(def.id, 1)} style={styles.stepperBtn}>
            <MaterialCommunityIcons name="plus" size={20} color={c.white} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderPackageBox = (def: (typeof pricedDefs)[number]) => {
    const selected = (quantities[def.id] ?? 0) > 0;
    const { amount: unit, priceLabel } = washFoldUnitForItem(services, def);
    const label = displayName(def);
    const description = getWashFoldPackageDescription(
      { id: def.id, label: def.name },
      packageDescriptions as Record<WashFoldPackageCatalogKey, string>,
      onboardingStrings.washFoldPackageBoxCustomDesc,
    );
    const priceDisplay =
      unit != null ? formatMoney(currencyPrefix || "", unit) : priceLabel;

    return (
      <WashFoldPackageBox
        key={def.id}
        mode="customer"
        title={label}
        description={description}
        priceDisplay={priceDisplay}
        selected={selected}
        onPress={() => togglePackage(def.id)}
        accessibilityLabel={`${label}, ${priceDisplay}`}
      />
    );
  };

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

      <CustomerItemizedOrderLayout
        scrollContentStyle={styles.scrollContent}
        footer={
          <>
            {hasSelectedItems ? (
              <CustomerLiveEstimateFooter
                strings={sLive}
                partnerName={draft.partnerName}
                loading={loading}
                hasPartner={Boolean(draft.partnerId)}
                estimate={estimate}
              />
            ) : null}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.continueBtn, pressed && styles.pressed]}
            >
              <Text style={styles.continueLabel}>{sDet.save}</Text>
            </Pressable>
          </>
        }
      >
          <Text style={styles.lead}>{s.lead}</Text>
          <Text style={styles.disclaimer}>{s.estimateDisclaimer}</Text>

          {!draft.partnerId ? (
            <Text style={styles.emptyText}>{s.noPartner}</Text>
          ) : loading ? (
            <Text style={styles.emptyText}>{sLive.loading}</Text>
          ) : error ? (
            <Text style={styles.emptyText}>{s.loadError}</Text>
          ) : !hasAnyRates ? (
            <>
              <Text style={styles.emptyText}>{s.noRates}</Text>
              <Text style={styles.hintText}>{s.saveHint}</Text>
            </>
          ) : null}

          {hasAnyRates ? (
            <>
              {showWashFoldTabs ? (
                <View style={styles.tabRow}>
                  <Pressable
                    onPress={() => setWashFoldTab("items")}
                    style={({ pressed }) => [
                      styles.tabBtn,
                      effectiveWashFoldTab === "items" && styles.tabBtnActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: effectiveWashFoldTab === "items" }}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        effectiveWashFoldTab === "items" && styles.tabLabelActive,
                      ]}
                    >
                      {onboardingStrings.washFoldTabItems}
                    </Text>
                    {selectedGarmentCount > 0 ? (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{selectedGarmentCount}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={() => setWashFoldTab("packages")}
                    style={({ pressed }) => [
                      styles.tabBtn,
                      effectiveWashFoldTab === "packages" && styles.tabBtnActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: effectiveWashFoldTab === "packages" }}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        effectiveWashFoldTab === "packages" && styles.tabLabelActive,
                      ]}
                    >
                      {onboardingStrings.washFoldTabPackages}
                    </Text>
                    {selectedPackageCount > 0 ? (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{selectedPackageCount}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              ) : null}

              {effectiveWashFoldTab === "items" ? (
                <>
                  <Text style={styles.tabLead}>
                    {onboardingStrings.washFoldPricingLead}
                  </Text>
                  {availableGarments.length > 0 ? (
                    availableGarments.map(renderGarmentRow)
                  ) : (
                    <Text style={styles.emptyText}>{s.noGarmentRates}</Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.tabLead}>
                    {onboardingStrings.washFoldPackagesTabLead}
                  </Text>
                  <Text style={styles.sectionHint}>{s.packagesHint}</Text>
                  {availablePackages.length > 0 ? (
                    <WashFoldPackageGrid>
                      {availablePackages.map(renderPackageBox)}
                    </WashFoldPackageGrid>
                  ) : (
                    <Text style={styles.emptyText}>{s.noPackageRates}</Text>
                  )}
                </>
              )}
            </>
          ) : null}

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            {sDet.instructions}
          </Text>
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
    marginBottom: 10,
  },
  disclaimer: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 20,
    marginBottom: 20,
    fontStyle: "italic",
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
  },
  sectionLabelSpaced: { marginTop: 8 },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  tabBtnActive: {
    backgroundColor: c.white,
    borderColor: c.white,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  tabLabelActive: {
    color: c.themeBlack,
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: c.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.white,
  },
  tabLead: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20,
    marginBottom: 14,
  },
  sectionHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 12,
    lineHeight: 18,
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
  hintText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    lineHeight: 19,
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
