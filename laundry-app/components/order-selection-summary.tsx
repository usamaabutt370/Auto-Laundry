import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { useLocale } from "@/contexts/locale-context";
import type { OrderEstimateResult } from "@/lib/customer-order-estimate";
import { getStrings } from "@/locales";
import { formatMoney } from "@/utils/format-money";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const UI = {
  text: "#111827",
  muted: "#6B7280",
  purple: "#5B4DFF",
  chipBorder: "#E5E7EB",
};

type Props = {
  estimate: OrderEstimateResult;
  loading?: boolean;
};

export function OrderSelectionSummary({ estimate, loading = false }: Props) {
  const { locale } = useLocale();
  const s = getStrings(locale).customer.liveEstimate;
  const [open, setOpen] = useState(false);
  const currencyPrefix = estimate.currencyPrefix || "Rs ";
  const hasLines = estimate.lines.length > 0;
  const totalDisplay =
    estimate.total != null
      ? formatMoney(currencyPrefix, estimate.total)
      : estimate.partialTotal > 0
        ? `${formatMoney(currencyPrefix, estimate.partialTotal)} *`
        : "—";

  return (
    <View style={styles.wrap}>
      {hasLines && open ? (
        <ScrollView
          style={styles.breakdownScroll}
          contentContainerStyle={styles.breakdown}
          nestedScrollEnabled
        >
          {estimate.lines.map((line) => (
            <View key={line.key} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel} numberOfLines={1}>
                {line.title}
                {line.qtyLabel ? ` · ${line.qtyLabel}` : ""}
              </Text>
              <Text style={styles.breakdownValue}>
                {line.amount != null ? formatMoney(currencyPrefix, line.amount) : "—"}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <Pressable
        onPress={() => {
          if (!hasLines) return;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((value) => !value);
        }}
        style={styles.totalBtn}
        accessibilityRole="button"
        accessibilityLabel={open ? s.hideBreakdown : s.viewBreakdown}
      >
        <Text style={styles.totalLabel}>{s.estimatedLabel}</Text>
        <View style={styles.totalValueRow}>
          <Text style={styles.totalValue}>{loading ? "…" : totalDisplay}</Text>
          {hasLines ? (
            <MaterialCommunityIcons
              name={open ? "chevron-up" : "chevron-down"}
              size={18}
              color={UI.muted}
            />
          ) : null}
        </View>
        {!hasLines && !loading ? (
          <Text style={styles.emptyHint}>{s.emptySelection}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, alignSelf: "stretch" },
  totalBtn: { minWidth: 0 },
  totalLabel: { fontSize: 11, color: UI.muted, fontFamily: "Poppins-Medium" },
  totalValueRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  totalValue: { fontSize: 20, color: UI.text, fontFamily: "Poppins-Bold" },
  emptyHint: { marginTop: 2, fontSize: 11, color: UI.muted, fontFamily: "Poppins-Regular" },
  breakdownScroll: { maxHeight: 160 },
  breakdown: {
    paddingBottom: 4,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  breakdownLabel: { flex: 1, fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  breakdownValue: { fontSize: 12, color: UI.text, fontFamily: "Poppins-SemiBold" },
});
