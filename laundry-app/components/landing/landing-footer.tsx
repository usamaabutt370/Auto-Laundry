import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

/** Simple footer: brand line + copyright. */
export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <LinearGradient
      colors={["#071828", "#0f3040", "#1a5060"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.section}
    >
      <Text style={styles.logo}>Tap2Laundry</Text>
      <Text style={styles.copyright}>
        &copy; {year} Tap2Laundry. All rights reserved.
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  logo: {
    fontSize: 18,
    fontWeight: "800",
    color: c.white,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
});
