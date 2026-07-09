import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text } from "react-native";

import { assets } from "@/assets/assets";

/** Simple footer: brand logo + copyright. */
export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <LinearGradient
      colors={["#071828", "#0f3040", "#1a5060"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.section}
    >
      <Image source={assets.icons.landing_logo} style={styles.logo} contentFit="contain" />
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
    height: 50,
    aspectRatio: 3,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
});
