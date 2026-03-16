import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import type { ServicePricing } from "@/contexts/merchant-services-context";

const c = theme.colors;
const fs = theme.fontSize;

export interface ServicePricesCardProps {
  /** Card title (e.g. "Your Wash & Fold prices"). */
  title: string;
  /** When null or empty rows, the card is not rendered. Rows come from the screen where prices are set. */
  pricing: ServicePricing | null;
  /** When true, render only title + rows (no outer card); use when inside another card. */
  embedded?: boolean;
}

/** Format value as number only (no $). */
function formatPriceValue(value: string): string {
  if (!value.trim()) return "—";
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Reusable card showing dynamic price rows (labels + values from the price-setting screen).
 * Use below each service button on onboarding Services screen.
 */
export function ServicePricesCard({
  title,
  pricing,
  embedded = false,
}: ServicePricesCardProps) {
  const rows = pricing?.rows;
  if (!rows?.length) return null;

  const content = (
    <>
      <Text style={[styles.title, embedded && styles.titleEmbedded]}>
        {title}
      </Text>
      {rows.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={[styles.row, index === rows.length - 1 && styles.rowLast]}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{formatPriceValue(item.value)}</Text>
        </View>
      ))}
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedWrap}>{content}</View>;
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: c.blue900,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.outline,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  embeddedWrap: {
    paddingTop: 4,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.blue500,
    marginBottom: 12,
  },
  titleEmbedded: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: fs.smallText,
    color: c.white,
    fontWeight: "500",
  },
  value: {
    fontSize: fs.smallText,
    color: c.white,
    fontWeight: "600",
  },
});
