import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

export type OnboardingActionIcon = "arrow-right" | "check";

export interface OnboardingActionButtonProps {
  /** Button label (e.g. "Next", "Confirm"). */
  label: string;
  /** Press handler. */
  onPress: () => void;
  /** When true, button is not pressable and appears disabled. */
  disabled?: boolean;
  /** Optional icon shown after the label. */
  rightIcon?: OnboardingActionIcon;
  /** Optional container style (e.g. marginTop). */
  style?: ViewStyle;
  /** Accessibility label (defaults to label). */
  accessibilityLabel?: string;
}

const ICON_NAMES: Record<
  OnboardingActionIcon,
  ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  "arrow-right": "arrow-right",
  check: "check",
};

/**
 * Primary action button for partner onboarding (Business Details "Next", Service "Confirm").
 * Light blue background, white text, optional right icon (arrow or check).
 */
export function OnboardingActionButton({
  label,
  onPress,
  disabled = false,
  rightIcon,
  style,
  accessibilityLabel,
}: OnboardingActionButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
      {rightIcon != null && (
        <MaterialCommunityIcons
          name={ICON_NAMES[rightIcon]}
          size={20}
          color={c.white}
          style={disabled ? styles.iconDisabled : undefined}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.lightBlue,
    paddingVertical: 17,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  label: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  labelDisabled: {
    opacity: 0.9,
  },
  iconDisabled: {
    opacity: 0.9,
  },
});
