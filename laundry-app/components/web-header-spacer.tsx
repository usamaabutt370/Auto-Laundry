import { Platform, StyleSheet, View } from "react-native";

import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

/** Matches AppHeader row + bottom padding when the title is hidden on web desktop. */
const WEB_DESKTOP_HEADER_HEIGHT = 40;

/** Reserves top space on web desktop where AppHeader would sit (sidebar labels the screen). */
export function WebHeaderSpacer() {
  const { isWebDesktop } = useResponsiveLayout();

  if (Platform.OS !== "web" || !isWebDesktop) {
    return null;
  }

  return <View style={styles.spacer} />;
}

const styles = StyleSheet.create({
  spacer: {
    height: WEB_DESKTOP_HEADER_HEIGHT,
    width: "100%",
  },
});
