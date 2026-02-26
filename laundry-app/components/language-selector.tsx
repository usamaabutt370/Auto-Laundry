import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";

import { theme } from "@/constants/theme";
import {
  LOCALE_LABELS,
  useLocale,
} from "@/contexts/locale-context";
import type { LocaleCode } from "@/locales";
import { SUPPORTED_LOCALES } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

export interface LanguageSelectorProps {
  /** Optional style for the trigger button container (e.g. for header layout). */
  style?: ViewStyle;
}

/**
 * Reusable language selector for any screen. Shows current locale (English/Urdu);
 * on press opens a dropdown to switch. Uses theme colors.
 * Use: import { LanguageSelector } from "@/components"; then <LanguageSelector /> (or with style prop).
 */
export function LanguageSelector({ style: customStyle }: LanguageSelectorProps = {}) {
  const { locale, setLocale } = useLocale();
  const [visible, setVisible] = useState(false);

  const handleSelect = (code: LocaleCode) => {
    setLocale(code);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.pressed,
          customStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Language: ${LOCALE_LABELS[locale]}`}
        accessibilityHint="Opens language options"
      >
        <Text style={styles.triggerText}>{LOCALE_LABELS[locale]}</Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={c.white}
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <Pressable style={styles.dropdown} onPress={() => {}}>
            {SUPPORTED_LOCALES.map((code) => (
              <Pressable
                key={code}
                onPress={() => handleSelect(code)}
                style={({ pressed }) => [
                  styles.option,
                  code === locale && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionText}>{LOCALE_LABELS[code]}</Text>
                {code === locale && (
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color={c.outline}
                  />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  triggerText: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
  pressed: {
    opacity: 0.8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 20,
  },
  dropdown: {
    backgroundColor: c.blue900,
    borderRadius: 14,
    minWidth: 160,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 10,
  },
  optionSelected: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  optionText: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
});
