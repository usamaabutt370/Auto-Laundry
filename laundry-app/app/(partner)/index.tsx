import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
        <View style={styles.headerRow}>
          <Pressable
            onPress={openSidebar}
            style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <MaterialCommunityIcons name="menu" size={28} color={c.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{s.title}</Text>
        </View>
      </SafeAreaView>

      <View style={styles.placeholderWrap}>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>{s.placeholderTitle}</Text>
          <Text style={styles.placeholderMessage}>{s.placeholderMessage}</Text>
          <Pressable
            onPress={handleGoToOnboarding}
            style={({ pressed }) => [
              styles.placeholderButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={s.placeholderButton}
          >
            <Text style={styles.placeholderButtonText}>
              {s.placeholderButtonWithArrow}
            </Text>
          </Pressable>
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
  pressed: {
    opacity: 0.85,
  },
  safeArea: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuBtn: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
  },
  placeholderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  placeholderCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: c.outline,
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
  placeholderButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.lightBlue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  placeholderButtonText: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
  },
});
