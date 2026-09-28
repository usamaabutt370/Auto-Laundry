import type { ReactNode } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UI } from "@/constants/theme";

type Props = {
  children: ReactNode;
};

/**
 * Bottom-sheet chrome for auth screens on native.
 * Needed because Android stack `modal` is full-screen; root uses transparentModal.
 */
export function AuthSheetFrame({ children }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (Platform.OS === "web") {
    return <>{children}</>;
  }

  const sheetHeight = Math.min(
    Math.round(height * 0.92),
    Math.round(height - insets.top - 12),
  );

  return (
    <View style={styles.backdrop}>
      <View style={styles.spacer} />
      <View style={[styles.sheet, { height: sheetHeight }]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  spacer: {
    flex: 1,
  },
  sheet: {
    backgroundColor: UI.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  body: {
    flex: 1,
  },
});
