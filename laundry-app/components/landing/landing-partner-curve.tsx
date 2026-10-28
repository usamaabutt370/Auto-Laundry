import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { UI } from "@/constants/theme";

type Props = {
  source: number;
  tall?: boolean;
};

/** Native soft-curve frame for the partner CTA portrait. */
export function LandingPartnerCurve({ source, tall }: Props) {
  return (
    <View style={[styles.frame, tall && styles.tall]}>
      <Image source={source} style={styles.image} contentFit="cover" contentPosition="top" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    maxWidth: 280,
    height: 220,
    overflow: "hidden",
    backgroundColor: UI.card,
    borderTopLeftRadius: 110,
    borderBottomLeftRadius: 130,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  tall: {
    maxWidth: 300,
    height: 240,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
