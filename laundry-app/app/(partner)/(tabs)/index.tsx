import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import { PartnerHomeDashboard } from "@/components/partner-home-dashboard";
import { AppCtaButton } from "@/components/ui/cta-button";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { getStrings } from "@/locales";
import { StatusBar } from "expo-status-bar";

import { gradients, UI } from "@/constants/theme";

const H_PAD = 24;

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
          {isRejected ? (
            <View style={styles.iconRingDanger}>
              <View style={styles.iconWell}>
                <MaterialCommunityIcons name="alert-circle-outline" size={32} color={UI.red} />
              </View>
            </View>
          ) : (
            <LinearGradient
              colors={[...gradients.glass]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconRing}
            >
              <View style={styles.iconWell}>
                <MaterialCommunityIcons
                  name={isPendingApproval ? "clock-outline" : "storefront-outline"}
                  size={32}
                  color={UI.purple}
                />
              </View>
            </LinearGradient>
          )}
          <Text style={styles.placeholderTitle}>{placeholderTitle}</Text>
          <Text style={styles.placeholderMessage}>{placeholderMessage}</Text>
          <AppCtaButton
            label={placeholderButtonLabel}
            onPress={() => router.push("/(partner)/onboarding")}
            width="full"
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    marginTop: 8,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    alignItems: "center",
    shadowColor: UI.shadowStrong,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconRingDanger: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: UI.redBg,
  },
  iconWell: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    textAlign: "center",
    marginBottom: 6,
  },
  placeholderMessage: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 22,
  },
});
