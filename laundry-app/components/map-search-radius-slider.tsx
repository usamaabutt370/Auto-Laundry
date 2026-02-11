import { useCallback, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;
const TRACK_TOUCH_HEIGHT = 44;

export interface MapSearchRadiusSliderProps {
  /** Minimum value (miles). */
  min?: number;
  /** Maximum value (miles). */
  max?: number;
  /** Current value (miles). */
  value: number;
  /** Called when the user changes the value. */
  onValueChange: (value: number) => void;
  /** Label suffix for min/max (e.g. "mi"). */
  unitLabel?: string;
  /** Whether to show current value above the slider. */
  showValue?: boolean;
  /** Optional style overrides. */
  trackStyle?: object;
  fillStyle?: object;
  thumbStyle?: object;
  labelStyle?: object;
}

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 10;

export function MapSearchRadiusSlider({
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  value,
  onValueChange,
  unitLabel = "mi",
  showValue = true,
  trackStyle,
  fillStyle,
  thumbStyle,
  labelStyle,
}: MapSearchRadiusSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const startXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const onValueChangeRef = useRef(onValueChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  trackWidthRef.current = trackWidth;
  onValueChangeRef.current = onValueChange;
  minRef.current = min;
  maxRef.current = max;

  const clampedValue = Math.max(min, Math.min(max, value));
  const range = max - min;

  const valueFromX = useCallback(
    (x: number) => {
      const tw = trackWidthRef.current;
      if (tw <= 0) return clampedValue;
      const ratio = Math.max(0, Math.min(1, x / tw));
      const raw = min + ratio * range;
      return Math.round(raw);
    },
    [min, range, clampedValue]
  );
  const valueFromXRef = useRef(valueFromX);
  valueFromXRef.current = valueFromX;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        startXRef.current = evt.nativeEvent.locationX;
        const tw = trackWidthRef.current;
        const mn = minRef.current;
        const mx = maxRef.current;
        if (tw > 0 && mx > mn) {
          const newValue = valueFromXRef.current(evt.nativeEvent.locationX);
          onValueChangeRef.current(Math.max(mn, Math.min(mx, newValue)));
        }
      },
      onPanResponderMove: (_, gestureState) => {
        const tw = trackWidthRef.current;
        const mn = minRef.current;
        const mx = maxRef.current;
        if (tw <= 0 || mx <= mn) return;
        const currentX = startXRef.current + gestureState.dx;
        const newValue = valueFromXRef.current(currentX);
        onValueChangeRef.current(Math.max(mn, Math.min(mx, newValue)));
      },
      onPanResponderRelease: (_, gestureState) => {
        const tw = trackWidthRef.current;
        const mn = minRef.current;
        const mx = maxRef.current;
        if (tw <= 0 || mx <= mn) return;
        const finalX = startXRef.current + gestureState.dx;
        const newValue = valueFromXRef.current(finalX);
        onValueChangeRef.current(Math.max(mn, Math.min(mx, newValue)));
      },
    })
  ).current;

  const ratio = range > 0 ? (clampedValue - min) / range : 0;
  const thumbCenterX = trackWidth > 0 ? ratio * trackWidth : 0;
  const thumbLeft = thumbCenterX - THUMB_SIZE / 2;
  const fillWidth = trackWidth > 0 ? ratio * trackWidth + THUMB_SIZE / 2 : 0;

  return (
    <View>
      {showValue && (
        <View style={styles.valueRow}>
          <Text style={[styles.valueText, labelStyle]}>
            {clampedValue} {unitLabel}
          </Text>
        </View>
      )}
      <View
        style={[styles.track, trackStyle]}
        onLayout={(e: LayoutChangeEvent) =>
          setTrackWidth(e.nativeEvent.layout.width)
        }
        collapsable={false}
        {...panResponder.panHandlers}
      >
        {/* Full 0–10 mile track line (background rail) */}
        <View style={[styles.trackLine]} pointerEvents="none" />
        {/* Filled portion from 0 to current value */}
        <View style={[styles.fill, { width: fillWidth }, fillStyle]} />
        {/* Thumb (mile indicator) moves along the track line */}
        <View
          style={[styles.thumb, { left: thumbLeft }, thumbStyle]}
          pointerEvents="none"
        />
      </View>
      <View style={styles.labels}>
        <Text style={[styles.label, labelStyle]}>
          {min} {unitLabel}
        </Text>
        <Text style={[styles.label, labelStyle]}>
          {max} {unitLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valueRow: {
    marginBottom: 8,
  },
  valueText: {
    fontSize: 16,
    fontWeight: "600",
    color: c.white,
  },
  track: {
    height: TRACK_TOUCH_HEIGHT,
    justifyContent: "center",
    position: "relative",
    backgroundColor: "transparent",
  },
  trackLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: (TRACK_TOUCH_HEIGHT - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: (TRACK_TOUCH_HEIGHT - TRACK_HEIGHT) / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: c.blue600,
  },
  thumb: {
    position: "absolute",
    top: (TRACK_TOUCH_HEIGHT - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: c.white,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  label: {
    fontSize: 13,
    color: c.white,
    opacity: 0.9,
  },
});
