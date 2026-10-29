import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { LaundererServiceType } from "@/constants/launderers";
import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";
import { LandingHeroReveal } from "./landing-hero-reveal";
import { LandingHeroVisual } from "./landing-hero-visual";

const NAVBAR_HEIGHT = 72;

export type LandingPopularService = LaundererServiceType | "alterations";

const POPULAR_CHIPS: { label: string; tint: string; service: LandingPopularService }[] = [
  { label: "Tailoring", tint: UI.dealPink, service: "tailoring" },
  { label: "Laundry", tint: UI.blue, service: "washAndFold" },
  { label: "Ironing", tint: UI.amber, service: "press" },
  { label: "Alterations", tint: UI.purple, service: "alterations" },
  { label: "Dry Cleaning", tint: "#0EA5E9", service: "dryCleaning" },
];

/** Popular service chip — hover on web, opens provider selection on press. */
function PopularChip({
  label,
  tint,
  onPress,
}: {
  label: string;
  tint: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = hovered || pressed;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.chip,
        Platform.OS === "web" && styles.chipWeb,
        active && styles.chipHover,
        active && { borderColor: tint, shadowColor: tint },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${label} providers`}
    >
      <Text style={[styles.chipText, active && { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

type Props = {
  onSelectPopular: (service: LandingPopularService) => void;
};

/** Marketplace hero — matches the provided design screenshot. */
export function LandingHero({ onSelectPopular }: Props) {
  const { isWebDesktop: desktopMeasured, width: layoutWidth } = useResponsiveLayout();
  const { height: windowHeight } = useWindowDimensions();
  // On web reload, width can be 0 for a frame — keep desktop hero so the photo column
  // does not collapse into a broken stacked layout.
  const isWebDesktop =
    desktopMeasured || (Platform.OS === "web" && layoutWidth < 1);

  return (
    <View
      style={[
        styles.section,
        { minHeight: Math.max(520, Math.min(640, windowHeight - NAVBAR_HEIGHT)) },
      ]}
    >
      <LinearGradient
        colors={["#EAF3FF", "#F4F8FC", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.wash, styles.washA]} />
      <View style={[styles.wash, styles.washB]} />

      <LandingContainer
        // @ts-expect-error web className — CSS media query keeps desktop row on reload
        className="landing-hero-row"
        style={isWebDesktop ? styles.rowDesktop : undefined}
      >
        <View style={[styles.textCol, isWebDesktop && styles.textColDesktop]}>
          <LandingHeroReveal step={1}>
            <Text style={styles.eyebrow}>LOCAL SERVICES, MADE SIMPLE</Text>
          </LandingHeroReveal>
          <LandingHeroReveal step={2}>
            <Text style={styles.heading}>Find trusted service providers near you</Text>
          </LandingHeroReveal>
          <LandingHeroReveal step={3}>
            <Text style={styles.subtitle}>
              Tailoring, Laundry, Ironing and more — all in one place. Compare, contact and get it
              done, your way.
            </Text>
          </LandingHeroReveal>

          <LandingHeroReveal step={4} style={styles.chipRow}>
            <Text style={styles.popularLabel}>Popular:</Text>
            {POPULAR_CHIPS.map((chip) => (
              <PopularChip
                key={chip.label}
                label={chip.label}
                tint={chip.tint}
                onPress={() => onSelectPopular(chip.service)}
              />
            ))}
          </LandingHeroReveal>
        </View>

        <View
          // @ts-expect-error web className — reserves fixed photo column width
          className="landing-hero-image-col"
          style={[styles.imageCol, isWebDesktop && styles.imageColDesktop]}
        >
          <LandingHeroVisual />
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    overflow: "visible",
    justifyContent: "center",
    position: "relative",
  },
  wash: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(191, 219, 254, 0.35)",
  },
  washA: {
    width: 320,
    height: 320,
    left: -140,
    top: -80,
  },
  washB: {
    width: 220,
    height: 220,
    left: 40,
    bottom: -90,
    backgroundColor: "rgba(224, 231, 255, 0.4)",
  },
  rowDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 36,
  },
  textCol: {
    backgroundColor: "transparent",
    zIndex: 1,
    flexShrink: 1,
  },
  textColDesktop: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 480,
    paddingRight: 8,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: UI.muted,
    marginBottom: 14,
  },
  heading: {
    fontSize: 46,
    lineHeight: 54,
    fontWeight: "800",
    color: UI.purpleDeep,
    maxWidth: 520,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: UI.muted,
    marginTop: 14,
    maxWidth: 480,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 26,
    gap: 8,
  },
  popularLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.muted,
    marginRight: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  chipWeb: {
    cursor: "pointer",
    transitionProperty: "transform, box-shadow, border-color, background-color, color",
    transitionDuration: "220ms",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  } as object,
  chipHover: {
    backgroundColor: "#FFFFFF",
    transform: [{ translateY: -3 }, { scale: 1.06 }],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 10px 22px rgba(17, 24, 39, 0.12)" } as object)
      : null),
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.text,
    ...(Platform.OS === "web"
      ? ({
          transitionProperty: "color",
          transitionDuration: "220ms",
        } as object)
      : null),
  },
  imageCol: {
    alignItems: "center",
    marginTop: 32,
    width: "100%",
    minHeight: 440,
  },
  imageColDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 460,
    width: 460,
    minWidth: 460,
    maxWidth: 460,
    minHeight: 440,
    marginTop: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
