import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const fs = theme.fontSize;

const UI = {
  card: "#FFFFFF",
  text: "#111827",
  teal: "#12B886",
  chipBorder: "#E5E7EB",
};

type BlockingLoaderProps = {
  visible: boolean;
  message?: string;
};

/**
 * Full-screen overlay that blocks interaction while an async action runs.
 * Uses an absolute View (not RN Modal) so it does not stack with other Modals
 * and freeze touch handling on iOS after accept/reject.
 */
export function BlockingLoader({ visible, message }: BlockingLoaderProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.root} pointerEvents="auto" accessibilityViewIsModal>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={UI.teal} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 32,
  },
  card: {
    minWidth: 180,
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  message: {
    fontSize: fs.descText,
    fontWeight: "600",
    color: UI.text,
    textAlign: "center",
  },
});
