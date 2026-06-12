import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

type Props = {
  children: ReactNode;
};

/** Full-viewport wrapper on web (no max-width constraint). */
export function WebAppShell({ children }: Props) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return <View style={appStyles.webRoot}>{children}</View>;
}

/** Centers auth screens on wide web viewports. */
export function WebAuthShell({ children }: Props) {
  const { isWebDesktop } = useResponsiveLayout();

  if (!isWebDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={authStyles.root}>
      <View style={authStyles.card}>{children}</View>
    </View>
  );
}

const appStyles = StyleSheet.create({
  webRoot: {
    flex: 1,
    width: "100%",
    backgroundColor: theme.colors.background,
    ...(Platform.OS === "web"
      ? ({
          minHeight: "100vh",
        } as object)
      : {}),
  },
});

const authStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    minHeight: 520,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
});
