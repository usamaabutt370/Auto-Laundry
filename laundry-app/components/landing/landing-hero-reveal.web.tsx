import type { CSSProperties, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet } from "react-native";

type Props = {
  children: ReactNode;
  /** 1–5 stagger step — maps to `.landing-hero-reveal-N` in +html.tsx */
  step?: 1 | 2 | 3 | 4 | 5;
  style?: StyleProp<ViewStyle>;
};

/**
 * Web wrapper uses a real DOM `div` so CSS keyframe classes apply.
 * RN Text/View do not reliably forward className to the DOM.
 */
export function LandingHeroReveal({ children, step = 1, style }: Props) {
  const flat = (StyleSheet.flatten(style) ?? {}) as CSSProperties;
  // Raw DOM divs need explicit flex when RN layout styles are passed through.
  if (flat.flexDirection && !flat.display) {
    flat.display = "flex";
  }
  return (
    <div
      className={`landing-hero-reveal landing-hero-reveal-${step}`}
      style={Object.keys(flat).length ? flat : undefined}
    >
      {children}
    </div>
  );
}
