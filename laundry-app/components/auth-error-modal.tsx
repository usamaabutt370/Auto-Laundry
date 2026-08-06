import { theme } from "@/constants/theme";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type AuthErrorModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
};

export function AuthErrorModal({
  visible,
  title,
  message,
  onClose,
  actionLabel = "OK",
}: AuthErrorModalProps) {
  // In-tree overlay (not RN Modal) — avoids iOS ghost touch-blockers on login.
  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <ThemedView style={styles.card}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <ThemedText style={styles.buttonText}>{actionLabel}</ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 14, 25, 0.62)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: theme.colors.white,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.background,
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    backgroundColor: "transparent",
  },
  button: {
    marginTop: 16,
    alignSelf: "flex-end",
    height: 38,
    minWidth: 76,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.white,
    backgroundColor: "transparent",
  },
});
