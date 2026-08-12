import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

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
            <Text style={styles.confirmText}>{pending.confirmLabel ?? "OK"}</Text>
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
    backgroundColor: c.sheetBackdrop,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: c.modalBorder,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 88,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  confirmBtn: {
    backgroundColor: c.lightBlue,
  },
  destructiveBtn: {
    backgroundColor: "#D9534F",
  },
  cancelText: {
    color: c.white,
    fontSize: 15,
    fontWeight: "600",
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
