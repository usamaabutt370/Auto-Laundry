import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

/** Bottom-of-page conversion banner. */
export function LandingCta() {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Ready To Start Earning From Home?</Text>
      <Text style={styles.subtitle}>
        Create your Laundry Captain profile and start receiving nearby orders
        in minutes.
      </Text>

      <View style={styles.ctaRow}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/welcome")}
          accessibilityRole="button"
          accessibilityLabel="Become a Laundry Captain"
        >
          <Text style={styles.primaryBtnText}>Become a Laundry Captain</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          <Text style={styles.secondaryBtnText}>Sign In</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push("/(auth)/sign-up")}
        accessibilityRole="button"
        accessibilityLabel="Need laundry done instead? Sign up as a customer"
        style={({ pressed }) => [styles.customerNudge, pressed && styles.pressed]}
      >
        <Text style={styles.customerNudgeText}>
          Need laundry done instead? Sign up as a customer →
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 56,
    backgroundColor: c.themeBlack,
    alignItems: "center",
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: c.white,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 12,
    maxWidth: 440,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  primaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: c.background,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
  },
  secondaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
  },
  pressed: {
    opacity: 0.8,
  },
  customerNudge: {
    marginTop: 20,
  },
  customerNudgeText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
});
