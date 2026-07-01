import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";

const c = theme.colors;

/** Top-of-page hero: the earn-from-home pitch, area-check bar, and illustration. */
export function LandingHero() {
  const router = useRouter();
  const { isWebDesktop } = useResponsiveLayout();
  const [area, setArea] = useState("");

  const handleCheckArea = () => {
    router.push("/(auth)/welcome");
  };

  return (
    <View style={styles.section}>
      <LandingContainer style={isWebDesktop ? styles.rowDesktop : undefined}>
        <View style={[styles.textCol, isWebDesktop && styles.textColDesktop]}>
          <View style={styles.eyebrowPill}>
            <MaterialCommunityIcons name="home-heart" size={14} color={c.background} />
            <Text style={styles.eyebrow}>Earn From Home</Text>
          </View>
          <Text style={styles.heading}>
            Turn Your Time At Home Into{" "}
            <Text style={styles.headingAccent}>Real Income</Text>
          </Text>
          <Text style={styles.subtitle}>
            <Text style={styles.subtitleBold}>Tap2Laundry</Text> helps women
            earn on their own schedule as Laundry Captains — taking wash &
            fold, dry cleaning, or tailoring orders from customers near home,
            at hours that work for you.
          </Text>

          <View style={styles.ctaRow}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => router.push("/(auth)/welcome")}
              accessibilityRole="button"
              accessibilityLabel="Become a Laundry Captain"
            >
              <Text style={styles.primaryBtnText}>Become a Laundry Captain</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={c.white} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={() => router.push("/(auth)/login")}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              <Text style={styles.secondaryBtnText}>Sign In</Text>
            </Pressable>
          </View>

          <View style={styles.addressBar}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={c.themeGray} />
            <TextInput
              style={styles.addressInput}
              placeholder="Enter your area to check demand"
              placeholderTextColor={c.themeGray}
              value={area}
              onChangeText={setArea}
            />
            <Pressable
              style={({ pressed }) => [styles.addressBtn, pressed && styles.pressed]}
              onPress={handleCheckArea}
              accessibilityRole="button"
              accessibilityLabel="Check my area"
            >
              <Text style={styles.addressBtnText}>Check</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/(auth)/sign-up")}
            accessibilityRole="button"
            accessibilityLabel="Need laundry done instead? Sign up as a customer"
            style={({ pressed }) => [styles.customerNudge, pressed && styles.pressed]}
          >
            <Text style={styles.customerNudgeText}>
              Need laundry done instead?{" "}
              <Text style={styles.customerNudgeLink}>Sign up as a customer →</Text>
            </Text>
          </Pressable>
        </View>

        <View style={[styles.imageCol, isWebDesktop && styles.imageColDesktop]}>
          <View style={styles.imageBlobWrap}>
            <View style={styles.imageBlob} />
            <Image source={assets.onboarding.slide3} style={styles.image} contentFit="contain" />
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
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "800",
    color: c.themeBlack,
  },
  headingAccent: {
    color: c.background,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    color: c.themeGray,
    marginTop: 18,
    maxWidth: 500,
  },
  subtitleBold: {
    fontWeight: "800",
    color: c.themeBlack,
  },
  ctaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 28,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: c.background,
    ...theme.shadow,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
  },
  secondaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.background,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.background,
  },
  addressBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    backgroundColor: c.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    maxWidth: 440,
    gap: 8,
    ...theme.shadow,
  },
  addressInput: {
    flex: 1,
    fontSize: 15,
    color: c.themeBlack,
    paddingVertical: 8,
  },
  addressBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: c.background,
  },
  addressBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.white,
  },
  customerNudge: {
    marginTop: 16,
  },
  customerNudgeText: {
    fontSize: 14,
    color: c.themeGray,
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
