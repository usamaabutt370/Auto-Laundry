import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LaundererServiceType } from "@/constants/launderers";
import { UI } from "@/constants/theme";

export type LandingServiceCardData = {
  title: string;
  description: string;
  service: LaundererServiceType | null;
  image: number;
  icon: "content-cut" | "washing-machine" | "iron" | "hanger";
  colors: readonly [string, string];
  glow: readonly [string, string];
  iconBg: string;
  iconColor: string;
  /** 1–4 maps to CSS gradient variants on web. */
  variant: 1 | 2 | 3 | 4;
};

type Props = {
  service: LandingServiceCardData;
  width: string | number;
  onExplore: (service: LaundererServiceType | null) => void;
};

/** Native service card (no glassmorphism glow). */
export function LandingServiceCard({ service, width, onExplore }: Props) {
  return (
    <Pressable
      onPress={() => onExplore(service.service)}
      style={({ pressed }) => [styles.cardWrap, { width }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Explore ${service.title}`}
    >
      <LinearGradient
        colors={[...service.colors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={[styles.iconWell, { backgroundColor: service.iconBg }]}>
          <MaterialCommunityIcons name={service.icon} size={20} color={service.iconColor} />
        </View>
        <Text style={styles.cardTitle}>{service.title}</Text>
        <Text style={styles.cardDescription}>{service.description}</Text>
        <View style={styles.exploreRow}>
          <Text style={[styles.explore, { color: service.iconColor }]}>Explore</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={service.iconColor} />
        </View>
        <Image source={service.image} style={styles.cardImage} contentFit="cover" />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    minWidth: 220,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    minHeight: 220,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: UI.border,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: UI.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: UI.muted,
    maxWidth: "68%",
    marginBottom: 16,
  },
  exploreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  explore: {
    fontWeight: "700",
    fontSize: 14,
  },
  cardImage: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 118,
    height: 118,
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.92,
  },
});
