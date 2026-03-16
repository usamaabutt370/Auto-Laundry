import {
  Platform,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

export type FormTextInputVariant = "default" | "inset";

export interface FormTextInputProps extends Omit<TextInputProps, "style"> {
  /**
   * "default" = pill-shaped, blue900 bg (Business Detail style).
   * "inset" = rounded 12, background bg (inside cards, price inputs).
   */
  variant?: FormTextInputVariant;
  /** Multi-line input (e.g. description). */
  multiline?: boolean;
  /** Number of visible lines when multiline. */
  numberOfLines?: number;
  /** Optional element on the right (e.g. "KG" unit). */
  rightElement?: ReactNode;
  /** Container style when using rightElement row. */
  containerStyle?: ViewStyle;
  /** Override input style. */
  style?: TextInputProps["style"];
}

/**
 * Reusable form text input for partner screens.
 * Use variant="default" for Business Detail; variant="inset" for price inputs inside cards.
 */
export function FormTextInput({
  variant = "default",
  multiline = false,
  numberOfLines = 4,
  rightElement,
  containerStyle,
  style,
  placeholderTextColor = c.blue500,
  ...rest
}: FormTextInputProps) {
  const isInset = variant === "inset";

  const inputStyle = [
    styles.base,
    isInset ? styles.inset : styles.default,
    multiline && styles.multiline,
    multiline && { minHeight: Math.max(80, numberOfLines * 24) },
    style,
  ];

  const input = (
    <TextInput
      style={[inputStyle, rightElement && styles.inputInRow]}
      placeholderTextColor={placeholderTextColor}
      multiline={multiline}
      numberOfLines={multiline ? numberOfLines : undefined}
      textAlignVertical={multiline ? "top" : "center"}
      keyboardType={rest.keyboardType}
      editable={rest.editable}
      {...(Platform.OS === "android" && { includeFontPadding: false })}
      {...rest}
    />
  );

  if (rightElement) {
    return (
      <View style={[styles.row, containerStyle]}>
        {input}
        {rightElement}
      </View>
    );
  }

  return input;
}

const styles = StyleSheet.create({
  base: {
    fontSize: fs.smallText,
    color: c.white,
  },
  default: {
    backgroundColor: c.blue900,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: c.outline,
    paddingVertical: 17,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  inset: {
    backgroundColor: c.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    height: 48,
  },
  multiline: {
    height: undefined,
    minHeight: 150,
    paddingTop: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputInRow: {
    flex: 1,
    marginBottom: 0,
  },
});
