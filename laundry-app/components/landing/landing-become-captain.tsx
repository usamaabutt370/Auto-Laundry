import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";

const c = theme.colors;

export function LandingBecomeCaptain() {
  const router = useRouter();
  const { isWebDesktop } = useResponsiveLayout();

  return (
    <View style={styles.section}>
      <LandingContainer style={isWebDesktop ? styles.rowDesktop : undefined}>
        <View style={[styles.textCol, isWebDesktop && styles.textColDesktop]}>
          <View style={styles.eyebrowPill}>
            <MaterialCommunityIcons name="home-heart" size={13} color={c.background} />
            <Text style={styles.eyebrow}>For Housewives</Text>
          </View>
          <Text style={styles.heading}>
            Are You A Housewife?{"\n"}Turn Spare Time Into{" "}
            <Text style={styles.headingAccent}>Real Income</Text>
          </Text>
          <Text style={styles.subtitle}>
            Join hundreds of Laundry Captains earning from home — on your own schedule, from your own kitchen.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            onPress={() => router.push("/(auth)/welcome")}
            accessibilityRole="button"
            accessibilityLabel="Become a Laundry Captain"
          >
            <Text style={styles.btnText}>Become a Laundry Captain</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={c.white} />
          </Pressable>
        </View>

        <View style={[styles.imageCol, isWebDesktop && styles.imageColDesktop]}>
          <Image source={assets.hero.becomeCaptain} style={styles.image} contentFit="cover" />
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "rgba(20,83,107,0.06)",
    paddingVertical: 64,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  rowDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 64,
  },
  textCol: {
    backgroundColor: "transparent",
  },
  textColDesktop: {
    flex: 1.1,
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(20,83,107,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: c.background,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "800",
    color: c.themeBlack,
    marginBottom: 16,
  },
  headingAccent: {
    color: c.background,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    color: c.themeBlack,
    marginBottom: 28,
    maxWidth: 480,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: c.background,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
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
    flex: 0.9,
    marginTop: 0,
  },
  image: {
    width: "100%",
    maxWidth: 480,
    aspectRatio: 1680 / 944,
    borderRadius: 24,
  },
});
