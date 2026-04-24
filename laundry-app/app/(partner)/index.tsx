import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DashboardChart } from "@/components/dashboard-chart";
import {
  DashboardPeriodSelector,
  type DashboardPeriod,
} from "@/components/dashboard-period-selector";
import { useFocusEffect, useRouter } from "expo-router";
import { AppHeader } from "@/components/app-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { useLaundererDashboard } from "@/hooks/use-launderer-dashboard";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;
const CARD_RADIUS = 16;

function formatMoney(value: number): string {
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
  return `Rs ${formatted}`;
}

function formatMoneyCompact(value: number): string {
  if (value >= 1000) {
    const compact = value / 1000;
    const display = compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1);
    return `rs ${display}k`;
  }
  return `Rs ${Math.round(value)}`;
}

function formatShortDate(valueIso: string): string {
  const d = new Date(valueIso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

function ServiceBreakdownCard({
  title,
  total,
  washAndFold,
  dryCleaning,
  tailoring,
  s,
  onPress,
}: {
  title: string;
  total: number;
  washAndFold: number;
  dryCleaning: number;
  tailoring: number;
  s: ReturnType<typeof getStrings>["partner"]["dashboard"];
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.serviceCard,
        pressed && onPress && styles.serviceCardPressed,
      ]}
    >
      <View style={styles.serviceCircleWrap}>
        <View style={styles.serviceCircle}>
          <Text style={styles.serviceCircleTitle}>{title}</Text>
          <Text style={styles.serviceCircleTotal}>{total}</Text>
        </View>
      </View>
      <View style={styles.serviceList}>
        <Text style={styles.serviceRow}>
          {s.washAndFold}: {washAndFold}
        </Text>
        <Text style={styles.serviceRow}>
          {s.dryCleaning}: {dryCleaning}
        </Text>
        <Text style={styles.serviceRow}>
          {s.tailoring}: {tailoring}
        </Text>
      </View>
    </Pressable>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

/**
 * Partner dashboard: Number of Users, Drop Off / Delivery cards,
 * Summary (Total Income, Drop Off Income, Delivery Income), Balance, chart.
 * Data from useLaundererDashboard (zero until backend is wired).
 */
export default function PartnerDashboardScreen() {
  const router = useRouter();
  const { open: openSidebar } = useSidebar();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.dashboard;
  const [period, setPeriod] = useState<DashboardPeriod>("week");

  const { data, refresh } = useLaundererDashboard(true, period);
  const earningsTotalForPeriod = data.earningsChartValues.reduce((sum, value) => sum + value, 0);

  const subtitle = `${s.numberOfUsers}: ${data.numberOfUsers}`;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppHeader
          title={s.title}
          subtitle={subtitle}
          leftIcon="menu"
          onLeftPress={openSidebar}
          leftAccessibilityLabel="Menu"
          rightElement={
            <DashboardPeriodSelector
              value={period}
              onValueChange={setPeriod}
            />
          }
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.serviceCards}>
          <ServiceBreakdownCard
            title={s.dropOff}
            total={data.dropOff.total}
            washAndFold={data.dropOff.washAndFold}
            dryCleaning={data.dropOff.dryCleaning}
            tailoring={data.dropOff.tailoring}
            s={s}
            onPress={() =>
              router.push({
                pathname: "/(partner)/dashboard-orders",
                params: { kind: "dropoff" },
              })
            }
          />
          <ServiceBreakdownCard
            title={s.delivery}
            total={data.delivery.total}
            washAndFold={data.delivery.washAndFold}
            dryCleaning={data.delivery.dryCleaning}
            tailoring={data.delivery.tailoring}
            s={s}
            onPress={() =>
              router.push({
                pathname: "/(partner)/dashboard-orders",
                params: { kind: "delivery" },
              })
            }
          />
        </View>

        <Text style={styles.sectionTitle}>{s.summary}</Text>
        <View style={styles.summaryRow}>
          <SummaryCard label={s.totalIncome} value={formatMoney(data.totalIncome)} />
          <SummaryCard label={s.dropOffIncome} value={formatMoney(data.dropOffIncome)} />
          <SummaryCard label={s.deliveryIncome} value={formatMoney(data.deliveryIncome)} />
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{s.earningsGraphLabel}</Text>
          <Text style={styles.earningsTotalLabel}>
            {s.periodEarningsTotal}: {formatMoney(earningsTotalForPeriod)}
          </Text>
          <View style={styles.chartWrap}>
            <DashboardChart
              values={data.earningsChartValues}
              labels={data.chartLabels}
              showPointLabels
              valueLabelFormatter={formatMoneyCompact}
              hideZeroPointLabels
            />
          </View>
          <View style={styles.earningsListWrap}>
            <Text style={styles.deductionListTitle}>{s.recentEarnings}</Text>
            {data.recentCompletedEarnings.length === 0 ? (
              <Text style={styles.deductionEmpty}>{s.noRecentEarnings}</Text>
            ) : (
              data.recentCompletedEarnings.map((item) => (
                <Pressable
                  key={`${item.orderId}-${item.earnedAtIso}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(partner)/order-detail",
                      params: { orderId: item.orderId },
                    })
                  }
                  style={({ pressed }) => [styles.deductionRow, pressed && styles.serviceCardPressed]}
                >
                  <View style={styles.deductionRowLeft}>
                    <Text style={styles.deductionOrderId}>
                      {s.orderIdLabel}: {item.orderId.slice(0, 8)}
                    </Text>
                    <Text style={styles.deductionMeta}>
                      {formatShortDate(item.earnedAtIso)} • {s.viewOrderDetails}
                    </Text>
                  </View>
                  <Text style={styles.earningAmount}>{formatMoney(item.earnedAmount)}</Text>
                </Pressable>
              ))
            )}
            <Pressable
              onPress={() => router.push("/(partner)/earnings-history")}
              style={({ pressed }) => [
                styles.viewAllBtn,
                pressed && styles.serviceCardPressed,
              ]}
            >
              <Text style={styles.viewAllBtnText}>{s.viewAllEarnings}</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    paddingBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: H_PAD,
    paddingBottom: 40,
  },
  serviceCards: {
    gap: 12,
    marginBottom: 20,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 20,
  },
  serviceCardPressed: {
    opacity: 0.9,
  },
  serviceCircleWrap: {
    marginRight: 20,
  },
  serviceCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: c.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceCircleTitle: {
    fontSize: fs.xxSmallText,
    fontWeight: "600",
    color: c.blue500,
    textTransform: "uppercase",
  },
  serviceCircleTotal: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
  },
  serviceList: {
    flex: 1,
  },
  serviceRow: {
    fontSize: fs.smallText,
    color: c.white,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: fs.smallTitle,
    fontWeight: "600",
    color: c.white,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 16,
  },
  summaryLabel: {
    fontSize: fs.xxSmallText,
    fontWeight: "500",
    color: c.blue500,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: c.white,
  },
  balanceCard: {
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 20,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.blue500,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
  },
  chartWrap: {
    marginTop: 8,
    width: "100%",
  },
  earningsTotalLabel: {
    marginTop: 2,
    fontSize: fs.xxSmallText,
    color: c.white,
    fontWeight: "600",
  },
  earningsListWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.outline,
    paddingTop: 12,
    gap: 10,
  },
  deductionListTitle: {
    fontSize: fs.smallText,
    color: c.white,
    fontWeight: "700",
  },
  deductionEmpty: {
    fontSize: fs.xxSmallText,
    color: c.blue500,
  },
  deductionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.outline,
    gap: 8,
  },
  deductionRowLeft: {
    flex: 1,
  },
  deductionOrderId: {
    fontSize: fs.descText,
    color: c.white,
    fontWeight: "600",
  },
  deductionMeta: {
    marginTop: 2,
    fontSize: fs.xxSmallText,
    color: c.blue500,
  },
  earningAmount: {
    fontSize: fs.descText,
    color: c.white,
    fontWeight: "700",
  },
  viewAllBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 999,
    backgroundColor: c.blue900,
  },
  viewAllBtnText: {
    color: c.white,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
  },
});
