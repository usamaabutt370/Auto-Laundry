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
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

export type DashboardPeriod = "week" | "month" | "year";

export interface DashboardPeriodSelectorProps {
  value: DashboardPeriod;
  onValueChange: (period: DashboardPeriod) => void;
  style?: ViewStyle;
}

const PERIODS: DashboardPeriod[] = ["week", "month", "year"];

/**
 * Period filter for dashboard (Week / Month / Year). Styled like LanguageSelector
 * on Merchant Services screen: pill trigger, modal dropdown with options.
 */
export function DashboardPeriodSelector({
  value,
  onValueChange,
  style: customStyle,
}: DashboardPeriodSelectorProps) {
  const { locale } = useLocale();
  const s = getStrings(locale).partner.dashboard;
  const [visible, setVisible] = useState(false);

  const labels: Record<DashboardPeriod, string> = {
    week: s.week,
    month: s.month,
    year: s.year,
  };

  const handleSelect = (period: DashboardPeriod) => {
    onValueChange(period);
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
        accessibilityLabel={`Period: ${labels[value]}`}
        accessibilityHint="Filter progress by Week, Month or Year"
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {labels[value]}
        </Text>
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
            {PERIODS.map((period) => (
              <Pressable
                key={period}
                onPress={() => handleSelect(period)}
                style={({ pressed }) => [
                  styles.option,
                  period === value && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionText}>{labels[period]}</Text>
                {period === value && (
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
    borderColor: c.modalBorder,
    minWidth: 100,
    flexShrink: 0,
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
    backgroundColor: c.modalOverlay,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 20,
  },
  dropdown: {
    backgroundColor: c.blue900,
    borderRadius: 20,
    minWidth: 160,
    borderWidth: 1,
    borderColor: c.modalBorder,
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
    backgroundColor: "rgba(59, 127, 149, 0.35)",
  },
  optionText: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
});
