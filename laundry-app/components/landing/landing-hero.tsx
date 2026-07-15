import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { trackMetaEvent } from "@/lib/meta-pixel";
import { LandingContainer } from "./landing-container";

const c = theme.colors;
const NAVBAR_HEIGHT = 72;
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.autolaundry.app&hl=en";

/** Top-of-page hero: the customer pitch — gentle, trusted laundry care. */
export function LandingHero() {
  const router = useRouter();
  const { isWebDesktop } = useResponsiveLayout();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <View style={[styles.section, { minHeight: windowHeight - NAVBAR_HEIGHT }]}>
      <LandingContainer style={isWebDesktop ? styles.rowDesktop : undefined}>
        <View style={[styles.textCol, isWebDesktop && styles.textColDesktop]}>
          <View style={styles.eyebrowPill}>
            <MaterialCommunityIcons name="hand-heart-outline" size={14} color={c.background} />
            <Text style={styles.eyebrow}>Gentle, Trusted Laundry Care</Text>
          </View>
          <Text style={styles.heading}>
            Clothes Deserve Care,{" "}
            <Text style={styles.headingAccent}>Not Rough Handling</Text>
          </Text>
          <Text style={styles.subtitle}>
            Trusted housewives wash and fold your clothes with the care
            they&apos;d give their own family&apos;s laundry.
          </Text>

          {/* App download offer */}
          <View style={styles.downloadCard}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>LIMITED OFFER</Text>
            </View>
            <Text style={styles.offerHeading}>
              🎉 Get <Text style={styles.offerAccent}>20% off</Text> your first order
            </Text>
            <Text style={styles.offerSub}>
              Download the app and use code <Text style={styles.offerCode}>FIRST20</Text> at checkout.
            </Text>
            <View style={styles.downloadRow}>
              <Pressable
                style={({ pressed }) => [pressed && styles.pressed]}
                onPress={() => trackMetaEvent("ClickAppStore")}
                accessibilityRole="link"
                accessibilityLabel="Download on the App Store"
              >
                <LinearGradient
                  colors={["#1c1c1e", "#2c2c2e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storeBadge}
                >
                  <MaterialCommunityIcons name="apple" size={26} color={c.white} />
                  <View>
                    <Text style={styles.badgeSmall}>Download on the</Text>
                    <Text style={styles.badgeBig}>App Store</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={({ pressed }) => [pressed && styles.pressed]}
                onPress={() => {
                  trackMetaEvent("ClickPlayStore");
                  Linking.openURL(GOOGLE_PLAY_URL);
                }}
                accessibilityRole="link"
                accessibilityLabel="Get it on Google Play"
              >
                <LinearGradient
                  colors={["#1c1c1e", "#2c2c2e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storeBadge}
                >
                  <MaterialCommunityIcons name="google-play" size={22} color={c.white} />
                  <View>
                    <Text style={styles.badgeSmall}>Get it on</Text>
                    <Text style={styles.badgeBig}>Google Play</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.imageCol, isWebDesktop && styles.imageColDesktop]}>
          <View style={styles.imageBlobWrap}>
            <View style={styles.imageBlob} />
            <Image source={assets.hero.laundryCare} style={styles.image} contentFit="contain" />
          </View>
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    backgroundColor: c.themeWhite,
    overflow: "hidden",
    justifyContent: "center",
  },
  rowDesktop: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 24,
    gap: 40,
  },
  textCol: {
    backgroundColor: "transparent",
  },
  textColDesktop: {
    flex: 1.05,
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: c.blue500,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: c.background,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: "800",
    color: c.themeBlack,
  },
  headingAccent: {
    color: c.background,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 30,
    color: c.themeBlack,
    marginTop: 18,
    maxWidth: 520,
  },
  subtitleBold: {
    fontWeight: "800",
    color: c.themeBlack,
  },
  downloadCard: {
    marginTop: 28,
    backgroundColor: c.white,
    borderRadius: 20,
    padding: 20,
    maxWidth: 440,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...theme.shadow,
  },
  offerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fff3cd",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  offerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#b45309",
    letterSpacing: 1,
  },
  offerHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: c.themeBlack,
    marginBottom: 6,
  },
  offerAccent: {
    color: "#e67e22",
    fontWeight: "800",
  },
  offerSub: {
    fontSize: 13,
    color: c.themeBlack,
    marginBottom: 16,
    lineHeight: 19,
  },
  offerCode: {
    fontWeight: "700",
    color: c.themeBlack,
    backgroundColor: "#f0f0f0",
  },
  downloadRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 150,
  },
  badgeSmall: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "400",
    lineHeight: 14,
  },
  badgeBig: {
    fontSize: 16,
    color: c.white,
    fontWeight: "700",
    lineHeight: 20,
  },
  customerNudge: {
    marginTop: 20,
  },
  customerNudgeText: {
    fontSize: 14,
    color: c.themeBlack,
  },
  customerNudgeLink: {
    fontWeight: "700",
    color: c.background,
  },
  pressed: {
    opacity: 0.8,
  },
  imageCol: {
    alignItems: "center",
    marginTop: 40,
    backgroundColor: "transparent",
  },
  imageColDesktop: {
    flex: 0.95,
    marginTop: 0,
  },
  imageBlobWrap: {
    width: "100%",
    maxWidth: 400,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  imageBlob: {
    position: "absolute",
    width: "88%",
    height: "88%",
    borderRadius: 999,
    backgroundColor: c.blue500,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
