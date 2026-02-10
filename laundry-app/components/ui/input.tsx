import { theme } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

const PILL_RADIUS = 9999;
const PASSWORD_ICON_PADDING = 44;

export type InputVariant = "default" | "phone";

export interface InputProps extends Omit<TextInputProps, "style"> {
  /** Use "phone" for mobile number – shows numeric keypad only. Otherwise default keyboard. */
  variant?: InputVariant;
  /** Optional container style (e.g. marginBottom). */
  containerStyle?: ViewStyle;
  /** Override input style. */
  style?: TextInputProps["style"];
  /** Background color of the input (e.g. theme background for blended look). */
  backgroundColor?: string;
  /** Border color (light teal outline). */
  borderColor?: string;
  /** Placeholder and text color. */
  placeholderTextColor?: string;
  textColor?: string;
  /** Show focus underline (blue line under text when focused). */
  showFocusUnderline?: boolean;
  /** Focus underline color. */
  focusUnderlineColor?: string;
  /** Color for the show/hide password icon (when secureTextEntry is true). */
  passwordIconColor?: string;
}

/**
 * Reusable pill-shaped input. Use variant="phone" for mobile number (numeric keypad only);
 * otherwise the regular keyboard is shown.
 */
export function Input({
  variant = "default",
  containerStyle,
  style,
  backgroundColor,
  borderColor,
  placeholderTextColor,
  textColor,
  showFocusUnderline = true,
  focusUnderlineColor = "#78b2cb",
  passwordIconColor = "rgba(255,255,255,0.8)",
  editable = true,
  secureTextEntry = false,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPhone = variant === "phone";
  const keyboardType = isPhone ? "phone-pad" : rest.keyboardType;
  const isPasswordField = secureTextEntry;
  const showPasswordToggle = isPasswordField;
  const effectiveSecureTextEntry = isPasswordField && !isPasswordVisible;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.blue900 ?? "transparent",
              borderColor: borderColor ?? "rgba(255,255,255,0.4)",
              color: textColor ?? theme.colors.white,
              paddingRight: showPasswordToggle ? PASSWORD_ICON_PADDING : 20,
            },
            editable === false && styles.inputDisabled,
            style,
          ]}
          placeholderTextColor={placeholderTextColor ?? "rgba(255,255,255,0.7)"}
          keyboardType={keyboardType}
          editable={editable}
          secureTextEntry={effectiveSecureTextEntry}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {showPasswordToggle && (
          <Pressable
            onPress={() => setIsPasswordVisible((v) => !v)}
            style={styles.passwordToggle}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? "Hide password" : "Show password"
            }
          >
            <MaterialCommunityIcons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={24}
              color={passwordIconColor}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    minHeight: 52,
    backgroundColor: "transparent",
  },
  inputRow: {
    position: "relative",
    minHeight: 52,
    backgroundColor: "transparent",
  },
  input: {
    minHeight: 52,
    borderRadius: PILL_RADIUS,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  focusUnderline: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 12,
    height: 2,
    borderRadius: 1,
  },
});
