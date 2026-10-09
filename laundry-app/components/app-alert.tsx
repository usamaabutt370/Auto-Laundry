import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCtaButton } from "@/components/ui/cta-button";
import { UI } from "@/constants/theme";

export type AppAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type AlertState = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
} | null;

// Module-level singleton — registered by AppAlertProvider on mount.
let _handler: ((title: string, message?: string, buttons?: AppAlertButton[]) => void) | null = null;

/** Drop-in replacement for Alert.alert — works on both native and web. */
export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
) {
  if (_handler) {
    _handler(title, message, buttons);
    return;
  }
  // Provider missing / remounting — native alert so the user still sees something.
  Alert.alert(
    title,
    message,
    (buttons ?? [{ text: "OK" }]).map((btn) => ({
      text: btn.text,
      style: btn.style,
      onPress: btn.onPress,
    })),
  );
}

/** Mount once at the app root to enable showAppAlert() everywhere. */
export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<AlertState>(null);

  useEffect(() => {
    _handler = (title, message, buttons) => {
      setPending({ title, message, buttons: buttons ?? [{ text: "OK" }] });
    };
    return () => {
      _handler = null;
    };
  }, []);

  const buttons = pending?.buttons ?? [];
  const inRow = buttons.length === 2;
  // Two choices + Cancel: choices share one row, Cancel spans below.
  const choices = buttons.filter((btn) => btn.style !== "cancel");
  const cancels = buttons.filter((btn) => btn.style === "cancel");
  const choiceRow = buttons.length > 2 && choices.length === 2;

  const dismiss = (btn?: AppAlertButton) => {
    setPending(null);
    btn?.onPress?.();
  };

  const renderButton = (
    btn: AppAlertButton,
    key: string,
    opts: { half: boolean; tall: boolean },
  ) => {
    const isDefault = btn.style !== "cancel" && btn.style !== "destructive";
    if (isDefault) {
      return (
        <AppCtaButton
          key={key}
          label={btn.text}
          onPress={() => dismiss(btn)}
          width={opts.half ? "half" : "full"}
          size={opts.tall ? "md" : "sm"}
        />
      );
    }
    return (
      <Pressable
        key={key}
        onPress={() => dismiss(btn)}
        style={({ pressed }) => [
          styles.btn,
          opts.tall && styles.btnTall,
          btn.style === "cancel" && styles.cancelBtn,
          btn.style === "destructive" && styles.destructiveBtn,
          pressed && styles.pressed,
          opts.half && styles.btnFlex,
        ]}
      >
        <Text
          style={[
            styles.btnText,
            btn.style === "cancel" && styles.cancelText,
            btn.style === "destructive" && styles.destructiveText,
          ]}
        >
          {btn.text}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      {children}
      {pending ? (
        <View style={styles.overlay} pointerEvents="auto" accessibilityViewIsModal>
          <Pressable style={styles.backdrop} onPress={() => dismiss()} accessibilityRole="button" />
          <View style={styles.card}>
            {pending.title ? <Text style={styles.title}>{pending.title}</Text> : null}
            {pending.message ? <Text style={styles.message}>{pending.message}</Text> : null}
            {choiceRow ? (
              <View style={[styles.actions, styles.actionsColumn]}>
                <View style={[styles.actions, styles.actionsRow]}>
                  {choices.map((btn, i) =>
                    renderButton(btn, `choice-${i}`, { half: true, tall: true }),
                  )}
                </View>
                {cancels.map((btn, i) =>
                  renderButton(btn, `cancel-${i}`, { half: false, tall: true }),
                )}
              </View>
            ) : (
              <View
                style={[styles.actions, inRow ? styles.actionsRow : styles.actionsColumn]}
              >
                {buttons.map((btn, i) =>
                  renderButton(btn, `btn-${i}`, { half: inRow, tall: false }),
                )}
              </View>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20000,
    elevation: 20000,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    zIndex: 1,
    elevation: 1,
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
    lineHeight: 21,
    marginBottom: 16,
  },
  actions: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionsColumn: {
    flexDirection: "column",
  },
  btn: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  btnFlex: {
    flex: 1,
  },
  btnTall: {
    minHeight: 48,
    justifyContent: "center",
    paddingVertical: 0,
  },
  cancelBtn: {
    backgroundColor: UI.bg,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  destructiveBtn: {
    backgroundColor: UI.red,
  },
  btnText: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelText: {
    color: UI.text,
  },
  destructiveText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.85,
  },
});
