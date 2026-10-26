import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { theme, UI } from "@/constants/theme";

const fs = theme.fontSize;
const CARD_RADIUS = 20;
const shadow = theme.shadow ?? {};

export type PartnerMetricTileProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  /** Soft tint behind icon */
  iconTint?: string;
};

/**
 * Compact stat tile for dashboard metric grids (icon + label + value).
 */
export function PartnerMetricTile({
  icon,
  label,
  value,
  iconTint = UI.iconWell,
}: PartnerMetricTileProps) {
  return (
    <View style={[styles.metricTile, shadow]}>
      <View style={[styles.metricIconWrap, { backgroundColor: iconTint }]}>
        <MaterialCommunityIcons name={icon} size={20} color={UI.teal} />
      </View>
      <Text style={styles.metricLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export type PartnerDashboardHeroProps = {
  totalIncomeLabel: string;
  totalIncomeFormatted: string;
  periodEarningsLabel: string;
  periodEarningsFormatted: string;
  /** Active chart filter label, e.g. Week / Month / Year (localized). */
  periodFilterLabel: string;
  totalIncomeAmount: number;
  periodEarningsAmount: number;
  /** Localized calendar range for the selected period (matches totals). */
  periodRangeLabel: string;
  completedOrdersLabel: string;
  completedOrdersCount: number;
  avgPerOrderLabel: string;
  /** Formatted money or em dash when there are no completed orders in range. */
  avgPerOrderFormatted: string;
};

/**
 * Highlight card for period-scoped earnings (main figure + optional chart reconciliation).
 */
export function PartnerDashboardHero({
  totalIncomeLabel,
  totalIncomeFormatted,
  periodEarningsLabel,
  periodEarningsFormatted,
  periodFilterLabel,
  totalIncomeAmount,
  periodEarningsAmount,
  periodRangeLabel,
  completedOrdersLabel,
  completedOrdersCount,
  avgPerOrderLabel,
  avgPerOrderFormatted,
}: PartnerDashboardHeroProps) {
  /** Chart sum should match headline; show footer only if they diverge (e.g. rounding). */
  const showChartReconciliation =
    Math.round(totalIncomeAmount) !== Math.round(periodEarningsAmount);

  return (
    <View style={[styles.heroCard, shadow]}>
      <View style={styles.heroTopRow}>
        <View style={styles.heroTitleBlock}>
          <View style={[styles.heroBadge, styles.heroBadgeRing]}>
            <MaterialCommunityIcons name="wallet-outline" size={24} color={UI.teal} />
          </View>
          <Text style={styles.heroEyebrow} numberOfLines={2}>
            {totalIncomeLabel}
          </Text>
        </View>
        <View style={styles.heroPeriodChip} accessibilityRole="text">
          <MaterialCommunityIcons name="calendar-range" size={14} color={UI.teal} />
          <Text style={styles.heroPeriodChipText} numberOfLines={1}>
            {periodFilterLabel}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.heroValue,
          Platform.OS === "ios" ? styles.heroValueShadow : null,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {totalIncomeFormatted}
      </Text>

      <Text style={styles.heroPeriodRange} numberOfLines={2}>
        {periodRangeLabel}
      </Text>

      <View style={styles.heroStatsRow}>
        <View style={styles.heroStatCell}>
          <Text style={styles.heroStatLabel} numberOfLines={2}>
            {completedOrdersLabel}
          </Text>
          <Text style={styles.heroStatValue}>{String(completedOrdersCount)}</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatCell}>
          <Text style={styles.heroStatLabel} numberOfLines={2}>
            {avgPerOrderLabel}
          </Text>
          <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>
            {avgPerOrderFormatted}
          </Text>
        </View>
      </View>

      {showChartReconciliation ? (
        <>
          <View style={[styles.heroDivider, styles.heroDividerSpaced]} />
          <View style={styles.heroFootPillAccent}>
            <View style={styles.heroFootIconCircle}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.heroFootPillTextCol}>
              <Text style={styles.heroFootCaption} numberOfLines={2}>
                {periodEarningsLabel}
              </Text>
              <Text style={styles.heroFootAmount}>{periodEarningsFormatted}</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

export type PartnerServiceOverviewCardProps = {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  accent: string;
  totalActive: number;
  activeOrdersCaption: string;
  onPress?: () => void;
  /** Narrow two-column layout (e.g. dashboard row). */
  compact?: boolean;
};

/**
 * Order-pipeline card: channel title and active order count.
 */
export function PartnerServiceOverviewCard({
  title,
  icon,
  accent,
  totalActive,
  activeOrdersCaption,
  onPress,
  compact = false,
}: PartnerServiceOverviewCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.serviceCard,
        compact && styles.serviceCardCompact,
        shadow,
        { borderLeftWidth: 4, borderLeftColor: accent },
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={[styles.serviceHeader, compact && styles.serviceHeaderCompact]}>
        <View
          style={[
            styles.serviceIconWrap,
            compact && styles.serviceIconWrapCompact,
            { backgroundColor: UI.iconWell },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={compact ? 18 : 22}
            color={UI.teal}
          />
        </View>
        <View style={styles.serviceHeaderText}>
          <Text style={[styles.serviceTitle, compact && styles.serviceTitleCompact]} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {onPress ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={compact ? 18 : 22}
            color={UI.muted}
          />
        ) : null}
      </View>

      <View style={[styles.serviceStatBlock, compact && styles.serviceStatBlockCompact]}>
        <Text style={[styles.serviceBigNumber, compact && styles.serviceBigNumberCompact]}>
          {totalActive}
        </Text>
        <Text style={styles.serviceStatFoot}>{activeOrdersCaption}</Text>
      </View>
    </Pressable>
  );
}

export type PartnerPanelCardProps = {
  title: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  children: ReactNode;
  /** Optional right element (e.g. period control lives in header on parent) */
  headerRight?: ReactNode;
};

/**
 * Bordered panel for chart / list blocks with optional title row + icon.
 */
export function PartnerPanelCard({ title, icon, children, headerRight }: PartnerPanelCardProps) {
  return (
    <View style={[styles.panel, shadow]}>
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleRow}>
          {icon ? (
            <View style={styles.panelIconWrap}>
              <MaterialCommunityIcons name={icon} size={20} color={UI.teal} />
            </View>
          ) : null}
          <Text style={styles.panelTitle}>{title}</Text>
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  metricTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: UI.card,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: fs.xxSmallText,
    fontWeight: "600",
    color: UI.muted,
    textAlign: "center",
    lineHeight: 14,
  },
  metricValue: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: UI.text,
    textAlign: "center",
  },
  heroCard: {
    backgroundColor: UI.card,
    borderRadius: CARD_RADIUS + 2,
    marginBottom: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  heroTitleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  heroBadge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: UI.iconWell,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeRing: {
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  heroEyebrow: {
    flex: 1,
    fontSize: fs.smallText,
    fontWeight: "700",
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroPeriodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: UI.mint,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  heroPeriodChipText: {
    fontSize: fs.xxSmallText,
    fontWeight: "800",
    color: UI.teal,
  },
  heroValue: {
    fontSize: fs.titleBig,
    fontWeight: "800",
    color: UI.text,
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  heroValueShadow: {
    textShadowColor: "rgba(17, 24, 39, 0.08)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroPeriodRange: {
    fontSize: fs.descText,
    fontWeight: "600",
    color: UI.muted,
    marginBottom: 14,
    lineHeight: 18,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 12,
    gap: 0,
  },
  heroStatCell: {
    flex: 1,
    minWidth: 0,
  },
  heroStatLabel: {
    fontSize: fs.xxSmallText,
    fontWeight: "700",
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  heroStatValue: {
    fontSize: fs.smallText,
    fontWeight: "800",
    color: UI.text,
    letterSpacing: -0.2,
  },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: UI.chipBorder,
    marginHorizontal: 12,
    alignSelf: "stretch",
  },
  heroDividerSpaced: {
    marginTop: 14,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI.chipBorder,
    marginBottom: 12,
  },
  heroFootPillAccent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: UI.mint,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  heroFootIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: UI.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  heroFootPillTextCol: {
    flex: 1,
    minWidth: 0,
  },
  heroFootCaption: {
    fontSize: fs.xxSmallText,
    fontWeight: "700",
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  heroFootAmount: {
    fontSize: fs.smallTitle,
    fontWeight: "800",
    color: UI.text,
    letterSpacing: -0.3,
  },
  serviceCard: {
    backgroundColor: UI.card,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 18,
    marginBottom: 12,
  },
  serviceCardCompact: {
    padding: 12,
    marginBottom: 0,
  },
  pressed: {
    opacity: 0.92,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  serviceHeaderCompact: {
    gap: 6,
    marginBottom: 10,
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  serviceHeaderText: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: UI.text,
  },
  serviceTitleCompact: {
    fontSize: fs.descText,
    lineHeight: 18,
  },
  serviceStatBlock: {
    marginBottom: 0,
  },
  serviceStatBlockCompact: {
    marginBottom: 0,
  },
  serviceBigNumber: {
    fontSize: 36,
    fontWeight: "800",
    color: UI.text,
    letterSpacing: -0.5,
  },
  serviceBigNumberCompact: {
    fontSize: 26,
    letterSpacing: -0.4,
  },
  serviceStatFoot: {
    marginTop: 4,
    fontSize: fs.xxSmallText,
    fontWeight: "600",
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  panel: {
    backgroundColor: UI.card,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 18,
    marginBottom: 24,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  panelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: UI.iconWell,
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: {
    flex: 1,
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: UI.text,
  },
});
