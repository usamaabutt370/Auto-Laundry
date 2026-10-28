import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, type ComponentProps } from "react";
import { Platform, StyleSheet, Text, View, type ViewProps } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";

type FloatCard = {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  tint: string;
  bg: string;
};

export const HERO_FLOAT_CARDS: FloatCard[] = [
  { label: "Tailoring", icon: "content-cut", tint: UI.dealPink, bg: "#FCE7F3" },
  { label: "Laundry", icon: "tshirt-crew", tint: UI.blue, bg: "#DBEAFE" },
  { label: "Ironing", icon: "iron", tint: UI.amber, bg: UI.amberBg },
  { label: "More Services", icon: "view-grid", tint: UI.teal, bg: UI.mint },
];

function FloatCardView({ card }: { card: FloatCard }) {
  const [hovered, setHovered] = useState(false);
  const webHoverProps =
    Platform.OS === "web"
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as ViewProps)
      : null;

  return (
    <View
      {...webHoverProps}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.floatCard,
        Platform.OS === "web" && styles.floatCardWeb,
        hovered && styles.floatCardHover,
        hovered && { shadowColor: card.tint },
      ]}
    >
      <View
        style={[
          styles.floatIcon,
          { backgroundColor: card.bg },
          hovered && styles.floatIconHover,
        ]}
      >
        <MaterialCommunityIcons name={card.icon} size={hovered ? 16 : 15} color={card.tint} />
      </View>
      <Text style={styles.floatLabel}>{card.label}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={16}
        color={hovered ? card.tint : UI.muted}
      />
    </View>
  );
}

/** Native hero photo + decorative service pills. */
export function LandingHeroVisual() {
  return (
    <View style={styles.wrap}>
      <Image
        source={assets.hero.landingWomanPhone}
        style={styles.image}
        contentFit="cover"
        contentPosition="center"
      />
      <View style={styles.floatStack} pointerEvents="box-none">
        {HERO_FLOAT_CARDS.map((card) => (
          <FloatCardView key={card.label} card={card} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 460,
    height: 440,
    position: "relative",
    borderRadius: 28,
    backgroundColor: "#E8EEF6",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  floatStack: {
    position: "absolute",
    right: 12,
    top: 72,
    gap: 8,
    width: 176,
    zIndex: 2,
  },
  floatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.card,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: "rgba(17, 24, 39, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  floatCardWeb: {
    cursor: "default",
    transitionProperty: "transform, box-shadow, background-color",
    transitionDuration: "220ms",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  } as object,
  floatCardHover: {
    backgroundColor: "#FFFFFF",
    transform: [{ translateX: -8 }, { translateY: -2 }, { scale: 1.04 }],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  floatIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  floatIconHover: {
    transform: [{ scale: 1.1 }, { rotate: "-6deg" }],
  },
  floatLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: UI.text,
  },
});
