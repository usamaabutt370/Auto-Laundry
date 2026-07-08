import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

/** Bottom-of-page conversion banner. */
export function LandingCta() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#0c2d3d", "#1a5060", "#2a7585"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.section}
    >
      <Text style={styles.heading}>Ready For Laundry That&apos;s Actually Cared For?</Text>
      <Text style={styles.subtitle}>
        Book your first pickup and let a trusted housewife near you handle it
        with care.
      </Text>

      <View style={styles.ctaRow}>
        <Pressable
          style={({ pressed }) => [pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/sign-up")}
          accessibilityRole="button"
          accessibilityLabel="Book Your Pickup"
        >
          <LinearGradient
            colors={["#f9c74f", "#f4a124"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Book Your Pickup</Text>
          </LinearGradient>
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

      <View style={styles.divider} />
      <Text style={styles.copyright}>
        © {new Date().getFullYear()} Tap2Laundry. All rights reserved.
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 56,
    alignItems: "center",
  },
  heading: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "800",
    color: c.white,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    color: c.white,
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
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  secondaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
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
    color: "rgba(255,255,255,0.65)",
  },
  divider: {
    width: "100%",
    maxWidth: 480,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop: 36,
  },
  copyright: {
    marginTop: 16,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
});
