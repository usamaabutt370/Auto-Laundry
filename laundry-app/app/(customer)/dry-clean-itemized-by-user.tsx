import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DRY_CLEAN_ITEM_DEFS,
  initialDryCleanQuantities,
} from "@/constants/dry-clean-items";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { dryCleanUnitForItem } from "@/lib/customer-order-estimate";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { formatMoney } from "@/utils/format-money";

const c = theme.colors;

export default function DryCleanItemizedByUserScreen() {
  const router = useRouter();
  const {
    draft,
    setDryCleanItemizedQuantities,
    setDryCleanItemizedInstructions,
    setSelectedServiceIds,
  } = useCustomerOrderDraft();
  const s = strings.customer.dryCleanItemize;
  const sDet = strings.customer.laundryBagDetail;
  const sLive = strings.customer.liveEstimate;

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    initialDryCleanQuantities(),
  );
  const [instructions, setInstructions] = useState("");

  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Stable callback: hydrate on focus only. Deps on `draft.dryClean` re-run this while focused and loop with the sync effects below.
  useFocusEffect(
    useCallback(() => {
      const dc = draftRef.current.dryClean;
      if (!dc) return;
      setInstructions(dc.itemizedInstructions ?? "");
      setQuantities((prev) => {
        const next = { ...prev };
        for (const def of DRY_CLEAN_ITEM_DEFS) {
          const q = dc.itemizedQuantities[def.id];
          if (q != null) next[def.id] = q;
        }
        return next;
      });
    }, []),
  );

  useEffect(() => {
    if (!draft.selectedServiceIds.includes("dryCleaning")) {
      setSelectedServiceIds([...draft.selectedServiceIds, "dryCleaning"]);
    }
  }, [draft.selectedServiceIds, setSelectedServiceIds]);

  useEffect(() => {
    setDryCleanItemizedQuantities(quantities);
  }, [quantities, setDryCleanItemizedQuantities]);

  useEffect(() => {
    setDryCleanItemizedInstructions(instructions.trim());
  }, [instructions, setDryCleanItemizedInstructions]);

  const dryOnlyDraft: CustomerOrderDraft = useMemo(
    () => ({
      ...draft,
      selectedServiceIds: ["dryCleaning"],
      washFold: null,
      pickup: null,
      delivery: null,
    }),
    [draft],
  );

  const { loading, estimate, services } = usePartnerOrderEstimate(
    draft.partnerId,
    dryOnlyDraft,
  );

  const setQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = (prev[id] ?? 0) + delta;
      return { ...prev, [id]: Math.max(0, next) };
    });
  };

  const handleSave = () => {
    router.push("/(customer)/pickup-services");
  };

  const currencyPrefix = estimate.currencyPrefix;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {s.title}
        </Text>
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
        <Text style={styles.lead}>
          Set quantities for each type. Line totals use your launderer’s prices
          when available.
        </Text>

        {DRY_CLEAN_ITEM_DEFS.map((item) => {
          const qty = quantities[item.id] ?? 0;
          const { amount: unit, priceLabel } = dryCleanUnitForItem(
            services,
            item.name,
          );
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
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        <CustomerLiveEstimateFooter
          strings={sLive}
          partnerName={draft.partnerName}
          loading={loading}
          hasPartner={Boolean(draft.partnerId)}
          estimate={estimate}
        />
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.continueBtn, pressed && styles.pressed]}
        >
          <Text style={styles.continueLabel}>{sDet.save}</Text>
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
  pressed: { opacity: 0.8 },
  lead: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 20,
  },
  scroll: { flex: 1 },
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
  footer: {
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
    borderRadius: 12,
    alignItems: "center",
  },
  continueLabel: { fontSize: 17, fontWeight: "700", color: c.white },
});
