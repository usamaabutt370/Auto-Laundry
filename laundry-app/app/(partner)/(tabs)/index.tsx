import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import { PartnerHomeDashboard } from "@/components/partner-home-dashboard";
import { AppButton } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { getStrings } from "@/locales";
import { StatusBar } from "expo-status-bar";

import { theme, UI } from "@/constants/theme";

const fs = theme.fontSize;
const H_PAD = 24;
const CARD_RADIUS = 16;

/**
 * Partner home tab. Approved launderers see the live dashboard.
 * Everyone else sees the onboarding / KYC placeholder.
 */
export default function PartnerDashboardScreen() {
  const router = useRouter();
  const { partnerApprovalStatus, partnerRejectionReason, refreshPartnerApproval } = useAuth();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.dashboard;
  const insets = useSafeAreaInsets();
  const tabBarInset = getTabBarBottomInset(Math.max(insets.bottom, 8));
  const { isWeb } = useResponsiveLayout();
  useSuppressWebScreenHeader();

  const isApproved = partnerApprovalStatus === "approved";

  useFocusEffect(
    useCallback(() => {
      void refreshPartnerApproval();
    }, [refreshPartnerApproval]),
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

  if (!showOnboardingPlaceholder) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <PartnerHomeDashboard />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {!isWeb ? (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <AppHeader appearance="light" title={s.title} />
        </SafeAreaView>
      ) : (
        <WebHeaderSpacer />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + 16 }]}
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
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
    backgroundColor: UI.card,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.chipBorder,
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
    color: UI.text,
  },
  placeholderMessage: {
    fontSize: fs.smallText,
    color: UI.muted,
    lineHeight: 20,
  },
});
