import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/button";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

/**
 * Launderer dashboard: for now shows a placeholder for users who haven’t completed
 * onboarding. Tap the button to go to partner onboarding.
 */
export default function PartnerDashboardScreen() {
  const router = useRouter();
  const { open: openSidebar } = useSidebar();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.dashboard;

  const handleGoToOnboarding = () => {
    router.push("/(partner)/onboarding");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <PartnerHeader
          title={s.title}
          subtitle={s.projectionsSubtitle}
          leftIcon="menu"
          onLeftPress={openSidebar}
          leftAccessibilityLabel="Menu"
        />
      </SafeAreaView>

      <View style={styles.placeholderWrap}>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>{s.placeholderTitle}</Text>
          <Text style={styles.placeholderMessage}>{s.placeholderMessage}</Text>
          <AppButton
            label={s.placeholderButton}
            onPress={handleGoToOnboarding}
            variant="filled"
            rightIcon="arrow-right"
            style={styles.dashboardBtn}
            accessibilityLabel={s.placeholderButton}
          />
        </View>
      </View>
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
  placeholderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    alignSelf: "stretch",
  },
  placeholderCard: {
    width: "100%",
    maxWidth: 400,
    minHeight: 400,
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: c.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderTitle: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
    marginBottom: 12,
    textAlign: "center",
  },
  placeholderMessage: {
    fontSize: fs.smallText15,
    color: c.blue500,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "center",
  },
  dashboardBtn: {
    alignSelf: "stretch",
    marginHorizontal: 32,
  },
});
