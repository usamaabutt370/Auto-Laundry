import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const UI = {
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  chipBorder: "#E5E7EB",
  bg: "#F7F8FA",
  red: "#DC2626",
};

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmDialogOptions & {
  resolve: (confirmed: boolean) => void;
};

type ConfirmDialogViewProps = {
  pending: PendingConfirm | null;
  onClose: (confirmed: boolean) => void;
};

/** Overlay confirm UI without RN Modal — avoids iOS touch freeze when stacked with loaders. */
function ConfirmDialogView({ pending, onClose }: ConfirmDialogViewProps) {
  if (!pending) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto" accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={() => onClose(false)} accessibilityRole="button" />
      <View style={styles.card}>
        <Text style={styles.title}>{pending.title}</Text>
        <Text style={styles.message}>{pending.message}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => onClose(false)}
            style={({ pressed }) => [styles.btn, styles.cancelBtn, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>{pending.cancelLabel ?? "Cancel"}</Text>
          </Pressable>
          <Pressable
            onPress={() => onClose(true)}
            style={({ pressed }) => [
              styles.btn,
              pending.destructive ? styles.destructiveBtn : styles.confirmBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[
              styles.confirmText,
              pending.destructive && styles.destructiveText,
            ]}>{pending.confirmLabel ?? "OK"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Promise-based confirm dialog. Works on web where Alert.alert multi-button prompts do not.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);
  pendingRef.current = pending;

  const onClose = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    setPending(null);
    current.resolve(confirmed);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const dialog = <ConfirmDialogView pending={pending} onClose={onClose} />;

  return { confirm, dialog };
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: UI.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    zIndex: 1,
    shadowColor: "rgba(17, 24, 39, 0.12)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
    color: UI.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    minWidth: 88,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: UI.bg,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  confirmBtn: {
    backgroundColor: UI.teal,
  },
  destructiveBtn: {
    backgroundColor: UI.red,
  },
  cancelText: {
    color: UI.text,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    fontWeight: "600",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  destructiveText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.8,
  },
});
