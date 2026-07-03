import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

/** Caps order-notes growth so the sticky footer stays on screen while typing. */
export const CUSTOMER_ORDER_NOTES_MAX_HEIGHT = 120;

/** Shared horizontal inset for sticky footer (estimate bar + Save align). */
export const CUSTOMER_ORDER_FOOTER_PAD = 20;

const c = theme.colors;

export const customerOrderFooterStyles = StyleSheet.create({
  actionBtn: {
    alignSelf: "stretch",
    width: "100%",
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: c.backgroundLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
});

type Props = {
  children: ReactNode;
  footer: ReactNode;
  scrollContentStyle?: StyleProp<ViewStyle>;
};

/**
 * Scrollable service-order body with a footer pinned above the keyboard.
 * Android uses app.json `softwareKeyboardLayoutMode: "resize"`; iOS uses padding.
 */
export function CustomerItemizedOrderLayout({
  children,
  footer,
  scrollContentStyle,
}: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        <SafeAreaView style={styles.footer} edges={["bottom"]}>
          {footer}
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  footer: {
    flexShrink: 0,
    backgroundColor: c.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: CUSTOMER_ORDER_FOOTER_PAD,
  },
});
