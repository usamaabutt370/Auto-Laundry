import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

const DEFAULT_LABELS: [string, string, string, string, string, string, string] = [
  "M",
  "T",
  "W",
  "T",
  "F",
  "S",
  "S",
];

/** Space above bars for the selected value (full chart width — avoids narrow-column clipping). */
const VALUE_ROW_HEIGHT = 28;
const PLOT_ROW_HEIGHT = 120;

interface DashboardChartProps {
  /** Seven bucket values (e.g. earnings per segment). */
  values: [number, number, number, number, number, number, number];
  /** Optional labels under each bar. */
  labels?: [string, string, string, string, string, string, string];
  /** Tooltip / value text (e.g. currency). */
  valueLabelFormatter?: (value: number) => string;
}

export function DashboardChart({
  values,
  labels = DEFAULT_LABELS,
  valueLabelFormatter,
}: DashboardChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const maxVal = Math.max(...values, 1);

  const formatValue = (v: number) =>
    valueLabelFormatter ? valueLabelFormatter(v) : String(Math.round(v));

  const onBarPress = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const selectedValue =
    selectedIndex !== null ? formatValue(values[selectedIndex]) : null;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.valueRow,
          selectedValue !== null && styles.valueRowWithSelection,
        ]}
      >
        {selectedValue !== null ? (
          <Text
            style={styles.valuePlain}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {selectedValue}
          </Text>
        ) : null}
      </View>

      <View style={[styles.plotRow, { height: PLOT_ROW_HEIGHT }]}>
        {values.map((value, i) => {
          const minH = value > 0 ? 6 : 3;
          const barH =
            maxVal > 0 ? Math.max((value / maxVal) * PLOT_ROW_HEIGHT, minH) : minH;
          const selected = selectedIndex === i;

          return (
            <View key={`bar-col-${i}`} style={styles.barColumn}>
              <View style={styles.barStack}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${labels[i]}, ${formatValue(value)}`}
                  onPress={() => onBarPress(i)}
                  style={({ pressed }) => [
                    styles.barHit,
                    pressed && styles.barHitPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.bar,
                      { height: barH },
                      selected && styles.barSelected,
                    ]}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {labels.map((label, i) => {
          const isFirst = i === 0;
          const isLast = i === values.length - 1;
          return (
            <Text
              key={`xlabel-${i}`}
              style={[
                styles.xLabel,
                isFirst && styles.xLabelFirst,
                isLast && styles.xLabelLast,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  valueRow: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  valueRowWithSelection: {
    minHeight: VALUE_ROW_HEIGHT,
    paddingBottom: 6,
  },
  valuePlain: {
    width: "100%",
    fontSize: fs.smallText,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
  },
  plotRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  barColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-end",
  },
  barStack: {
    width: "100%",
    alignItems: "center",
  },
  barHit: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 2,
  },
  barHitPressed: {
    opacity: 0.88,
  },
  bar: {
    width: "78%",
    maxWidth: 32,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: c.lightBlue,
  },
  barSelected: {
    borderWidth: 1,
    borderColor: c.outline,
  },
  labelsRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingHorizontal: 2,
  },
  xLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: fs.xxSmallText,
    fontWeight: "500",
    color: c.blue500,
    textAlign: "center",
  },
  xLabelFirst: {
    textAlign: "left",
  },
  xLabelLast: {
    textAlign: "right",
  },
});
