import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import {
  CustomerItemizedOrderLayout,
  customerOrderFooterStyles,
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
import {
  initialPressQuantities,
  WASH_FOLD_PACKAGE_DEFS,
} from "@/constants/wash-fold-items";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import {
  listPricedPressDefs,
  pressUnitForItem,
} from "@/lib/customer-order-estimate";
import { getStrings } from "@/locales";
import { formatMoney } from "@/utils/format-money";

const c = theme.colors;

export default function PressOrderScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.pressOrder;
  const sDet = getStrings(locale).customer.laundryBagDetail;
  const sLive = getStrings(locale).customer.liveEstimate;

  const { draft, setPressItemizedQuantities } = useCustomerOrderDraft();

  const [quantities, setQuantities] = useState<Record<string, number>>(() => ({
    ...initialPressQuantities(),
    ...(draft.press?.itemizedQuantities ?? {}),
  }));
  const [pressTab, setPressTab] = useState<"items" | "packages">("items");

  useEffect(() => {
    setPressItemizedQuantities(quantities);
  }, [quantities, setPressItemizedQuantities]);

  const washOnlyDraft: CustomerOrderDraft = useMemo(
    () => ({
      ...draft,
      selectedServiceIds: ["press"],
      dryClean: null,
      washFold: null,
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

  const pricedDefs = useMemo(() => listPricedPressDefs(services), [services]);

  const availableGarments = useMemo(
    () => pricedDefs.filter((item) => item.kind === "garment"),
    [pricedDefs],
  );

  const availablePackages = useMemo(
    () =>
      pricedDefs.filter(
        (item) =>
          item.kind === "package" &&
          pressUnitForItem(services, item).amount != null,
      ),
    [pricedDefs, services],
  );

  useEffect(() => {
    const availableIds = new Set(availablePackages.map((def) => def.id));
    setQuantities((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const def of WASH_FOLD_PACKAGE_DEFS) {
        if (!availableIds.has(def.id) && (next[def.id] ?? 0) > 0) {
          next[def.id] = 0;
          changed = true;
        }
      }
      for (const def of pricedDefs) {
        if (def.kind !== "package" || availableIds.has(def.id)) continue;
        if ((next[def.id] ?? 0) > 0) {
          next[def.id] = 0;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [availablePackages, pricedDefs]);

  const hasSelectedItems = useMemo(
    () => Object.values(quantities).some((q) => q > 0),
    [quantities],
  );

  const hasAnyRates = availableGarments.length > 0 || availablePackages.length > 0;
  const showItemsTab = availableGarments.length > 0;
  const showPackagesTab = availablePackages.length > 0;
  const showWashFoldTabs = showItemsTab && showPackagesTab;
  const effectiveWashFoldTab: "items" | "packages" = showWashFoldTabs
    ? pressTab
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
      setPressTab("items");
    } else if (showPackagesTab && !showItemsTab) {
      setPressTab("packages");
    }
  }, [draft.partnerId, hasAnyRates, showItemsTab, showPackagesTab]);

  const onboardingStrings = getStrings(locale).partner.onboarding;

  const displayName = (def: { id: string; name: string }) => {
    const onboarding = onboardingStrings as Record<string, string>;
    return onboarding[def.id]?.trim() || def.name;
  };

  const togglePackage = (id: string) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) > 0 ? 0 : 1,
    }));
  };

  const renderGarmentRow = (def: (typeof pricedDefs)[number]) => {
    const qty = quantities[def.id] ?? 0;
    const { amount: unit } = pressUnitForItem(services, def);
    const lineTotal =
      unit != null && qty > 0 ? Math.round(unit * qty * 100) / 100 : null;

    return (
      <View key={def.id} style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <Text style={styles.itemName}>{displayName(def)}</Text>
          {unit != null ? (
            <Text style={styles.unitPrice}>
              {formatMoney(currencyPrefix || "", unit)}
            </Text>
          ) : null}
          {qty > 0 && lineTotal != null ? (
            <Text style={styles.lineSubtotal}>
              {formatMoney(currencyPrefix || "", lineTotal)}
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
    const { amount: unit, priceLabel } = pressUnitForItem(services, def);
    const label = displayName(def);
    const priceDisplay =
      unit != null ? formatMoney(currencyPrefix || "", unit) : priceLabel;

    return (
      <WashFoldPackageBox
        key={def.id}
        mode="customer"
        title={label}
        description=""
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
                partnerId={draft.partnerId}
                partnerName={draft.partnerName}
                loading={loading}
                hasPartner={Boolean(draft.partnerId)}
                estimate={estimate}
              />
            ) : null}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                customerOrderFooterStyles.actionBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={customerOrderFooterStyles.actionLabel}>{sDet.save}</Text>
            </Pressable>
          </>
        }
      >
          {!draft.partnerId ? (
            <Text style={styles.emptyText}>{s.noPartner}</Text>
          ) : loading ? (
            <Text style={styles.emptyText}>{sLive.loading}</Text>
          ) : error ? (
            <Text style={styles.emptyText}>{s.loadError}</Text>
          ) : !hasAnyRates ? (
            <Text style={styles.emptyText}>{s.noRates}</Text>
          ) : null}

          {hasAnyRates ? (
            <View style={styles.listSection}>
              {showWashFoldTabs ? (
                <View style={styles.tabRow}>
                  <Pressable
                    onPress={() => setPressTab("items")}
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
                    onPress={() => setPressTab("packages")}
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
                availableGarments.length > 0 ? (
                  availableGarments.map(renderGarmentRow)
                ) : (
                  <Text style={styles.emptyText}>{s.noGarmentRates}</Text>
                )
              ) : availablePackages.length > 0 ? (
                <WashFoldPackageGrid>
                  {availablePackages.map(renderPackageBox)}
                </WashFoldPackageGrid>
              ) : (
                <Text style={styles.emptyText}>{s.noPackageRates}</Text>
              )}
            </View>
          ) : null}
      </CustomerItemizedOrderLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  pressed: { opacity: 0.8 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  listSection: {
    gap: 0,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
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
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.blue900,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  itemLeft: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 16, fontWeight: "700", color: c.white },
  unitPrice: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  lineSubtotal: {
    fontSize: 14,
    fontWeight: "700",
    color: c.lightBlue,
    marginTop: 4,
  },
  emptyText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
    paddingVertical: 24,
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
});
