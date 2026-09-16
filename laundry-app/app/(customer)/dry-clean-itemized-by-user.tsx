import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
  CustomerItemizedOrderLayout,
} from "@/components/customer-itemized-order-layout";
import { CustomerLiveEstimateFooter } from "@/components/customer-live-estimate-footer";
import {
  DRY_CLEAN_SUIT_2_PIECE_ID,
  DRY_CLEAN_SUIT_3_PIECE_ID,
  initialDryCleanQuantities,
  isDryCleanSuitPackageId,
  type DryCleanItemDef,
} from "@/constants/dry-clean-items";
import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import {
  dryCleanUnitForItem,
  listPricedDryCleanDefs,
  listPricedDryCleanSuitDefs,
  partnerHasDryCleaningRates,
} from "@/lib/customer-order-estimate";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { getStrings } from "@/locales";
import { formatMoney } from "@/utils/format-money";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  backBg: "#EEF2F6",
  openBg: "#ECFDF5",
  chipBorder: "#E5E7EB",
  shadow: "rgba(17, 24, 39, 0.08)",
};

type SuitPiece = typeof DRY_CLEAN_SUIT_2_PIECE_ID | typeof DRY_CLEAN_SUIT_3_PIECE_ID;

function packageIncludesForSuit(
  piece: SuitPiece,
  s: ReturnType<typeof getStrings>["customer"]["dryCleanItemize"],
): string {
  return piece === DRY_CLEAN_SUIT_2_PIECE_ID
    ? s.suit2PieceIncludes
    : s.suit3PieceIncludes;
}

export default function DryCleanItemizedByUserScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const strings = getStrings(locale);
  const {
    draft,
    setDryCleanItemizedQuantities,
    setDryCleanItemizedInstructions,
  } = useCustomerOrderDraft();
  const s = strings.customer.dryCleanItemize;
  const sDet = strings.customer.laundryBagDetail;
  const sLive = strings.customer.liveEstimate;

  const [quantities, setQuantities] = useState<Record<string, number>>(() => ({
    ...initialDryCleanQuantities(),
    ...(draft.dryClean?.itemizedQuantities ?? {}),
  }));
  const [instructions, setInstructions] = useState(
    () => draft.dryClean?.itemizedInstructions ?? "",
  );

  const initialSuitPiece: SuitPiece = (() => {
    const q2 = draft.dryClean?.itemizedQuantities?.[DRY_CLEAN_SUIT_2_PIECE_ID] ?? 0;
    const q3 = draft.dryClean?.itemizedQuantities?.[DRY_CLEAN_SUIT_3_PIECE_ID] ?? 0;
    return q3 > q2 ? DRY_CLEAN_SUIT_3_PIECE_ID : DRY_CLEAN_SUIT_2_PIECE_ID;
  })();
  const [suitPiece, setSuitPiece] = useState<SuitPiece>(initialSuitPiece);

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
      press: null,
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

  const selectSuitPiece = (piece: SuitPiece) => {
    if (piece === suitPiece) return;
    const currentQty = quantities[suitPiece] ?? 0;
    setSuitPiece(piece);
    setQuantities((prev) => ({
      ...prev,
      [DRY_CLEAN_SUIT_2_PIECE_ID]: 0,
      [DRY_CLEAN_SUIT_3_PIECE_ID]: 0,
      [piece]: currentQty,
    }));
  };

  const handleSave = () => {
    router.back();
  };

  const currencyPrefix = estimate.currencyPrefix;
  const availableItems = useMemo(
    () => listPricedDryCleanDefs(services),
    [services],
  );

  const pricedSuitDefs = useMemo(
    () => listPricedDryCleanSuitDefs(services),
    [services],
  );

  const showSuitCard = useMemo(
    () => partnerHasDryCleaningRates(services) || pricedSuitDefs.length > 0,
    [services, pricedSuitDefs.length],
  );

  const suitOptions = useMemo(() => {
    const map = new Map<string, DryCleanItemDef>();
    for (const item of pricedSuitDefs) {
      map.set(item.id, item);
    }
    return map;
  }, [pricedSuitDefs]);

  const hasSuitRates = pricedSuitDefs.length > 0;

  const activeSuitId: SuitPiece | null = useMemo(() => {
    if (!hasSuitRates) return null;
    if (suitOptions.has(suitPiece)) return suitPiece;
    if (suitOptions.has(DRY_CLEAN_SUIT_2_PIECE_ID)) return DRY_CLEAN_SUIT_2_PIECE_ID;
    if (suitOptions.has(DRY_CLEAN_SUIT_3_PIECE_ID)) return DRY_CLEAN_SUIT_3_PIECE_ID;
    return null;
  }, [hasSuitRates, suitOptions, suitPiece]);

  useEffect(() => {
    if (activeSuitId && activeSuitId !== suitPiece) {
      setSuitPiece(activeSuitId);
    }
  }, [activeSuitId, suitPiece]);

  const garmentItems = useMemo(
    () => availableItems.filter((item) => !isDryCleanSuitPackageId(item.id)),
    [availableItems],
  );

  const hasSelectedItems = useMemo(() => {
    return Object.values(quantities).some((q) => q > 0);
  }, [quantities]);

  const renderGarmentRow = (item: DryCleanItemDef) => {
    const qty = quantities[item.id] ?? 0;
    const { amount: unit, priceLabel } = dryCleanUnitForItem(services, item);
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
              color={qty <= 0 ? "#D1D5DB" : UI.text}
            />
          </Pressable>
          <Text style={styles.stepperValue}>{qty}</Text>
          <Pressable
            onPress={() => setQty(item.id, 1)}
            style={styles.stepperBtn}
          >
            <MaterialCommunityIcons name="plus" size={20} color={UI.teal} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSuitCard = () => {
    if (!showSuitCard) return null;

    if (!hasSuitRates || !activeSuitId) {
      return (
        <View style={styles.suitCard}>
          <Text style={styles.itemName}>{s.suitCardTitle}</Text>
          <Text style={styles.suitHint}>{s.suitRatesNotSet}</Text>
        </View>
      );
    }

    const qty = quantities[activeSuitId] ?? 0;
    const def = suitOptions.get(activeSuitId);
    if (!def) return null;
    const { amount: unit, priceLabel } = dryCleanUnitForItem(services, def);
    const lineTotal =
      unit != null && qty > 0 ? Math.round(unit * qty * 100) / 100 : null;
    const can2 = suitOptions.has(DRY_CLEAN_SUIT_2_PIECE_ID);
    const can3 = suitOptions.has(DRY_CLEAN_SUIT_3_PIECE_ID);

    return (
      <View style={styles.suitCard}>
        <Text style={styles.itemName}>{s.suitCardTitle}</Text>

        <View style={styles.pieceRow}>
          {can2 ? (
            <Pressable
              onPress={() => selectSuitPiece(DRY_CLEAN_SUIT_2_PIECE_ID)}
              style={[
                styles.pieceChip,
                activeSuitId === DRY_CLEAN_SUIT_2_PIECE_ID && styles.pieceChipActive,
              ]}
            >
              <Text
                style={[
                  styles.pieceChipLabel,
                  activeSuitId === DRY_CLEAN_SUIT_2_PIECE_ID &&
                    styles.pieceChipLabelActive,
                ]}
              >
                {s.piece2}
              </Text>
            </Pressable>
          ) : null}
          {can3 ? (
            <Pressable
              onPress={() => selectSuitPiece(DRY_CLEAN_SUIT_3_PIECE_ID)}
              style={[
                styles.pieceChip,
                activeSuitId === DRY_CLEAN_SUIT_3_PIECE_ID && styles.pieceChipActive,
              ]}
            >
              <Text
                style={[
                  styles.pieceChipLabel,
                  activeSuitId === DRY_CLEAN_SUIT_3_PIECE_ID &&
                    styles.pieceChipLabelActive,
                ]}
              >
                {s.piece3}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.suitBodyRow}>
          <View style={styles.itemLeft}>
            <Text style={styles.unitPrice}>
              {unit != null
                ? `${formatMoney(currencyPrefix || "", unit)} each · ${priceLabel}`
                : `Rate: ${priceLabel}`}
            </Text>
            {qty > 0 ? (
              <View style={styles.packageBox}>
                <Text style={styles.packageHeading}>
                  {s.packageIncludesHeading}
                </Text>
                <Text style={styles.packageBody}>
                  {packageIncludesForSuit(activeSuitId, s)}
                </Text>
              </View>
            ) : null}
            {qty > 0 && lineTotal != null ? (
              <Text style={styles.lineSubtotal}>
                Subtotal: {formatMoney(currencyPrefix || "", lineTotal)}
              </Text>
            ) : null}
          </View>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setQty(activeSuitId, -1)}
              style={styles.stepperBtn}
              disabled={qty <= 0}
            >
              <MaterialCommunityIcons
                name="minus"
                size={20}
                color={qty <= 0 ? "#D1D5DB" : UI.text}
              />
            </Pressable>
            <Text style={styles.stepperValue}>{qty}</Text>
            <Pressable
              onPress={() => setQty(activeSuitId, 1)}
              style={styles.stepperBtn}
            >
              <MaterialCommunityIcons name="plus" size={20} color={UI.teal} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

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
            {s.title}
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
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [styles.confirmWrap, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={sDet.save}
            >
              <LinearGradient
                colors={["#4A3AFF", "#12B886"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmLabel}>{sDet.save}</Text>
              </LinearGradient>
            </Pressable>
          </>
        }
      >
        <Text style={styles.lead}>
          Set quantities for each type. Line totals use your launderer’s prices
          when available.
        </Text>

        {renderSuitCard()}
        {garmentItems.map(renderGarmentRow)}
        {availableItems.length === 0 ? (
          <Text style={styles.emptyText}>
            No dry-cleaning item prices have been configured by this Laundry
            Captain.
          </Text>
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
  pressed: { opacity: 0.85 },
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
  suitCard: {
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
  suitHint: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 18,
  },
  pieceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  pieceChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
  },
  pieceChipActive: {
    borderColor: UI.teal,
    backgroundColor: UI.openBg,
  },
  pieceChipLabel: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
  },
  pieceChipLabelActive: {
    color: UI.teal,
  },
  suitBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  itemLeft: { flex: 1, paddingRight: 12 },
  itemName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  unitPrice: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginTop: 4,
  },
  packageBox: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: UI.backBg,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  packageHeading: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: UI.teal,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  packageBody: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.text,
    lineHeight: 20,
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
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    minWidth: 28,
    textAlign: "center",
  },
  confirmWrap: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
});
