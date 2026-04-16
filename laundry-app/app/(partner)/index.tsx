import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DashboardChart } from "@/components/dashboard-chart";
import {
  DashboardPeriodSelector,
  type DashboardPeriod,
} from "@/components/dashboard-period-selector";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { useLaundererDashboard } from "@/hooks/use-launderer-dashboard";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;
const CARD_RADIUS = 16;

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function ServiceBreakdownCard({
  title,
  total,
  washAndFold,
  dryCleaning,
  tailoring,
  s,
}: {
  title: string;
  total: number;
  washAndFold: number;
  dryCleaning: number;
  tailoring: number;
  s: ReturnType<typeof getStrings>["partner"]["dashboard"];
}) {
  return (
    <View style={styles.serviceCard}>
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
    </View>
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

function DashboardPlaceholder({
  title,
  message,
  buttonLabel,
  onPress,
  loading,
}: {
  title: string;
  message: string;
  buttonLabel: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderMessage}>{message}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.placeholderButton,
          pressed && styles.placeholderButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
      >
        {loading ? (
          <ActivityIndicator color={c.background} />
        ) : (
          <Text style={styles.placeholderButtonText}>{buttonLabel}</Text>
        )}
      </Pressable>
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
  const { partnerApprovalStatus, partnerRejectionReason, isLoading: isLoadingAuth } =
    useAuth();
  const s = getStrings(locale).partner.dashboard;
  const [period, setPeriod] = useState<DashboardPeriod>("week");

  const isApproved = partnerApprovalStatus === "approved";
  const { data, isLoading } = useLaundererDashboard(isApproved, period);

  const subtitle = `${s.numberOfUsers}: ${data.numberOfUsers}`;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <PartnerHeader
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
        {isLoadingAuth ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.white} />
          </View>
        ) : !isApproved ? (
          <DashboardPlaceholder
            title={
              partnerApprovalStatus === "submitted"
                ? s.pendingTitle
                : partnerApprovalStatus === "rejected"
                  ? s.rejectedTitle
                  : s.placeholderTitle
            }
            message={
              partnerApprovalStatus === "submitted"
                ? s.pendingMessage
                : partnerApprovalStatus === "rejected"
                  ? partnerRejectionReason?.trim()
                    ? s.rejectedMessage.replace(
                        "{{reason}}",
                        partnerRejectionReason.trim(),
                      )
                    : s.rejectedMessageFallback
                  : s.placeholderMessage
            }
            buttonLabel={
              partnerApprovalStatus === "submitted"
                ? s.pendingButton
                : partnerApprovalStatus === "rejected"
                  ? s.rejectedButton
                  : s.placeholderButton
            }
            onPress={() => router.push("/(partner)/onboarding")}
          />
        ) : isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.white} />
          </View>
        ) : (
          <>
            <View style={styles.serviceCards}>
              <ServiceBreakdownCard
                title={s.dropOff}
                total={data.dropOff.total}
                washAndFold={data.dropOff.washAndFold}
                dryCleaning={data.dropOff.dryCleaning}
                tailoring={data.dropOff.tailoring}
                s={s}
              />
              <ServiceBreakdownCard
                title={s.delivery}
                total={data.delivery.total}
                washAndFold={data.delivery.washAndFold}
                dryCleaning={data.delivery.dryCleaning}
                tailoring={data.delivery.tailoring}
                s={s}
              />
            </View>

            <Text style={styles.sectionTitle}>{s.summary}</Text>
            <View style={styles.summaryRow}>
              <SummaryCard label={s.totalIncome} value={formatMoney(data.totalIncome)} />
              <SummaryCard label={s.dropOffIncome} value={formatMoney(data.dropOffIncome)} />
              <SummaryCard label={s.deliveryIncome} value={formatMoney(data.deliveryIncome)} />
            </View>

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>{s.balance}</Text>
              <Text style={styles.balanceValue}>{formatMoney(data.balance)}</Text>
              <View style={styles.chartWrap}>
                <DashboardChart values={data.chartValues} />
              </View>
            </View>
          </>
        )}
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
  serviceCircleWrap: {
    marginRight: 20,
  },
  serviceCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.blue800,
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
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderCard: {
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 24,
    marginTop: 8,
  },
  placeholderTitle: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
    marginBottom: 10,
  },
  placeholderMessage: {
    fontSize: fs.smallText,
    color: c.blue500,
    lineHeight: 22,
  },
  placeholderButton: {
    marginTop: 22,
    borderRadius: 999,
    backgroundColor: c.blue500,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  placeholderButtonPressed: {
    opacity: 0.85,
  },
  placeholderButtonText: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: c.background,
  },
});
