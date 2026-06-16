import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { Spacer } from "@/components";
import { AppHeader } from "@/components/app-header";
import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import type { LaundererServiceType } from "@/constants/launderers";
import { theme } from "@/constants/theme";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import {
  fetchPartnerDetail,
  partnerOffersPickupDelivery,
  serviceCategoriesToTypes,
} from "@/lib/partner-discovery";
import {
  dryCleanUnitForItem,
  listPricedDryCleanDefs,
  listPricedTailoringDefs,
  listPricedWashFoldDefs,
  tailoringUnitForItem,
  washFoldUnitForItem,
} from "@/lib/customer-order-estimate";
import { formatMoney } from "@/utils/format-money";
import { parsePriceDisplay } from "@/utils/parse-price-display";

const c = theme.colors;

type ServiceId = "washAndFold" | "dryCleaning" | "tailoring";

const SERVICE_KEYS: LaundererServiceType[] = [
  "washAndFold",
  "dryCleaning",
  "tailoring",
];

export default function PickupServicesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const prefersPickupDelivery = params.mode === "pickupDelivery";
  const insets = useSafeAreaInsets();
  const { draft, editingOrderId, setPickupDeliveryRequested, setSelectedServiceIds } =
    useCustomerOrderDraft();
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
      setPartnerServiceTypes(available);
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
    return draft.partnerId ? [] : (["washAndFold", "dryCleaning"] as ServiceId[]);
  }, [draft.partnerId, partnerServiceTypes]);

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

  const toggle = (id: ServiceId) => {
    if (!servicesToShow.includes(id)) return;
    if (id === "washAndFold") {
      setSelectedServiceIds(
        selectedIds.includes(id) ? selectedIds : [...selectedIds, id],
      );
      router.push("/(customer)/wash-fold-order");
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
      Alert.alert(
        "Choose a launderer",
        "Go back and select a laundry partner before scheduling pickup.",
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
      <SafeAreaView edges={["top"]}>
        <AppHeader
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel="Go back"
        />
      </SafeAreaView>

      {loading ? (
        <View style={styles.fullScreenLoader}>
          <ActivityIndicator color={c.white} size="large" />
        </View>
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.spacer} />
        {editingOrderId ? (
          <View style={styles.editingBanner}>
            <MaterialCommunityIcons name="information-outline" size={18} color={c.lightBlue} />
            <Text style={styles.editingBannerText}>{s.editingBanner}</Text>
          </View>
        ) : null}
        <View style={styles.servicesBlock}>
          <Text style={styles.chooseHeading}>{s.chooseServices}</Text>
          <Spacer.Column numberOfSpaces={10} />
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
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color={c.backgroundLight}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.serviceLabel,
                      isSelected
                        ? styles.serviceLabelSelected
                        : styles.serviceLabelUnselected,
                    ]}
                  >
                    {s[id]}
                  </Text>
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
                <Text style={styles.emptyText}>
                  No services configured by this launderer yet.
                </Text>
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
                    trackColor={{
                      false: "rgba(255,255,255,0.3)",
                      true: c.blue500,
                    }}
                    thumbColor={c.white}
                  />
                </View>
              ) : null}
        </View>
        <View style={styles.spacer} />
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
        >
          <Text style={styles.confirmLabel}>{s.confirm}</Text>
        </Pressable>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  pressed: {
    opacity: 0.8,
  },
  headerRight: {
    width: 40,
    backgroundColor: "transparent",
  },
  headerRightIcon: {
    width: 20,
    height: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  servicesBlock: {
    flexShrink: 0,
  },
  serviceBlock: {
    marginBottom: 12,
  },
  chooseHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  serviceCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    overflow: "hidden",
  },
  serviceCardSelected: {
    borderColor: c.backgroundLight,
  },
  serviceCardUnselected: {
    backgroundColor: c.blue900,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  serviceCardHeader: {
    gap: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  serviceCardHeaderActive: {
    backgroundColor: c.backgroundLight,
  },
  selectedItemsContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    paddingVertical: 4,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.white,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    backgroundColor: c.white,
    borderColor: c.white,
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  serviceLabelSelected: {
    color: c.white,
  },
  serviceLabelUnselected: {
    color: c.white,
    opacity: 0.9,
  },
  confirmBtn: {
    marginTop: 32,
    backgroundColor: c.backgroundLight,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
    opacity: 0.9,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  selectedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  selectedItemName: {
    flex: 1,
    color: c.white,
    fontSize: 15,
    fontWeight: "600",
  },
  selectedItemQty: {
    color: c.white,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  selectedItemRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  selectedItemPrice: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
  },
  selectedItemsEmpty: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pickupRow: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.12)",
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
    fontWeight: "700",
    color: c.white,
  },
  pickupSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  fullScreenLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(31, 200, 255, 0.35)",
    backgroundColor: "rgba(31, 200, 255, 0.08)",
  },
  editingBannerText: {
    flex: 1,
    color: c.white,
    fontSize: 13,
    lineHeight: 18,
  },
});
