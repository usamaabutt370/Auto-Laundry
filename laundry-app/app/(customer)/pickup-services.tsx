import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { strings } from "@/constants/strings";
import type { LaundererServiceType } from "@/constants/launderers";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import {
  fetchPartnerDetail,
  partnerOffersPickupDelivery,
  serviceCategoriesToTypes,
} from "@/lib/partner-discovery";
import {
  dryCleanUnitForItem,
  listPricedDryCleanDefs,
  listPricedPressDefs,
  listPricedTailoringDefs,
  listPricedWashFoldDefs,
  pressUnitForItem,
  tailoringUnitForItem,
  washFoldUnitForItem,
} from "@/lib/customer-order-estimate";
import { formatMoney } from "@/utils/format-money";
import { parsePriceDisplay } from "@/utils/parse-price-display";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  backBg: "#EEF2F6",
  iconWell: "#F3F4F6",
  openBg: "#ECFDF5",
  openText: "#047857",
  chipBorder: "#E5E7EB",
  shadow: "rgba(17, 24, 39, 0.08)",
};

type ServiceId = "washAndFold" | "dryCleaning" | "tailoring" | "press";

const SERVICE_KEYS: LaundererServiceType[] = [
  "press",
  "washAndFold",
  "dryCleaning",
  "tailoring",
];

function sortServicesByDisplayOrder(services: ServiceId[]): ServiceId[] {
  return [...services].sort(
    (a, b) => SERVICE_KEYS.indexOf(a) - SERVICE_KEYS.indexOf(b),
  );
}

export default function PickupServicesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; service?: string }>();
  const prefersPickupDelivery = params.mode === "pickupDelivery";
  const insets = useSafeAreaInsets();
  const { draft, editingOrderId, setPickupDeliveryRequested, setSelectedServiceIds } =
    useCustomerOrderDraft();
  const isEditing = Boolean(editingOrderId);
  const partnerVerified = usePartnerVerified(draft.partnerId);
  const s = strings.customer.pickupServices;
  const selectedIds = draft.selectedServiceIds;
  const [loading, setLoading] = useState(true);
  const [partnerServiceTypes, setPartnerServiceTypes] = useState<ServiceId[]>([]);
  const [partnerServiceRows, setPartnerServiceRows] = useState<
    Awaited<ReturnType<typeof fetchPartnerDetail>>["services"]
  >([]);
  const [pickupDeliveryEnabled, setPickupDeliveryEnabled] = useState(false);
  const [pickupFeeLabel, setPickupFeeLabel] = useState<string | null>(null);
  const showPickupToggle = pickupDeliveryEnabled && !prefersPickupDelivery;

  useEffect(() => {
    let cancelled = false;
    const loadPartnerServices = async () => {
      if (!draft.partnerId) {
        setPartnerServiceTypes([]);
        setPartnerServiceRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { profile, services } = await fetchPartnerDetail(draft.partnerId);
      if (cancelled) return;
      setPartnerServiceRows(services);
      const pricedRows = services.filter((row) => parsePriceDisplay(row.price_display) != null);
      const available = serviceCategoriesToTypes(
        pricedRows.map((row) => row.category),
        pricedRows.map((row) => row.price_display),
      )
        .filter((id): id is ServiceId => SERVICE_KEYS.includes(id))
        .filter((id, idx, arr) => arr.indexOf(id) === idx);
      setPartnerServiceTypes(sortServicesByDisplayOrder(available));
      const pickupEnabled = partnerOffersPickupDelivery(profile);
      setPickupDeliveryEnabled(pickupEnabled);
      setPickupFeeLabel(profile?.pickup_delivery_amount?.trim() || null);
      if (!pickupEnabled) {
        setPickupDeliveryRequested(false);
      } else if (prefersPickupDelivery) {
        setPickupDeliveryRequested(true);
      }
      setLoading(false);
    };
    loadPartnerServices();
    return () => {
      cancelled = true;
    };
  }, [draft.partnerId, prefersPickupDelivery, setPickupDeliveryRequested]);

  const servicesToShow = useMemo(() => {
    if (partnerServiceTypes.length > 0) return partnerServiceTypes;
    if (draft.partnerId || isEditing) return [];
    return ["washAndFold", "dryCleaning"] as ServiceId[];
  }, [draft.partnerId, isEditing, partnerServiceTypes]);

  const selectedItemsByService = useMemo(() => {
    const currencyPrefix = "Rs ";

    const formatLinePrice = (unitAmount: number | null, qty: number, fallbackLabel: string) => {
      if (unitAmount == null) return fallbackLabel;
      const total = Math.round(unitAmount * qty * 100) / 100;
      const unit = formatMoney(currencyPrefix, unitAmount);
      const line = formatMoney(currencyPrefix, total);
      return `${qty} x ${unit} = ${line}`;
    };

    const byService: Record<ServiceId, { name: string; qtyLabel: string; priceLabel: string }[]> = {
      washAndFold: [],
      dryCleaning: [],
      tailoring: [],
      press: [],
    };

    byService.washAndFold = listPricedWashFoldDefs(partnerServiceRows).map((def) => ({
      def,
      qty: Math.max(0, draft.washFold?.itemizedQuantities?.[def.id] ?? 0),
    }))
      .filter((item) => item.qty > 0)
      .map((item) => {
        const unit = washFoldUnitForItem(partnerServiceRows, item.def);
        return {
          name: item.def.name,
          qtyLabel:
            item.def.kind === "package" ? `${item.qty} pkg` : `${item.qty} item(s)`,
          priceLabel: formatLinePrice(unit.amount, item.qty, unit.priceLabel),
        };
      });

    byService.dryCleaning = listPricedDryCleanDefs(partnerServiceRows)
      .map((def) => ({
        def,
        qty: Math.max(0, draft.dryClean?.itemizedQuantities?.[def.id] ?? 0),
      }))
      .filter((item) => item.qty > 0)
      .map((item) => {
        const unit = dryCleanUnitForItem(partnerServiceRows, item.def);
        return {
          name: item.def.name,
          qtyLabel: `${item.qty} item(s)`,
          priceLabel: formatLinePrice(unit.amount, item.qty, unit.priceLabel),
        };
      });

    byService.press = listPricedPressDefs(partnerServiceRows)
      .map((def) => ({
        def,
        qty: Math.max(0, draft.press?.itemizedQuantities?.[def.id] ?? 0),
      }))
      .filter((item) => item.qty > 0)
      .map((item) => {
        const unit = pressUnitForItem(partnerServiceRows, item.def);
        return {
          name: item.def.name,
          qtyLabel:
            item.def.kind === "package" ? `${item.qty} pkg` : `${item.qty} item(s)`,
          priceLabel: formatLinePrice(unit.amount, item.qty, unit.priceLabel),
        };
      });

    byService.tailoring = listPricedTailoringDefs(partnerServiceRows)
      .map((def) => ({
        def,
        qty: Math.max(0, draft.tailoring?.itemizedQuantities?.[def.id] ?? 0),
      }))
      .filter((item) => item.qty > 0)
      .map((item) => {
        const unit = tailoringUnitForItem(partnerServiceRows, item.def);
        return {
          name: item.def.name,
          qtyLabel: `${item.qty} item(s)`,
          priceLabel: formatLinePrice(unit.amount, item.qty, unit.priceLabel),
        };
      });

    return byService;
  }, [
    draft.dryClean?.itemizedQuantities,
    draft.press?.itemizedQuantities,
    draft.tailoring?.itemizedQuantities,
    draft.washFold?.itemizedQuantities,
    partnerServiceRows,
  ]);

  useEffect(() => {
    if (servicesToShow.length === 0) return;
    const allowed = new Set<ServiceId>(servicesToShow);
    const next = selectedIds.filter((id): id is ServiceId => allowed.has(id as ServiceId));
    if (next.length !== selectedIds.length) {
      setSelectedServiceIds(next);
    }
  }, [selectedIds, servicesToShow, setSelectedServiceIds]);

  useEffect(() => {
    if (isEditing || selectedIds.length > 0 || servicesToShow.length === 0) return;
    const requested = params.service;
    if (
      requested === "washAndFold" ||
      requested === "press" ||
      requested === "tailoring" ||
      requested === "dryCleaning"
    ) {
      if (servicesToShow.includes(requested)) {
        setSelectedServiceIds([requested]);
      }
    }
  }, [isEditing, params.service, selectedIds.length, servicesToShow, setSelectedServiceIds]);

  const toggle = (id: ServiceId) => {
    if (!servicesToShow.includes(id)) return;
    if (id === "washAndFold") {
      setSelectedServiceIds(
        selectedIds.includes(id) ? selectedIds : [...selectedIds, id],
      );
      router.push("/(customer)/wash-fold-order");
      return;
    }
    if (id === "press") {
      setSelectedServiceIds(
        selectedIds.includes(id) ? selectedIds : [...selectedIds, id],
      );
      router.push("/(customer)/press-order");
      return;
    }
    if (id === "dryCleaning") {
      setSelectedServiceIds(
        selectedIds.includes(id) ? selectedIds : [...selectedIds, id],
      );
      router.push("/(customer)/dry-clean-itemized-by-user");
      return;
    }
    if (id === "tailoring") {
      setSelectedServiceIds(
        selectedIds.includes(id) ? selectedIds : [...selectedIds, id],
      );
      router.push("/(customer)/tailoring-itemized-by-user");
      return;
    }
    setSelectedServiceIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const handleConfirm = () => {
    if (!draft.partnerId) {
      showAppAlert(
        "Choose a Laundry Captain",
        "Go back and select a Laundry Captain before scheduling pickup.",
      );
      return;
    }
    if (selectedIds.length === 0) {
      showAppAlert(
        "No services selected",
        "Please select at least one service before continuing.",
      );
      return;
    }
    if (draft.pickupDeliveryRequested) {
      router.replace("/(customer)/schedule-pickup");
      return;
    }
    router.replace("/(customer)/order-summary");
  };

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

      {loading ? (
        <View style={styles.fullScreenLoader}>
          <ActivityIndicator color={UI.teal} size="large" />
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isEditing && draft.partnerId ? (
              <View style={styles.lockedPartnerCard}>
                <Text style={styles.lockedPartnerLabel}>{s.lockedLaundererLabel}</Text>
                {draft.partnerName ? (
                  <PartnerNameWithBadge
                    name={draft.partnerName}
                    verified={partnerVerified}
                    nameStyle={styles.lockedPartnerName}
                  />
                ) : null}
                <Text style={styles.lockedPartnerNote}>{s.lockedLaundererNote}</Text>
              </View>
            ) : null}
            {editingOrderId ? (
              <View style={styles.editingBanner}>
                <MaterialCommunityIcons name="information-outline" size={18} color={UI.teal} />
                <Text style={styles.editingBannerText}>{s.editingBanner}</Text>
              </View>
            ) : null}
            <Text style={styles.chooseHeading}>{s.chooseServices}</Text>
            {servicesToShow.map((id) => {
              const selectedItems = selectedItemsByService[id];
              const isSelected = selectedItems.length > 0;
              return (
                <View
                  key={id}
                  style={[
                    styles.serviceCard,
                    isSelected ? styles.serviceCardSelected : styles.serviceCardUnselected,
                  ]}
                >
                  <Pressable
                    onPress={() => toggle(id)}
                    style={({ pressed }) => [
                      styles.serviceCardHeader,
                      isSelected && styles.serviceCardHeaderActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected ? (
                        <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text style={styles.serviceLabel}>{s[id]}</Text>
                  </Pressable>
                  {isSelected && selectedItems.length > 0 ? (
                    <View style={styles.selectedItemsContainer}>
                      {selectedItems.map((item, idx) => (
                        <View
                          key={`${id}-${item.name}-${idx}`}
                          style={[
                            styles.selectedItemRow,
                            idx === selectedItems.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <Text style={styles.selectedItemName}>{item.name}</Text>
                          <View style={styles.selectedItemRight}>
                            <Text style={styles.selectedItemQty}>{item.qtyLabel}</Text>
                            <Text style={styles.selectedItemPrice}>{item.priceLabel}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
            {draft.partnerId && servicesToShow.length === 0 ? (
              <Text style={styles.emptyText}>No services configured by this launderer yet.</Text>
            ) : null}

            {showPickupToggle ? (
              <View style={styles.pickupRow}>
                <View style={styles.pickupTextWrap}>
                  <Text style={styles.pickupTitle}>{s.includePickupDelivery}</Text>
                  <Text style={styles.pickupSub}>
                    {pickupFeeLabel
                      ? s.pickupDeliveryFee.replace("{amount}", pickupFeeLabel)
                      : s.pickupDeliveryFeeUnknown}
                  </Text>
                </View>
                <Switch
                  value={draft.pickupDeliveryRequested}
                  onValueChange={setPickupDeliveryRequested}
                  trackColor={{ false: "#D1D5DB", true: UI.teal }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [styles.confirmWrap, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={s.confirm}
            >
              <LinearGradient
                colors={["#4A3AFF", "#12B886"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmLabel}>{s.confirm}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  headerSafe: {
    backgroundColor: UI.bg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.backBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  headerSide: {
    width: 36,
  },
  pressed: {
    opacity: 0.85,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  chooseHeading: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 14,
  },
  serviceCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  serviceCardSelected: {
    borderColor: UI.teal,
  },
  serviceCardUnselected: {
    borderColor: UI.chipBorder,
  },
  serviceCardHeader: {
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  serviceCardHeaderActive: {
    backgroundColor: UI.openBg,
  },
  selectedItemsContainer: {
    backgroundColor: UI.iconWell,
    paddingVertical: 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    backgroundColor: UI.teal,
    borderColor: UI.teal,
  },
  serviceLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginTop: 4,
  },
  selectedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.chipBorder,
  },
  selectedItemName: {
    flex: 1,
    color: UI.text,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  selectedItemQty: {
    color: UI.text,
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    textAlign: "right",
  },
  selectedItemRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  selectedItemPrice: {
    color: UI.teal,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    textAlign: "right",
  },
  pickupRow: {
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pickupTextWrap: {
    flex: 1,
    gap: 4,
  },
  pickupTitle: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  pickupSub: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: UI.bg,
  },
  confirmWrap: {
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
  fullScreenLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedPartnerCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
  },
  lockedPartnerLabel: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  lockedPartnerName: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 6,
  },
  lockedPartnerNote: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 18,
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: UI.openBg,
  },
  editingBannerText: {
    flex: 1,
    color: UI.openText,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    lineHeight: 18,
  },
});
