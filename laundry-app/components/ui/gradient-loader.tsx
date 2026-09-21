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

import { gradients } from "@/constants/theme";

const SIZES = { small: 22, large: 38 } as const;

/** Single-color fallback for system widgets that cannot render a gradient (e.g. RefreshControl). */
export const APP_LOADER_TINT = gradients.cta[1];

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
          borderTopColor: gradients.cta[0],
          borderRightColor: gradients.cta[1],
          borderBottomColor: gradients.cta[2],
          borderLeftColor: "transparent",
        },
        spin,
        style,
      ]}
    />
  );
}
