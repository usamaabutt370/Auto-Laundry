import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  /** 1–5 stagger step used by web CSS (ignored on native). */
  step?: 1 | 2 | 3 | 4 | 5;
  style?: StyleProp<ViewStyle>;
};

/** Native passthrough — entrance animation is web-only. */
export function LandingHeroReveal({ children, style }: Props) {
  return <View style={style}>{children}</View>;
}
