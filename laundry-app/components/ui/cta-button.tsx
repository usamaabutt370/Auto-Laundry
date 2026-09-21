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

export const APP_CTA_GRADIENT_COLORS = ["#6D5CFF", "#8B5CF6", "#22D3EE"] as const;
const PURPLE = "#6D5CFF";
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
  const isDisabled = disabled || loading;
  const isOutline = variant === "outline";
  const isSm = size === "sm";
  const iconColor = isOutline ? PURPLE : "#FFFFFF";

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : leftIcon != null ? (
        <MaterialCommunityIcons name={leftIcon} size={isSm ? 14 : 16} color={iconColor} />
      ) : null}
      <Text
        style={[
          styles.label,
          isSm && styles.labelSm,
          isOutline ? styles.labelOutline : styles.labelGradient,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {!loading && rightIcon != null ? (
        <MaterialCommunityIcons name={rightIcon} size={isSm ? 12 : 14} color={iconColor} />
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
        isSm && styles.wrapSm,
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
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2,
    overflow: "hidden",
    justifyContent: "center",
    flexShrink: 0,
  },
  wrapSm: {
    height: BUTTON_HEIGHT_SM,
    borderRadius: BUTTON_HEIGHT_SM / 2,
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
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Bold",
    includeFontPadding: false,
  },
  labelSm: {
    fontSize: 12,
    lineHeight: 16,
  },
  labelGradient: { color: "#FFFFFF" },
  labelOutline: { color: PURPLE },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
