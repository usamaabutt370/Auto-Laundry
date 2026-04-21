import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { Spacer } from "@/components";
import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import type { LaundererServiceType } from "@/constants/launderers";
import { theme } from "@/constants/theme";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { fetchPartnerDetail, serviceCategoriesToTypes } from "@/lib/partner-discovery";

const c = theme.colors;

type ServiceId = "washAndFold" | "dryCleaning" | "tailoring";

const SERVICE_KEYS: LaundererServiceType[] = [
  "washAndFold",
  "dryCleaning",
  "tailoring",
];

export default function PickupServicesScreen() {
  const router = useRouter();
  const { draft, setPickupDeliveryRequested, setSelectedServiceIds } =
    useCustomerOrderDraft();
  const s = strings.customer.pickupServices;
  const selectedIds = draft.selectedServiceIds;
  const [partnerServiceTypes, setPartnerServiceTypes] = useState<ServiceId[]>([]);
  const [pickupDeliveryEnabled, setPickupDeliveryEnabled] = useState(false);
  const [pickupFeeLabel, setPickupFeeLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPartnerServices = async () => {
      if (!draft.partnerId) {
        setPartnerServiceTypes([]);
        return;
      }
      const { profile, services } = await fetchPartnerDetail(draft.partnerId);
      if (cancelled) return;
      const available = serviceCategoriesToTypes(services.map((row) => row.category))
        .filter((id): id is ServiceId => SERVICE_KEYS.includes(id))
        .filter((id, idx, arr) => arr.indexOf(id) === idx);
      setPartnerServiceTypes(available);
      const pickupEnabled = Boolean(profile?.pickup_delivery_amount?.trim());
      setPickupDeliveryEnabled(pickupEnabled);
      setPickupFeeLabel(profile?.pickup_delivery_amount?.trim() || null);
      if (!pickupEnabled) {
        setPickupDeliveryRequested(false);
      }
    };
    loadPartnerServices();
    return () => {
      cancelled = true;
    };
  }, [draft.partnerId, setPickupDeliveryRequested]);

  const servicesToShow = useMemo(() => {
    if (partnerServiceTypes.length > 0) return partnerServiceTypes;
    return draft.partnerId ? [] : (["washAndFold", "dryCleaning"] as ServiceId[]);
  }, [draft.partnerId, partnerServiceTypes]);

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
      router.push("/(customer)/schedule-pickup");
      return;
    }
    router.push("/(customer)/order-summary");
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
        <Text style={styles.headerTitle}>{s.title}</Text>
        <View style={styles.headerRight}>
          <Image source={assets.icons.menu_icon} style={styles.headerRightIcon} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.spacer} />
        <View style={styles.servicesBlock}>
          <Text style={styles.chooseHeading}>{s.chooseServices}</Text>
          <Spacer.Column numberOfSpaces={10} />
          {servicesToShow.map((id) => {
            const isSelected = selectedIds.includes(id);
            return (
              <Pressable
                key={id}
                onPress={() => toggle(id)}
                style={({ pressed }) => [
                  styles.servicePill,
                  isSelected
                    ? styles.servicePillSelected
                    : styles.servicePillUnselected,
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
                      color={c.white}
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
            );
          })}
          {draft.partnerId && servicesToShow.length === 0 ? (
            <Text style={styles.emptyText}>No services configured by this launderer yet.</Text>
          ) : null}

          {pickupDeliveryEnabled ? (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
    backgroundColor: "transparent",
  },
  backBtn: {
    padding: 8,
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    backgroundColor: "transparent",
  },
  headerRight: {
    width: 40,
    backgroundColor: "transparent",
  },
  headerRightIcon: {
    width: 20,
    height: 20,
  },
  pressed: {
    opacity: 0.8,
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
  chooseHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  servicePill: {
    gap: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 999,
    marginBottom: 14,
    backgroundColor: "transparent",
  },
  servicePillSelected: {
    backgroundColor: c.backgroundLight,
    borderWidth: 0,
  },
  servicePillUnselected: {
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: c.backgroundLight,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    backgroundColor: c.blue500,
    borderColor: c.blue500,
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: "600",
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
});
