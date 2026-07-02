import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

/** Bottom-of-page conversion banner. */
export function LandingCta() {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Ready For Laundry That&apos;s Actually Cared For?</Text>
      <Text style={styles.subtitle}>
        Book your first pickup and let a trusted housewife near you handle it
        with care.
      </Text>

      <View style={styles.ctaRow}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/sign-up")}
          accessibilityRole="button"
          accessibilityLabel="Book Your Pickup"
        >
          <Text style={styles.primaryBtnText}>Book Your Pickup</Text>
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
        onPress={() => router.push("/(auth)/welcome")}
        accessibilityRole="button"
        accessibilityLabel="Are you a housewife? Become a Laundry Captain"
        style={({ pressed }) => [styles.customerNudge, pressed && styles.pressed]}
      >
        <Text style={styles.customerNudgeText}>
          Are you a housewife looking to earn from home? Become a Laundry Captain →
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
