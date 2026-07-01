import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
};

/**
 * Caps section content at a max width and centers it — without this,
 * flex:1 columns stretch edge-to-edge on wide desktop viewports and leave
 * huge gaps between text and images.
 */
export function LandingContainer({ children, style }: Props) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 1140,
    alignSelf: "center",
    backgroundColor: "transparent",
  },
});
