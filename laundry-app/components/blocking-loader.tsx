import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

type BlockingLoaderProps = {
  visible: boolean;
  message?: string;
};

/** Full-screen overlay that blocks interaction while an async action runs. */
export function BlockingLoader({ visible, message }: BlockingLoaderProps) {
  if (!visible) {
    return null;
  }

  // In-tree overlay (not RN Modal) — avoids iOS ghost touch-blockers after dismiss.
  return (
    <View style={styles.host} pointerEvents="auto">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={c.white} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  overlay: {
    flex: 1,
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
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.35)",
  },
  message: {
    fontSize: fs.descText,
    fontWeight: "600",
    color: c.white,
    textAlign: "center",
  },
});
