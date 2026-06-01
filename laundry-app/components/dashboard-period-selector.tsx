import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
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

  const handleSelect = (next: DashboardPeriod) => {
    onValueChange(next);
    setVisible(false);
  };

  return (
    <>
      {/* <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.pressed,
          customStyle,
        ]}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
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
      </Pressable> */}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
        statusBarTranslucent={Platform.OS === "android"}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close period menu"
          />
          <View style={styles.menuPosition} pointerEvents="box-none">
            <View style={styles.dropdown}>
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
            </View>
          </View>
        </View>
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
  modalRoot: {
    flex: 1,
  },
  /** Non-transparent so Android reliably receives backdrop taps. */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.sheetBackdrop,
  },
  menuPosition: {
    position: "absolute",
    top: 56,
    right: 20,
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
    backgroundColor: c.selectionWash,
  },
  optionText: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
});
