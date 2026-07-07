import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import {
  PartnerDashboardHero,
  PartnerPanelCard,
  PartnerServiceOverviewCard,
} from "@/components/partner-dashboard-cards";
import { AppButton } from "@/components/ui/button";
import {
  DashboardPeriodSelector,
  type DashboardPeriod,
} from "@/components/dashboard-period-selector";
import { DashboardChart } from "@/components/dashboard-chart";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useLaundererDashboard } from "@/hooks/use-launderer-dashboard";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { formatDashboardPeriodRange } from "@/lib/dashboard-period-bounds";
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

/**
 * Partner dashboard tab: shown as the home tab with bottom navigation.
 */
export default function PartnerDashboardScreen() {
  const router = useRouter();
  const { partnerApprovalStatus, partnerRejectionReason, refreshPartnerApproval } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.dashboard;
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const insets = useSafeAreaInsets();
  const tabBarInset = getTabBarBottomInset(Math.max(insets.bottom, 8));
  const { isWeb } = useResponsiveLayout();
  useSuppressWebScreenHeader();

  const periodRangeLabel = useMemo(
    () =>
      formatDashboardPeriodRange(
        period,
        new Date(),
        locale === "ur" ? "ur-PK" : "en-US",
      ),
    [period, locale],
  );

  const isApproved = partnerApprovalStatus === "approved";
  const { data, refresh } = useLaundererDashboard(isApproved, period);
  const earningsTotalForPeriod = data.earningsChartValues.reduce((sum, value) => sum + value, 0);

  useFocusEffect(
    useCallback(() => {
      void refreshPartnerApproval();
      if (isApproved) void refresh();
    }, [isApproved, refresh, refreshPartnerApproval]),
  );

  const showOnboardingPlaceholder = !isApproved;
  const isPendingApproval = partnerApprovalStatus === "submitted";
  const isRejected = partnerApprovalStatus === "rejected";
  const placeholderTitle = isPendingApproval
    ? s.pendingTitle
    : isRejected
      ? s.rejectedTitle
      : s.placeholderTitle;
  const placeholderMessage = isPendingApproval
    ? s.pendingMessage
    : isRejected
      ? (partnerRejectionReason?.trim()
          ? s.rejectedMessage.replace("{{reason}}", partnerRejectionReason.trim())
          : s.rejectedMessageFallback)
      : s.placeholderMessage;
  const placeholderButtonLabel = isPendingApproval
    ? s.pendingButton
    : isRejected
      ? s.rejectedButton
      : s.placeholderButton;

  return (
    <View style={styles.container}>
      {!isWeb ? (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <AppHeader title={s.title} />
        </SafeAreaView>
      ) : (
        <WebHeaderSpacer />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {showOnboardingPlaceholder ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>{placeholderTitle}</Text>
            <Text style={styles.placeholderMessage}>{placeholderMessage}</Text>
            <AppButton
              label={placeholderButtonLabel}
              onPress={() => router.push("/(partner)/onboarding")}
              variant="filled"
              fullWidth
              accessibilityLabel={placeholderButtonLabel}
            />
          </View>
        ) : null}
        {!showOnboardingPlaceholder ? (
          <>
            <PartnerDashboardHero
              totalIncomeLabel={s.totalIncome}
              totalIncomeFormatted={formatMoney(data.totalIncome)}
              periodEarningsLabel={s.periodEarningsTotal}
              periodEarningsFormatted={formatMoney(earningsTotalForPeriod)}
              periodFilterLabel={
                period === "week" ? s.week : period === "month" ? s.month : s.year
              }
              totalIncomeAmount={data.totalIncome}
              periodEarningsAmount={earningsTotalForPeriod}
              periodRangeLabel={periodRangeLabel}
              completedOrdersLabel={s.heroCompletedOrders}
              completedOrdersCount={data.completedOrdersInPeriod}
              avgPerOrderLabel={s.heroAvgPerOrder}
              avgPerOrderFormatted={
                data.completedOrdersInPeriod > 0
                  ? formatMoney(
                      Math.round(data.totalIncome / data.completedOrdersInPeriod),
                    )
                  : "—"
              }
            />

            <Text style={styles.sectionTitle}>{s.pipelineSectionTitle}</Text>
            <View style={styles.pipelineRow}>
              <View style={styles.pipelineCardWrap}>
                <PartnerServiceOverviewCard
                  compact
                  title={s.dropOff}
                  icon="storefront-outline"
                  accent={c.lightBlue}
                  totalActive={data.dropOff.total}
                  activeOrdersCaption={s.activeOrdersCaption}
                  onPress={() =>
                    router.push({
                      pathname: "/(partner)/dashboard-orders",
                      params: { kind: "dropoff" },
                    })
                  }
                />
              </View>
              <View style={styles.pipelineCardWrap}>
                <PartnerServiceOverviewCard
                  compact
                  title={s.delivery}
                  icon="truck-fast-outline"
                  accent={c.outline}
                  totalActive={data.delivery.total}
                  activeOrdersCaption={s.activeOrdersCaption}
                  onPress={() =>
                    router.push({
                      pathname: "/(partner)/dashboard-orders",
                      params: { kind: "delivery" },
                    })
                  }
                />
              </View>
            </View>

            <PartnerPanelCard title={s.earningsGraphLabel} icon="chart-bar">
              <Text style={styles.earningsTotalLabel}>
                {s.periodEarningsTotal}: {formatMoney(earningsTotalForPeriod)}
              </Text>
              <View style={styles.chartWrap}>
                <DashboardChart
                  values={data.earningsChartValues}
                  labels={data.chartLabels}
                  valueLabelFormatter={formatMoney}
                />
              </View>
            </PartnerPanelCard>
          </>
        ) : null}
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
  placeholderCard: {
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 20,
    marginBottom: 12,
    gap: 12,
    width: "50%",
    minWidth: 280,
    alignSelf: "center",
  },
  placeholderTitle: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: c.white,
  },
  placeholderMessage: {
    fontSize: fs.smallText,
    color: c.blue500,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: c.white,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  pipelineRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    marginBottom: 20,
  },
  pipelineCardWrap: {
    flex: 1,
    minWidth: 0,
  },
  chartWrap: {
    marginTop: 4,
    width: "100%",
  },
  earningsTotalLabel: {
    marginBottom: 8,
    fontSize: fs.descText,
    color: c.blue500,
    fontWeight: "600",
  },
});
