import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { gradients } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

export const APP_CTA_GRADIENT_COLORS = gradients.cta;
const PURPLE = APP_CTA_GRADIENT_COLORS[0];
const GRADIENT_COLORS = APP_CTA_GRADIENT_COLORS;
const BUTTON_HEIGHT = 48;
const BUTTON_HEIGHT_SM = 32;

export type AppCtaButtonWidth = "full" | "half" | "auto" | number;
export type AppCtaButtonVariant = "gradient" | "outline";
export type AppCtaButtonSize = "md" | "sm";

export type AppCtaButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: AppCtaButtonVariant;
  /** `full` = 100%, `half` = 50% of a row, `auto` = hug label, number = flex share (e.g. 40 / 60). */
  width?: AppCtaButtonWidth;
  size?: AppCtaButtonSize;
  leftIcon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  rightIcon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

function widthStyle(width: AppCtaButtonWidth): ViewStyle {
  if (width === "full") return { alignSelf: "stretch", width: "100%" };
  if (width === "half") return { flex: 1, minWidth: 0 };
  if (width === "auto") return { flexGrow: 0, flexShrink: 0 };
  return { flex: width, minWidth: 0 };
}

export function AppCtaButton({
  label,
  onPress,
  variant = "gradient",
  width = "full",
  size = "md",
  leftIcon,
  rightIcon,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: AppCtaButtonProps) {
  const { s, ms, isNarrow } = useResponsiveLayout();
  const isDisabled = disabled || loading;
  const isOutline = variant === "outline";
  const isSm = size === "sm";
  const iconColor = isOutline ? PURPLE : "#FFFFFF";
  const btnH = s(isSm ? BUTTON_HEIGHT_SM : isNarrow ? 44 : BUTTON_HEIGHT);
  const labelSize = ms(isSm ? 12 : isNarrow ? 12 : 13);
  const iconSize = isSm ? 14 : isNarrow ? 15 : 16;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : leftIcon != null ? (
        <MaterialCommunityIcons name={leftIcon} size={iconSize} color={iconColor} />
      ) : null}
      <Text
        style={[
          styles.label,
          { fontSize: labelSize, lineHeight: labelSize + 5 },
          isOutline ? styles.labelOutline : styles.labelGradient,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {!loading && rightIcon != null ? (
        <MaterialCommunityIcons
          name={rightIcon}
          size={isSm ? 12 : isNarrow ? 13 : 14}
          color={iconColor}
        />
      ) : null}
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        style,
        styles.wrap,
        {
          height: btnH,
          borderRadius: btnH / 2,
        },
        widthStyle(width),
        isOutline && styles.outline,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {isOutline ? (
        <View style={[styles.fill, isSm && styles.fillSm]}>{content}</View>
      ) : (
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.fill, isSm && styles.fillSm]}
        >
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    justifyContent: "center",
    flexShrink: 0,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: PURPLE,
    backgroundColor: "#FFFFFF",
  },
  fill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 16,
  },
  fillSm: {
    paddingHorizontal: 12,
  },
  label: {
    fontFamily: "Poppins-Bold",
    includeFontPadding: false,
  },
  labelGradient: { color: "#FFFFFF" },
  labelOutline: { color: PURPLE },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
