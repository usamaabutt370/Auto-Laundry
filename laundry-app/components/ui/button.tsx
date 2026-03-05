import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

export type AppButtonVariant = "filled" | "outline";

export interface AppButtonProps {
  /** Button label. */
  label: string;
  /** Press handler. */
  onPress: () => void;
  /** "filled" = light blue background; "outline" = transparent with outline border. */
  variant?: AppButtonVariant;
  /** Optional icon name (MaterialCommunityIcons), e.g. "plus", "pencil". */
  leftIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** Optional icon after the label, e.g. "arrow-right", "check". */
  rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** When true, button grows to fill available space (e.g. in a row with flex: 1). */
  fullWidth?: boolean;
  /** Optional container style. */
  style?: ViewStyle;
  /** Accessibility label (defaults to label). */
  accessibilityLabel?: string;
  /** Disabled state. */
  disabled?: boolean;
}

/**
 * Reusable app button with filled or outline variant.
 * Uses theme lightBlue and outline colors. Use in rows with fullWidth for equal-width buttons.
 */
export function AppButton({
  label,
  onPress,
  variant = "filled",
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  accessibilityLabel,
  disabled = false,
}: AppButtonProps) {
  const isFilled = variant === "filled";
  const iconColor = isFilled ? c.white : c.outline;
  const textColor = isFilled ? c.white : c.outline;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isFilled ? styles.filled : styles.outline,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
    >
      {leftIcon != null && (
        <MaterialCommunityIcons
          name={leftIcon}
          size={22}
          color={iconColor}
          style={styles.iconLeft}
        />
      )}
      <Text
        style={[styles.text, { color: textColor }]}
        numberOfLines={1}
        {...(Platform.OS === "android" && { includeFontPadding: false })}
      >
        {label}
      </Text>
      {rightIcon != null && (
        <MaterialCommunityIcons
          name={rightIcon}
          size={20}
          color={iconColor}
          style={styles.iconRight}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    gap: 8,
  },
  fullWidth: {
    flex: 1,
  },
  filled: {
    backgroundColor: c.lightBlue,
    borderWidth: 1,
    borderColor: c.outline,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: c.outline,
  },
  text: {
    fontSize: fs.smallText,
    fontWeight: "600",
    lineHeight: 24,
  },
  iconLeft: {
    marginRight: 0,
  },
  iconRight: {
    marginLeft: 0,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
