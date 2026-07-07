import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityRole="button" />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: c.white,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: c.background,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelText: {
    color: c.gray50,
    fontSize: 15,
    fontWeight: "600",
  },
  confirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: c.backgroundLight,
  },
  confirmText: {
    color: c.white,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
});
