import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { UI } from "@/constants/theme";

type Kind = "tailor" | "towels" | "iron";

type Props = {
  kind: Kind;
  source: number;
  style: StyleProp<ViewStyle>;
};

/** Native fallback for promo photo frames (soft ovals). */
export function LandingPromoBlob({ kind, source, style }: Props) {
  return (
    <View
      style={[
        styles.frame,
        kind === "tailor" && styles.tailor,
        kind === "towels" && styles.towels,
        kind === "iron" && styles.iron,
        style,
      ]}
    >
      <Image source={source} style={styles.image} contentFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 5,
    borderColor: UI.card,
    backgroundColor: UI.card,
  },
  tailor: { borderRadius: 96 },
  towels: { borderRadius: 64 },
  iron: {
    borderTopLeftRadius: 52,
    borderTopRightRadius: 44,
    borderBottomRightRadius: 60,
    borderBottomLeftRadius: 48,
  },
  image: { width: "100%", height: "100%" },
});
