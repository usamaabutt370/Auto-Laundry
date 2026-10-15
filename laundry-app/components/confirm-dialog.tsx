import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppCtaButton } from "@/components/ui/cta-button";
import { gradients, UI } from "@/constants/theme";

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

  const destructive = Boolean(pending.destructive);

  return (
    <View style={styles.overlay} pointerEvents="auto" accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={() => onClose(false)} accessibilityRole="button" />
      <View style={styles.card}>
        <Pressable
          onPress={() => onClose(false)}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <MaterialCommunityIcons name="close" size={20} color={UI.muted} />
        </Pressable>

        {destructive ? (
          <View style={[styles.iconRing, styles.iconRingDanger]}>
            <View style={styles.iconWell}>
              <MaterialCommunityIcons name="alert-outline" size={32} color={UI.red} />
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={[...gradients.glass]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconRing}
          >
            <View style={styles.iconWell}>
              <MaterialCommunityIcons name="help-circle-outline" size={32} color={UI.purple} />
            </View>
          </LinearGradient>
        )}

        <Text style={styles.title}>{pending.title}</Text>
        <Text style={styles.message}>{pending.message}</Text>

        <View style={styles.actions}>
          <View style={styles.actionSlot}>
            <AppCtaButton
              variant="outline"
              label={pending.cancelLabel ?? "Cancel"}
              onPress={() => onClose(false)}
              width="full"
            />
          </View>
          <View style={styles.actionSlot}>
            {destructive ? (
              <Pressable
                onPress={() => onClose(true)}
                style={({ pressed }) => [styles.destructiveBtn, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.destructiveText} numberOfLines={1}>
                  {pending.confirmLabel ?? "OK"}
                </Text>
              </Pressable>
            ) : (
              <AppCtaButton
                label={pending.confirmLabel ?? "OK"}
                onPress={() => onClose(true)}
                width="full"
              />
            )}
          </View>
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
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI.overlay,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: UI.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: "center",
    zIndex: 1,
    shadowColor: UI.shadowStrong,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.iconWell,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconRingDanger: { backgroundColor: UI.redBg },
  iconWell: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  actionSlot: { flex: 1, minWidth: 0 },
  destructiveBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: UI.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  destructiveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
  },
  pressed: {
    opacity: 0.8,
  },
});
