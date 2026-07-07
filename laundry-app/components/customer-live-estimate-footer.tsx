import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import { theme } from "@/constants/theme";
import type { OrderEstimateResult } from "@/lib/customer-order-estimate";
import { formatMoney } from "@/utils/format-money";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const c = theme.colors;

export type LiveEstimateStrings = {
  estimatedLabel: string;
  viewBreakdown: string;
  hideBreakdown: string;
  loading: string;
  noPartner: string;
  partialNote: string;
};

type Props = {
  strings: LiveEstimateStrings;
  partnerId?: string | null;
  partnerName: string | null;
  loading: boolean;
  hasPartner: boolean;
  estimate: OrderEstimateResult;
  /** When true, line items are visible on first render (e.g. wash & fold pricing screen). */
  defaultBreakdownOpen?: boolean;
};

export function CustomerLiveEstimateFooter({
  strings: s,
  partnerId,
  partnerName,
  loading,
  hasPartner,
  estimate,
  defaultBreakdownOpen = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const partnerVerified = usePartnerVerified(partnerId);
  const [open, setOpen] = useState(defaultBreakdownOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  const showTotal =
    estimate.total != null
      ? formatMoney(estimate.currencyPrefix || "RS : ", estimate.total)
      : estimate.partialTotal > 0
        ? `${formatMoney(estimate.currencyPrefix || "RS : ", estimate.partialTotal)} *`
        : "—";

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {!hasPartner ? (
        <Text style={styles.warn}>{s.noPartner}</Text>
      ) : loading ? (
        <Text style={styles.muted}>{s.loading}</Text>
      ) : null}

      {hasPartner && !loading && estimate.lines.length > 0 ? (
        <>
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>{s.estimatedLabel}</Text>
              {partnerName ? (
                <PartnerNameWithBadge
                  name={partnerName}
                  verified={partnerVerified}
                  nameStyle={styles.partnerHint}
                  badgeSize={11}
                />
              ) : null}
            </View>
            <Text style={styles.totalValue}>{showTotal}</Text>
          </View>

          {estimate.total == null && estimate.partialTotal > 0 ? (
            <Text style={styles.partial}>{s.partialNote}</Text>
          ) : null}

          <Pressable
            onPress={toggle}
            style={({ pressed }) => [styles.breakdownBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={open ? s.hideBreakdown : s.viewBreakdown}
          >
            <Text style={styles.breakdownText}>
              {open ? s.hideBreakdown : s.viewBreakdown}
            </Text>
            <MaterialCommunityIcons
              name={open ? "chevron-up" : "chevron-down"}
              size={20}
              color={c.lightBlue}
            />
          </Pressable>

          {open ? (
            <View style={styles.breakdownBox}>
              {estimate.lines.map((line) => (
                <View key={line.key} style={styles.lineRow}>
                  <View style={styles.lineLeft}>
                    <Text style={styles.lineTitle} numberOfLines={2}>
                      {line.title}
                    </Text>
                    <Text style={styles.lineQty}>{line.qtyLabel}</Text>
                  </View>
                  <Text style={styles.lineAmt}>
                    {line.amount != null
                      ? formatMoney(estimate.currencyPrefix, line.amount)
                      : "—"}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {estimate.disclaimer ? (
            <Text style={styles.disclaimer}>{estimate.disclaimer}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: c.blue900,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  warn: {
    color: "#EAB308",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  muted: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  partnerHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
    maxWidth: 200,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "800",
    color: c.white,
  },
  partial: {
    fontSize: 12,
    color: "#EAB308",
    marginBottom: 8,
  },
  breakdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  breakdownText: {
    color: c.lightBlue,
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: { opacity: 0.85 },
  breakdownBox: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 10,
    marginBottom: 8,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  lineLeft: { flex: 1, paddingRight: 10 },
  lineTitle: { fontSize: 14, color: c.white, fontWeight: "500" },
  lineQty: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  lineAmt: {
    fontSize: 15,
    fontWeight: "700",
    color: c.white,
    minWidth: 72,
    textAlign: "right",
  },
  disclaimer: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 15,
    marginTop: 4,
  },
});
