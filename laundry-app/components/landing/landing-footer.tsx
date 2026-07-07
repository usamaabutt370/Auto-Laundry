import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

/** Simple footer: brand line + copyright. */
export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <View style={styles.section}>
      <Text style={styles.logo}>Tap2Laundry</Text>
      <Text style={styles.copyright}>
        &copy; {year} Tap2Laundry. All rights reserved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: c.themeBlack,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
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
    color: "rgba(255,255,255,0.5)",
  },
});
