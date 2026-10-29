import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";
import { LandingPromoBlob } from "./landing-promo-blob";
import { LandingPromoBanner as LandingPromoBannerWeb } from "./landing-promo-banner-web";

type Props = {
  onExplore: () => void;
};

/**
 * "Quality services in your neighborhood" — matches the mock:
 * soft blue→lavender wash, Explore CTA + arrow, dots, organic photo blobs.
 */
export function LandingPromoBanner({ onExplore }: Props) {
  if (Platform.OS === "web") {
    return <LandingPromoBannerWeb onExplore={onExplore} />;
  }
  return <LandingPromoBannerNative onExplore={onExplore} />;
}

function LandingPromoBannerNative({ onExplore }: Props) {
  const { isWebDesktop, width } = useResponsiveLayout();
  const showArt = isWebDesktop || width >= 720;

  return (
    <View style={styles.section}>
      <LandingContainer>
        <LinearGradient
          colors={["#D8E8FE", "#E2EBFF", "#E9E4FF", "#F1E7FF"]}
          locations={[0, 0.4, 0.75, 1]}
          start={{ x: 0, y: 0.45 }}
          end={{ x: 1, y: 0.55 }}
          style={styles.banner}
        >
          <View style={[styles.wash, styles.washLeft]} />
          <View style={[styles.wash, styles.washMid]} />
          <View style={[styles.wash, styles.washRight]} />

          <View style={[styles.copy, !showArt && styles.copyFull]}>
            <Text style={styles.title}>Quality services in your neighborhood</Text>
            <Text style={styles.subtitle}>
              From expert tailors to trusted laundry shops, get the services you need from local
              professionals.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
              onPress={onExplore}
              accessibilityRole="button"
              accessibilityLabel="Explore services"
            >
              <Text style={styles.btnText}>Explore Services</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color={UI.card} />
            </Pressable>
            <View style={styles.dots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>
          </View>

          {showArt ? (
            <View style={styles.art} pointerEvents="none">
              <View style={styles.artGlow} />
              <LandingPromoBlob
                kind="tailor"
                source={assets.images.home_category_tailoring}
                style={styles.frameTailor}
              />
              <LandingPromoBlob
                kind="towels"
                source={assets.images.home_deal_laundry}
                style={styles.frameTowels}
              />
              <LandingPromoBlob
                kind="iron"
                source={assets.images.home_category_ironing}
                style={styles.frameIron}
              />
            </View>
          ) : null}
        </LinearGradient>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: UI.card,
  },
  banner: {
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    minHeight: 220,
    position: "relative",
    gap: 12,
  },
  wash: {
    position: "absolute",
    borderRadius: 999,
  },
  washLeft: {
    width: 280,
    height: 280,
    left: -100,
    top: -50,
    backgroundColor: "rgba(186, 214, 255, 0.55)",
  },
  washMid: {
    width: 200,
    height: 200,
    left: "42%",
    bottom: -70,
    backgroundColor: "rgba(214, 222, 255, 0.45)",
  },
  washRight: {
    width: 340,
    height: 340,
    right: -110,
    top: -120,
    backgroundColor: "rgba(230, 210, 255, 0.5)",
  },
  copy: {
    flex: 1,
    zIndex: 2,
    maxWidth: 400,
    paddingRight: 8,
  },
  copyFull: {
    maxWidth: "100%",
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: UI.purpleDeep,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI.muted,
    marginBottom: 14,
    maxWidth: 340,
  },
  btn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: UI.blue,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnText: {
    color: UI.card,
    fontWeight: "700",
    fontSize: 13,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(47, 107, 255, 0.28)",
  },
  dotActive: {
    backgroundColor: UI.blue,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  art: {
    width: 340,
    height: 168,
    position: "relative",
    flexShrink: 0,
    zIndex: 1,
    marginLeft: "auto",
  },
  artGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: 8,
    top: -28,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  frameTailor: {
    width: 128,
    height: 156,
    left: 0,
    top: 4,
    zIndex: 2,
  },
  frameTowels: {
    width: 120,
    height: 94,
    left: 122,
    top: 6,
    zIndex: 3,
  },
  frameIron: {
    width: 88,
    height: 132,
    right: 0,
    top: 22,
    zIndex: 4,
  },
  pressed: {
    opacity: 0.88,
  },
});
