import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { CustomerLiveEstimateFooter } from "@/components/customer-live-estimate-footer";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { washFoldUnitForMode } from "@/lib/customer-order-estimate";
import { formatMoney } from "@/utils/format-money";

const c = theme.colors;

const MIN_BAGS_PRIMARY = 0;
const MAX_BAGS = 99;
const MIN_ITEMS = 0;
const MAX_ITEMS = 999;

const WASH_FOLD_ESTIMATE_LINE_KEYS = new Set([
  "wash_fold_bag",
  "wash_fold_bag_no_rate",
  "wash_fold_item",
  "wash_fold_item_no_rate",
  "wash_fold_missing",
  "wash_fold_missing_bag",
  "wash_fold_missing_item",
]);

const WASH_PREVIEW_BAG_KEYS = new Set([
  "wash_fold_bag",
  "wash_fold_bag_no_rate",
  "wash_fold_missing_bag",
]);

const WASH_PREVIEW_ITEM_KEYS = new Set([
  "wash_fold_item",
  "wash_fold_item_no_rate",
  "wash_fold_missing_item",
]);

export default function WashFoldOrderScreen() {
  const router = useRouter();
  const {
    draft,
    setWashFoldBagCount,
    setWashFoldPricingMode,
    setWashFoldBagDetail,
  } = useCustomerOrderDraft();

  const sBags = strings.customer.bags;
  const sDet = strings.customer.laundryBagDetail;
  const sOrder = strings.customer.washFoldOrder;
  const sLive = strings.customer.liveEstimate;

  const [bagCount, setBagCount] = useState(() => draft.washFold?.bagCount ?? 1);
  const [itemCount, setItemCount] = useState(() =>
    Math.max(
      MIN_ITEMS,
      draft.washFold?.bagDetailsByIndex[1]?.itemCount ?? 1,
    ),
  );
  const [instructions, setInstructions] = useState(
    () => draft.washFold?.bagDetailsByIndex[1]?.instructions ?? "",
  );

  const pricingMode = draft.washFold?.pricingMode ?? "per_bag";

  /** Only per-bag mode edits bag count; per-item keeps the last bag count in the draft for when user switches back. */
  useEffect(() => {
    if (pricingMode === "per_bag") {
      setWashFoldBagCount(bagCount);
    }
  }, [pricingMode, bagCount, setWashFoldBagCount]);

  /** Always persist item count so switching per bag ↔ per item does not reset it. Estimate uses it only in per-item mode. */
  useEffect(() => {
    setWashFoldBagDetail(1, {
      weightLabel: "—",
      weightLb: 1,
      itemCount,
      instructions,
    });
  }, [itemCount, instructions, setWashFoldBagDetail]);

  useEffect(() => {
    if (pricingMode === "per_bag") {
      setBagCount((n) => Math.max(MIN_BAGS_PRIMARY, n));
    }
  }, [pricingMode]);

  const washOnlyDraft: CustomerOrderDraft = useMemo(
    () => ({
      ...draft,
      selectedServiceIds: ["washAndFold"],
      dryClean: null,
      pickup: null,
      delivery: null,
    }),
    [draft],
  );

  const { loading, estimate, services } = usePartnerOrderEstimate(
    draft.partnerId,
    washOnlyDraft,
  );
  const perBagUnit = washFoldUnitForMode(services, "per_bag");
  const perItemUnit = washFoldUnitForMode(services, "per_item");
  const perBagLabel =
    perBagUnit.amount != null
      ? formatMoney(estimate.currencyPrefix || "RS : ", perBagUnit.amount)
      : perBagUnit.priceLabel;
  const perItemLabel =
    perItemUnit.amount != null
      ? formatMoney(estimate.currencyPrefix || "RS : ", perItemUnit.amount)
      : perItemUnit.priceLabel;

  /** Under the stepper: only the line for the active toggle (footer still shows full combined breakdown). */
  const washFoldPreviewLines = useMemo(() => {
    if (!draft.partnerId || loading) return [];
    if (pricingMode === "per_bag" && bagCount === 0) return [];
    if (pricingMode === "per_item" && itemCount === 0) return [];
    const wash = estimate.lines.filter((l) =>
      WASH_FOLD_ESTIMATE_LINE_KEYS.has(l.key),
    );
    const modeKeys =
      pricingMode === "per_bag" ? WASH_PREVIEW_BAG_KEYS : WASH_PREVIEW_ITEM_KEYS;
    const matched = wash.filter((l) => modeKeys.has(l.key));
    if (matched.length > 0) return matched;
    return wash.filter((l) => l.key === "wash_fold_missing");
  }, [
    draft.partnerId,
    loading,
    estimate.lines,
    pricingMode,
    bagCount,
    itemCount,
  ]);

  const washCalcLineTexts = useMemo(() => {
    return washFoldPreviewLines.map((line) => {
      if (line.amount != null) {
        return sOrder.calcLine
          .replace("{qty}", line.qtyLabel)
          .replace("{amount}", formatMoney(estimate.currencyPrefix, line.amount));
      }
      return sOrder.calcNoRate.replace("{qty}", line.qtyLabel);
    });
  }, [washFoldPreviewLines, estimate.currencyPrefix, sOrder]);

  const handleContinue = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{sOrder.title}</Text>
        <Pressable style={({ pressed }) => [styles.headerRight, pressed && styles.pressed]}>
          <Image source={assets.icons.menu_icon} style={styles.headerRightIcon} />
        </Pressable>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>{sOrder.lead}</Text>

        <Text style={styles.sectionLabel}>{sOrder.howPriced}</Text>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setWashFoldPricingMode("per_bag")}
            style={({ pressed }) => [
              styles.toggleBtn,
              pricingMode === "per_bag" ? styles.toggleBtnActive : styles.toggleBtnIdle,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: pricingMode === "per_bag" }}
          >
            <MaterialCommunityIcons
              name="package-variant"
              size={30}
              color={pricingMode === "per_bag" ? c.themeBlack : "rgba(255,255,255,0.85)"}
              style={styles.toggleIcon}
            />
            <View >
              <Text
                style={[
                  styles.toggleLabel,
                  pricingMode === "per_bag" ? styles.toggleLabelOnLight : styles.toggleLabelIdle,
                ]}
              >
                {sOrder.perBag}
              </Text>
              <Text
                style={[
                  styles.toggleRate,
                  pricingMode === "per_bag"
                    ? styles.toggleRateOnLight
                    : styles.toggleRateIdle,
                ]}
              >
                {perBagLabel}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setWashFoldPricingMode("per_item")}
            style={({ pressed }) => [
              styles.toggleBtn,
              pricingMode === "per_item" ? styles.toggleBtnActive : styles.toggleBtnIdle,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: pricingMode === "per_item" }}
          >
            <MaterialCommunityIcons
              name="tshirt-crew-outline"
              size={30}
              color={pricingMode === "per_item" ? c.themeBlack : "rgba(255,255,255,0.85)"}
              style={styles.toggleIcon}
            />
            <View>
              <Text
                style={[
                  styles.toggleLabel,
                  pricingMode === "per_item" ? styles.toggleLabelOnLight : styles.toggleLabelIdle,
                ]}
              >
                {sOrder.perItem}
              </Text>
              <Text
                style={[
                  styles.toggleRate,
                  pricingMode === "per_item"
                    ? styles.toggleRateOnLight
                    : styles.toggleRateIdle,
                ]}
              >
                {perItemLabel}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.chargedTitle}>{sOrder.chargedTitle}</Text>

        {pricingMode === "per_bag" ? (
          <View style={[styles.inputRow, styles.inputRowDriver]}>
            <MaterialCommunityIcons
              name="package-variant"
              size={22}
              color={c.white}
              style={styles.inputIcon}
            />
            <Text style={styles.inputLabel}>{sBags.heading}</Text>
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() =>
                  setBagCount((n) => Math.max(n - 1, MIN_BAGS_PRIMARY))
                }
                disabled={bagCount <= MIN_BAGS_PRIMARY}
                style={styles.roundStep}
              >
                <MaterialCommunityIcons name="minus" size={22} color={c.white} />
              </Pressable>
              <Text style={styles.stepperValueWide}>{bagCount}</Text>
              <Pressable
                onPress={() => setBagCount((n) => Math.min(n + 1, MAX_BAGS))}
                disabled={bagCount >= MAX_BAGS}
                style={styles.roundStep}
              >
                <MaterialCommunityIcons name="plus" size={22} color={c.white} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.inputRow, styles.inputRowDriver]}>
            <MaterialCommunityIcons
              name="tshirt-crew-outline"
              size={22}
              color={c.white}
              style={styles.inputIcon}
            />
            <Text style={styles.inputLabel}>{sDet.numberOfItems}</Text>
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => setItemCount((n) => Math.max(n - 1, MIN_ITEMS))}
                disabled={itemCount <= MIN_ITEMS}
                style={styles.roundStep}
              >
                <MaterialCommunityIcons name="minus" size={22} color={c.white} />
              </Pressable>
              <Text style={styles.stepperValueWide}>{itemCount}</Text>
              <Pressable
                onPress={() => setItemCount((n) => Math.min(n + 1, MAX_ITEMS))}
                disabled={itemCount >= MAX_ITEMS}
                style={styles.roundStep}
              >
                <MaterialCommunityIcons name="plus" size={22} color={c.white} />
              </Pressable>
            </View>
          </View>
        )}

        {/* {washFoldPreviewLines.length > 0 ? (
          <View style={styles.calcPreviewBlock}>
            {washFoldPreviewLines.map((line, i) => (
              <Text key={`${line.key}-${i}`} style={styles.calcPreview}>
                {washCalcLineTexts[i] ?? ""}
              </Text>
            ))}
          </View>
        ) : null} */}

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

        <Text style={styles.hint}>{sBags.hint}</Text>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.footerSafe}>
        <CustomerLiveEstimateFooter
          strings={sLive}
          partnerName={draft.partnerName}
          loading={loading}
          hasPartner={Boolean(draft.partnerId)}
          estimate={estimate}
          defaultBreakdownOpen
        />
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [styles.continueBtn, pressed && styles.pressed]}
        >
          <Text style={styles.continueLabel}>{sBags.continue}</Text>
        </Pressable>
      </SafeAreaView>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
  },
  headerRight: { padding: 8 },
  headerRightIcon: { width: 20, height: 20, tintColor: c.white },
  pressed: { opacity: 0.85 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  lead: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  chargedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: c.white,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 16,
  },
  calcPreviewBlock: {
    marginTop: 10,
    marginBottom: 18,
    gap: 6,
    backgroundColor:'transparent'
  },
  calcPreview: {
    fontSize: 14,
    fontWeight: "700",
    color: c.lightBlue,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
  },
  toggleBtnActive: {
    backgroundColor: c.white,
    borderColor: c.white,
  },
  toggleBtnIdle: {
    backgroundColor: "rgba(0,0,0,0.12)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  toggleIcon: { marginRight: 0 },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  toggleRate: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleLabelOnLight: {
    color: c.themeBlack,
  },
  toggleLabelIdle: {
    color: "rgba(255,255,255,0.95)",
  },
  toggleRateOnLight: {
    color: "rgba(0,0,0,0.9)",
  },
  toggleRateIdle: {
    color: "rgba(255,255,255,0.9)",
  },
  inputRowDriver: {
    borderWidth: 2,
    borderColor: c.outline,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.blue900,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  inputIcon: { marginRight: 10 },
  inputLabel: { flex: 1, fontSize: 15, color: c.white, fontWeight: "500" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperValueWide: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    minWidth: 40,
    textAlign: "center",
  },
  roundStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  instructions: {
    backgroundColor: c.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: c.themeBlack,
    minHeight: 88,
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 19,
    marginTop: 8,
  },
  footerSafe: {
    backgroundColor: c.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  continueBtn: {
    marginHorizontal: 24,
    marginBottom: 8,
    marginTop: 4,
    backgroundColor: c.backgroundLight,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  continueLabel: { fontSize: 17, fontWeight: "700", color: c.white },
});
