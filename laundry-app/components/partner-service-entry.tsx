import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ServicePricesCard } from "@/components/service-prices-card";
import { theme } from "@/constants/theme";
import type { ServicePricing } from "@/contexts/merchant-services-context";

const c = theme.colors;
const fs = theme.fontSize;

/** Unified spacing between stacked service rows (matches screenshot). */
const ROW_MARGIN_BOTTOM = 12;

export interface ServiceNoPricesButtonProps {
  /** Service name shown on the row. */
  label: string;
  onPress: () => void;
}

/**
 * 1) No item prices set → pill-shaped row (darker teal + thin outline + chevron).
 * Matches design: stacked, generous height, large border radius (pill).
 */
export function ServiceNoPricesButton({
  label,
  onPress,
}: ServiceNoPricesButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.servicePill,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.servicePillLabel}>{label}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={c.white}
      />
    </Pressable>
  );
}

export interface ServiceWithPricesCardProps {
  label: string;
  onPress: () => void;
  pricesCardTitle: string;
  pricing: ServicePricing | null;
}

/**
 * 2) Item prices set → same darker teal block with header row + price list below.
 * Outer container uses rounded rect so expanded content fits; same border/outline as pills.
 */
export function ServiceWithPricesCard({
  label,
  onPress,
  pricesCardTitle,
  pricing,
}: ServiceWithPricesCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardHeaderRow,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.serviceCardTitle}>{label}</Text>
        <MaterialCommunityIcons
          name="pencil"
          size={22}
          color={c.white}
        />
      </Pressable>
      {pricing?.rows?.length ? (
        <ServicePricesCard
          title={pricesCardTitle}
          pricing={pricing}
          embedded
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Pill-shaped service row: slightly darker teal than screen, thin cyan outline,
   * white text left, chevron right – consistent height and spacing.
   */
  servicePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: ROW_MARGIN_BOTTOM,
    backgroundColor: c.blue900,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.outline,
  },
  /** No prices set – smaller label so it reads secondary vs configured services. */
  servicePillLabel: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
    flex: 1,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  /** Prices set – larger title so configured services stand out. */
  serviceCardTitle: {
    fontSize: fs.titleMedium,
    fontWeight: "600",
    color: c.white,
    flex: 1,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  pressed: {
    opacity: 0.88,
  },
  /** Expanded block: same palette; larger radius on container for price block inside. */
  card: {
    backgroundColor: c.blue900,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.outline,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: ROW_MARGIN_BOTTOM,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: 8,
  },
});
