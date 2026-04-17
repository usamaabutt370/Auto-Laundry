import { theme } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { type CountryCode } from "react-native-country-picker-modal";
import {
  CountryCodePicker,
  type SelectedCountry,
} from "./country-code-picker";
import { getExampleNumber } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";

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
  /** Border color; defaults to `theme.colors.outline` (same as FormTextInput). */
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
  /** Phone variant: currently selected country cca2 (e.g. 'PK') */
  selectedCca2?: CountryCode;
  /** Phone variant: currently selected calling code (e.g. '92') */
  selectedCallingCode?: string;
  /** Phone variant: callback when country is changed */
  onCountrySelect?: (country: SelectedCountry) => void;
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
  selectedCca2 = "PK",
  selectedCallingCode = "92",
  onCountrySelect,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPhone = variant === "phone";
  const keyboardType = isPhone ? "phone-pad" : rest.keyboardType;
  const isPasswordField = secureTextEntry;
  const showPasswordToggle = isPasswordField;
  const effectiveSecureTextEntry = isPasswordField && !isPasswordVisible;

  // Generate a dynamic placeholder if it's a phone input and no placeholder is provided or it's the default one
  let dynamicPlaceholder = rest.placeholder;
  if (isPhone && (!rest.placeholder || rest.placeholder === "Mobile Number")) {
    try {
      const example = getExampleNumber(selectedCca2 as any, examples);
      if (example) {
        dynamicPlaceholder = example.formatNational();
      }
    } catch (e) {
      // Fallback
    }
  }

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.blue900 ?? "transparent",
            borderColor: isFocused
              ? focusUnderlineColor
              : (borderColor ?? theme.colors.outline),
          },
          editable === false && styles.inputDisabled,
        ]}
      >
        {isPhone && (
          <View style={styles.phonePrefix}>
            <CountryCodePicker
              selectedCca2={selectedCca2}
              selectedCallingCode={selectedCallingCode}
              onSelect={onCountrySelect || (() => {})}
            />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              color: textColor ?? theme.colors.white,
            },
            style,
          ]}
          placeholder={dynamicPlaceholder}
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
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: PILL_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  passwordToggle: {
    paddingLeft: 8,
    paddingRight: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  focusUnderline: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  phonePrefix: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
  },
});
