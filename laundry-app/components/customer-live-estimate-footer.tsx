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
  appearance?: "dark" | "light";
};

export function CustomerLiveEstimateFooter({
  strings: s,
  partnerId,
  partnerName,
  loading,
  hasPartner,
  estimate,
  defaultBreakdownOpen = false,
  appearance = "dark",
}: Props) {
  const insets = useSafeAreaInsets();
  const partnerVerified = usePartnerVerified(partnerId);
  const [open, setOpen] = useState(defaultBreakdownOpen);
  const light = appearance === "light";

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
        light && styles.wrapLight,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {!hasPartner ? (
        <Text style={[styles.warn, light && styles.warnLight]}>{s.noPartner}</Text>
      ) : loading ? (
        <Text style={[styles.muted, light && styles.mutedLight]}>{s.loading}</Text>
      ) : null}

      {hasPartner && !loading && estimate.lines.length > 0 ? (
        <>
          <View style={styles.totalRow}>
            <View>
              <Text style={[styles.totalLabel, light && styles.totalLabelLight]}>
                {s.estimatedLabel}
              </Text>
              {partnerName ? (
                <PartnerNameWithBadge
                  name={partnerName}
                  verified={partnerVerified}
                  nameStyle={[styles.partnerHint, light && styles.partnerHintLight]}
                  badgeSize={11}
                />
              ) : null}
            </View>
            <Text style={[styles.totalValue, light && styles.totalValueLight]}>{showTotal}</Text>
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
            <Text style={[styles.breakdownText, light && styles.breakdownTextLight]}>
              {open ? s.hideBreakdown : s.viewBreakdown}
            </Text>
            <MaterialCommunityIcons
              name={open ? "chevron-up" : "chevron-down"}
              size={20}
              color={light ? "#12B886" : c.lightBlue}
            />
          </Pressable>

          {open ? (
            <View style={[styles.breakdownBox, light && styles.breakdownBoxLight]}>
              {estimate.lines.map((line) => (
                <View key={line.key} style={styles.lineRow}>
                  <View style={styles.lineLeft}>
                    <Text
                      style={[styles.lineTitle, light && styles.lineTitleLight]}
                      numberOfLines={2}
                    >
                      {line.title}
                    </Text>
                    <Text style={[styles.lineQty, light && styles.lineQtyLight]}>
                      {line.qtyLabel}
                    </Text>
                  </View>
                  <Text style={[styles.lineAmt, light && styles.lineAmtLight]}>
                    {line.amount != null
                      ? formatMoney(estimate.currencyPrefix, line.amount)
                      : "—"}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {estimate.disclaimer ? (
            <Text style={[styles.disclaimer, light && styles.disclaimerLight]}>
              {estimate.disclaimer}
            </Text>
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
  wrapLight: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  warnLight: {
    color: "#B45309",
  },
  mutedLight: {
    color: "#6B7280",
  },
  totalLabelLight: {
    color: "#6B7280",
  },
  partnerHintLight: {
    color: "#6B7280",
  },
  totalValueLight: {
    color: "#111827",
    fontFamily: "Poppins-Bold",
  },
  breakdownTextLight: {
    color: "#12B886",
    fontFamily: "Poppins-SemiBold",
  },
  breakdownBoxLight: {
    borderTopColor: "#E5E7EB",
  },
  lineTitleLight: {
    color: "#111827",
    fontFamily: "Poppins-Medium",
  },
  lineQtyLight: {
    color: "#6B7280",
  },
  lineAmtLight: {
    color: "#12B886",
    fontFamily: "Poppins-Bold",
  },
  disclaimerLight: {
    color: "#9CA3AF",
  },
});
