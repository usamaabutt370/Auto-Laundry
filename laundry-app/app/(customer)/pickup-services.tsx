import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { Spacer } from "@/components";
import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";

const c = theme.colors;

type ServiceId = "washAndFold" | "dryCleaning" | "tailoring";

const SERVICES: {
  id: ServiceId;
  labelKey: keyof typeof strings.customer.pickupServices;
}[] = [
  { id: "washAndFold", labelKey: "washAndFold" },
  { id: "dryCleaning", labelKey: "dryCleaning" },
];

export default function PickupServicesScreen() {
  const router = useRouter();
  const { draft, setSelectedServiceIds } = useCustomerOrderDraft();
  const s = strings.customer.pickupServices;
  const selectedIds = draft.selectedServiceIds;

  const toggle = (id: ServiceId) => {
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
    router.push("/(customer)/schedule-pickup");
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
          {SERVICES.map(({ id, labelKey }) => {
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
                  {s[labelKey]}
                </Text>
              </Pressable>
            );
          })}
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
});
