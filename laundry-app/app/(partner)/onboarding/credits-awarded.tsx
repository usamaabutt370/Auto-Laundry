import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/button";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import {
  PARTNER_ORDER_DEDUCTION_RATE_PERCENT,
  PARTNER_WELCOME_CREDITS,
} from "@/lib/partner-credits";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

function parsePositiveInt(value: string | string[] | undefined, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export default function PartnerOnboardingCreditsAwardedScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const strings = getStrings(locale).partner.onboarding;
  const dashboardStrings = getStrings(locale).partner.dashboard;
  const params = useLocalSearchParams<{
    awarded?: string;
    balance?: string;
    deductionRate?: string;
  }>();

  const awarded = parsePositiveInt(params.awarded, PARTNER_WELCOME_CREDITS);
  const balance = parsePositiveInt(params.balance, awarded);
  const deductionRate = parsePositiveInt(
    params.deductionRate,
    PARTNER_ORDER_DEDUCTION_RATE_PERCENT,
  );
  const isAlreadyGranted = awarded === 0 && balance > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{strings.creditsScreenTitle}</Text>
        <Text style={styles.subtitle}>{strings.creditsScreenSubtitle}</Text>
        <Text style={styles.kycNote}>{dashboardStrings.pendingMessage}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{strings.creditsAwardedLabel}</Text>
          <Text style={styles.cardValue}>
            {isAlreadyGranted ? balance : awarded} {strings.creditsTokenLabel}
          </Text>
          <Text style={styles.balanceLine}>
            {strings.creditsBalanceLabelPrefix} {balance} {strings.creditsTokenLabel}
          </Text>
          {isAlreadyGranted ? (
            <Text style={styles.hintText}>
              Credits were already granted earlier for this account.
            </Text>
          ) : null}
        </View>

        <View style={styles.rulesWrap}>
          <Text style={styles.rulesHeading}>{strings.creditsHowItWorksHeading}</Text>
          <Text style={styles.ruleItem}>{strings.creditsRuleFreeStart}</Text>
          <Text style={styles.ruleItem}>
            {strings.creditsRuleOrderDeductionPrefix} {deductionRate}%{" "}
            {strings.creditsRuleOrderDeductionSuffix}
          </Text>
          <Text style={styles.ruleItem}>{strings.creditsRuleTopup}</Text>
        </View>

        <AppButton
          label={strings.creditsContinueToDashboard}
          onPress={() => router.replace("/(partner)")}
          variant="filled"
          rightIcon="arrow-right"
          style={styles.button}
          accessibilityLabel={strings.creditsContinueToDashboard}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    color: c.white,
    fontSize: fs.titleNormal,
    fontWeight: "700",
  },
  subtitle: {
    color: c.white,
    fontSize: fs.descText,
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 330,
  },
  kycNote: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
    marginTop: 14,
    lineHeight: 18,
    maxWidth: 330,
  },
  card: {
    marginTop: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.blue500,
    backgroundColor: c.blue900,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  cardLabel: {
    color: c.white,
    fontSize: fs.descText,
  },
  cardValue: {
    color: c.white,
    fontSize: fs.titleNormal,
    fontWeight: "700",
    marginTop: 6,
  },
  balanceLine: {
    color: c.white,
    fontSize: fs.smallText,
    marginTop: 8,
    fontWeight: "600",
  },
  hintText: {
    color: c.white,
    fontSize: fs.xxSmallText,
    marginTop: 8,
  },
  rulesWrap: {
    marginTop: 28,
  },
  rulesHeading: {
    color: c.white,
    fontSize: fs.titleMedium,
    fontWeight: "600",
    marginBottom: 12,
  },
  ruleItem: {
    color: c.white,
    fontSize: fs.smallText,
    lineHeight: 21,
    marginBottom: 10,
  },
  button: {
    marginTop: 26,
    alignSelf: "stretch",
  },
});
