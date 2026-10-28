import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Web-only CSS class (e.g. hero row media-query layout). */
  className?: string;
};

/**
 * Caps section content at a max width and centers it — without this,
 * flex:1 columns stretch edge-to-edge on wide desktop viewports and leave
 * huge gaps between text and images.
 */
export function LandingContainer({ children, style, className }: Props) {
  return (
    <View
      // @ts-expect-error className is valid on RN Web
      className={className}
      style={[styles.container, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    backgroundColor: "transparent",
  },
});
