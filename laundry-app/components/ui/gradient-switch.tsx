import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { gradients } from "@/constants/theme";

const TRACK_W = 52;
const TRACK_H = 32;
const THUMB = 26;

type GradientSwitchProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function GradientSwitch({
  value,
  onValueChange,
  disabled = false,
}: GradientSwitchProps) {
  const thumb = <View style={styles.thumb} />;

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={disabled && styles.disabled}
    >
      {value ? (
        <LinearGradient
          colors={gradients.cta}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.track, styles.trackOn]}
        >
          {thumb}
        </LinearGradient>
      ) : (
        <View style={[styles.track, styles.trackOff]}>{thumb}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  trackOn: {
    alignItems: "flex-end",
  },
  trackOff: {
    alignItems: "flex-start",
    backgroundColor: "#E5E7EB",
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#FFFFFF",
  },
  disabled: {
    opacity: 0.45,
  },
});
