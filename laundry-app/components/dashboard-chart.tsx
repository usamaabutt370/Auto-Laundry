import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const CHART_HEIGHT = 120;
const X_LABEL_HEIGHT = 20;
const PADDING_H = 8;
const PADDING_TOP = 8;

interface DashboardChartProps {
  /** 7 values for Mon–Sun (week). */
  values: [number, number, number, number, number, number, number];
}

/** Compute a smooth cubic-bezier SVG path through the data points. */
function buildPath(
  points: { x: number; y: number }[],
  close?: { width: number; height: number },
): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  if (close) {
    const last = points[points.length - 1];
    d += ` L ${last.x} ${close.height} L ${points[0].x} ${close.height} Z`;
  }
  return d;
}

export function DashboardChart({ values }: DashboardChartProps) {
  const [width, setWidth] = useState(0);

  const maxVal = Math.max(...values, 1);
  const effectiveW = width - PADDING_H * 2;
  const step = effectiveW / (values.length - 1);

  const points = values.map((v, i) => ({
    x: PADDING_H + i * step,
    y: PADDING_TOP + (1 - v / maxVal) * (CHART_HEIGHT - PADDING_TOP),
  }));

  const linePath = buildPath(points);
  const areaPath = buildPath(points, { width, height: CHART_HEIGHT });

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={CHART_HEIGHT + X_LABEL_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.blue500} stopOpacity="0.35" />
              <Stop offset="1" stopColor={c.blue900} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>
          {/* Area fill */}
          <Path d={areaPath} fill="url(#areaGrad)" />
          {/* Line */}
          <Path
            d={linePath}
            fill="none"
            stroke={c.blue500}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
      {/* X-axis labels */}
      <View style={[styles.labelsRow, { paddingHorizontal: PADDING_H }]}>
        {DAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  label: {
    fontSize: fs.xxSmallText,
    fontWeight: "500",
    color: c.blue500,
    textAlign: "center",
  },
});
