import { useEffect } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { APP_CTA_GRADIENT_COLORS } from "@/components/ui/cta-button";

const SIZES = { small: 22, large: 38 } as const;

/** Single-color fallback for system widgets that cannot render a gradient (e.g. RefreshControl). */
export const APP_LOADER_TINT = APP_CTA_GRADIENT_COLORS[1];

export type GradientLoaderProps = {
  size?: keyof typeof SIZES;
  style?: StyleProp<ViewStyle>;
};

export function GradientLoader({ size = "large", style }: GradientLoaderProps) {
  const dim = SIZES[size];
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 750, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          borderWidth: size === "large" ? 3.5 : 2.5,
          borderTopColor: APP_CTA_GRADIENT_COLORS[0],
          borderRightColor: APP_CTA_GRADIENT_COLORS[1],
          borderBottomColor: APP_CTA_GRADIENT_COLORS[2],
          borderLeftColor: "transparent",
        },
        spin,
        style,
      ]}
    />
  );
}
