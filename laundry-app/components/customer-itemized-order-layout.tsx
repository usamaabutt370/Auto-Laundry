import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Platform, StyleSheet, View } from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

/** Caps order-notes growth so the sticky footer stays on screen while typing. */
export const CUSTOMER_ORDER_NOTES_MAX_HEIGHT = 120;

/** Shared horizontal inset for sticky footer (estimate bar + Save align). */
export const CUSTOMER_ORDER_FOOTER_PAD = 20;

/** Space reserved for sticky footer when scrolling a focused input into view. */
const FOOTER_SCROLL_OFFSET = 120;

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
  appearance?: "dark" | "light";
};

/**
 * Scrollable service-order body with a footer pinned above the keyboard.
 * Android uses app.json `softwareKeyboardLayoutMode: "resize"`; iOS uses padding.
 * Uses react-native-keyboard-controller so transparent modals (e.g. book-service) lift correctly.
 */
export function CustomerItemizedOrderLayout({
  children,
  footer,
  scrollContentStyle,
  appearance = "dark",
}: Props) {
  const light = appearance === "light";
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(
    insets.bottom,
    initialWindowMetrics?.insets.bottom ?? 0,
    12,
  );
  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      automaticOffset
    >
      <View style={styles.body}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bottomOffset={FOOTER_SCROLL_OFFSET}
          extraKeyboardSpace={8}
        >
          {children}
        </KeyboardAwareScrollView>
        <View
          style={[
            styles.footer,
            light && styles.footerLight,
            { paddingBottom: bottomInset },
          ]}
        >
          {footer}
        </View>
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
    paddingTop: 12,
    paddingHorizontal: CUSTOMER_ORDER_FOOTER_PAD,
  },
  footerLight: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
  },
});
