import { StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import type { LaundererServiceType } from "@/constants/launderers";
import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";
import {
  LandingServiceCard,
  type LandingServiceCardData,
} from "./landing-service-card";

const SERVICES: LandingServiceCardData[] = [
  {
    title: "Tailoring",
    description: "Custom fits, alterations and stitching by skilled local tailors.",
    service: "tailoring",
    image: assets.images.home_category_tailoring,
    icon: "content-cut",
    colors: ["#FDF2F8", "#FCE7F3"],
    glow: ["#ffbc00", "#ff0058"],
    iconBg: "#FBCFE8",
    iconColor: UI.dealPink,
    variant: 1,
  },
  {
    title: "Laundry",
    description: "Wash & fold with careful handling and easy doorstep pickup.",
    service: "washAndFold",
    image: assets.images.home_deal_laundry,
    icon: "washing-machine",
    colors: ["#EFF6FF", "#DBEAFE"],
    glow: ["#03a9f4", "#ff0058"],
    iconBg: "#BFDBFE",
    iconColor: UI.blue,
    variant: 2,
  },
  {
    title: "Ironing",
    description: "Crisp, wrinkle-free finishes for daily wear and occasions.",
    service: "press",
    image: assets.images.home_category_ironing,
    icon: "iron",
    colors: ["#FFFBEB", "#FEF3C7"],
    glow: ["#4dff03", "#00d0ff"],
    iconBg: "#FDE68A",
    iconColor: UI.amber,
    variant: 3,
  },
  {
    title: "Dry Cleaning",
    description: "Suits, coats and delicates handled with specialist care.",
    service: "dryCleaning",
    image: assets.images.home_deal_laundry,
    icon: "hanger",
    colors: ["#ECFDF5", "#D1FAE5"],
    glow: ["#6D5CFF", "#22D3EE"],
    iconBg: "#A7F3D0",
    iconColor: UI.teal,
    variant: 4,
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
            <LandingServiceCard
              key={service.title}
              service={service}
              width={columns === 1 ? "100%" : `${100 / columns - 1.5}%`}
              onExplore={onExplore}
            />
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
    overflow: "visible",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    overflow: "visible",
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
});
