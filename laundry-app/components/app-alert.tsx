import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

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
    <>
      {children}
      <Modal
        visible={pending !== null}
        transparent
        animationType="fade"
        onRequestClose={() => dismiss()}
      >
        <Pressable style={styles.backdrop} onPress={() => dismiss()}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {pending?.title ? (
              <Text style={styles.title}>{pending.title}</Text>
            ) : null}
            {pending?.message ? (
              <Text style={styles.message}>{pending.message}</Text>
            ) : null}
            <View
              style={[
                styles.actions,
                (pending?.buttons.length ?? 0) > 1
                  ? styles.actionsRow
                  : styles.actionsColumn,
              ]}
            >
              {pending?.buttons.map((btn, i) => (
                <Pressable
                  key={i}
                  onPress={() => dismiss(btn)}
                  style={({ pressed }) => [
                    styles.btn,
                    btn.style === "cancel" && styles.cancelBtn,
                    btn.style === "destructive" && styles.destructiveBtn,
                    btn.style !== "cancel" && btn.style !== "destructive" && styles.defaultBtn,
                    pressed && styles.pressed,
                    (pending?.buttons.length ?? 0) > 1 && styles.btnFlex,
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
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.35)",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    gap: 10,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionsColumn: {
    flexDirection: "column",
  },
  btn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  btnFlex: {
    flex: 1,
  },
  defaultBtn: {
    backgroundColor: c.lightBlue,
  },
  cancelBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  destructiveBtn: {
    backgroundColor: "#D9534F",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.white,
  },
  cancelText: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  destructiveText: {
    color: c.white,
  },
  pressed: {
    opacity: 0.8,
  },
});
