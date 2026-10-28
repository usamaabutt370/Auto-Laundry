import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import type { LaundererServiceType } from "@/constants/launderers";
import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";

type ServiceCard = {
  title: string;
  description: string;
  service: LaundererServiceType | null;
  image: number;
  icon: "content-cut" | "washing-machine" | "iron" | "hanger";
  colors: readonly [string, string];
  iconBg: string;
  iconColor: string;
};

const SERVICES: ServiceCard[] = [
  {
    title: "Tailoring",
    description: "Custom fits, alterations and stitching by skilled local tailors.",
    service: "tailoring",
    image: assets.images.home_category_tailoring,
    icon: "content-cut",
    colors: ["#FDF2F8", "#FCE7F3"],
    iconBg: "#FBCFE8",
    iconColor: UI.dealPink,
  },
  {
    title: "Laundry",
    description: "Wash & fold with careful handling and easy doorstep pickup.",
    service: "washAndFold",
    image: assets.images.home_deal_laundry,
    icon: "washing-machine",
    colors: ["#EFF6FF", "#DBEAFE"],
    iconBg: "#BFDBFE",
    iconColor: UI.blue,
  },
  {
    title: "Ironing",
    description: "Crisp, wrinkle-free finishes for daily wear and occasions.",
    service: "press",
    image: assets.images.home_category_ironing,
    icon: "iron",
    colors: ["#FFFBEB", "#FEF3C7"],
    iconBg: "#FDE68A",
    iconColor: UI.amber,
  },
  {
    title: "Dry Cleaning",
    description: "Suits, coats and delicates handled with specialist care.",
    service: "dryCleaning",
    image: assets.images.home_deal_laundry,
    icon: "hanger",
    colors: ["#ECFDF5", "#D1FAE5"],
    iconBg: "#A7F3D0",
    iconColor: UI.teal,
  },
];

type Props = {
  onExplore: (service: LaundererServiceType | null) => void;
};

export function LandingServices({ onExplore }: Props) {
  const { isWebDesktop, width } = useResponsiveLayout();
  const columns = isWebDesktop ? 4 : width >= 700 ? 2 : 1;

  return (
    <View style={styles.section}>
      <LandingContainer>
        <Text style={styles.heading}>Popular services</Text>
        <Text style={styles.subheading}>Everything your wardrobe needs, nearby.</Text>

        <View style={styles.grid}>
          {SERVICES.map((service) => (
            <Pressable
              key={service.title}
              onPress={() => onExplore(service.service)}
              style={({ pressed }) => [
                styles.cardWrap,
                { width: columns === 1 ? "100%" : `${100 / columns - 1.5}%` },
                pressed && styles.pressed,
              ]}
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
                  <MaterialCommunityIcons
                    name={service.icon}
                    size={20}
                    color={service.iconColor}
                  />
                </View>
                <Text style={styles.cardTitle}>{service.title}</Text>
                <Text style={styles.cardDescription}>{service.description}</Text>
                <View style={styles.exploreRow}>
                  <Text style={[styles.explore, { color: service.iconColor }]}>Explore</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={16}
                    color={service.iconColor}
                  />
                </View>
                <Image source={service.image} style={styles.cardImage} contentFit="cover" />
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    backgroundColor: UI.card,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.text,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: UI.muted,
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
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
