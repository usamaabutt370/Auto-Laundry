import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

const CAPSULE_RADIUS = 32;

/**
 * Frosted capsule fill. Keep this view free of shadows and opacity — those
 * flatten the layer so UIVisualEffectView samples white instead of the screen.
 */
export function GlassTabBarBackground() {
  if (Platform.OS !== "ios") {
    return <View pointerEvents="none" style={styles.androidFallback} />;
  }

  return (
    <BlurView
      pointerEvents="none"
      tint="systemUltraThinMaterialLight"
      intensity={100}
      style={styles.blur}
    />
  );
}

const styles = StyleSheet.create({
  blur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CAPSULE_RADIUS,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  androidFallback: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CAPSULE_RADIUS,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
});
