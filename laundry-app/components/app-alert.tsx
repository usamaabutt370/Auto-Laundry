import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

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

  const dismiss = (btn?: AppAlertButton) => {
    setPending(null);
    btn?.onPress?.();
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
            <View
              style={[
                styles.actions,
                pending.buttons.length > 1 ? styles.actionsRow : styles.actionsColumn,
              ]}
            >
              {pending.buttons.map((btn, i) => (
                <Pressable
                  key={i}
                  onPress={() => dismiss(btn)}
                  style={({ pressed }) => [
                    styles.btn,
                    btn.style === "cancel" && styles.cancelBtn,
                    btn.style === "destructive" && styles.destructiveBtn,
                    btn.style !== "cancel" && btn.style !== "destructive" && styles.defaultBtn,
                    pressed && styles.pressed,
                    pending.buttons.length > 1 && styles.btnFlex,
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
              ))}
            </View>
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
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.35)",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    zIndex: 1,
    elevation: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
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
  defaultBtn: {
    backgroundColor: c.outline,
  },
  cancelBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  destructiveBtn: {
    backgroundColor: "#D9534F",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.background,
  },
  cancelText: {
    color: c.white,
  },
  destructiveText: {
    color: c.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
