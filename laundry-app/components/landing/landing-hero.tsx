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

/** Top-of-page hero: the customer pitch — gentle, trusted laundry care. */
export function LandingHero() {
  const router = useRouter();
  const { isWebDesktop } = useResponsiveLayout();
  const [address, setAddress] = useState("");

  const handleCheckAddress = () => {
    router.push("/(auth)/sign-up");
  };

  return (
    <View style={styles.section}>
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
            Too many commercial launderers rush your clothes through rough
            machines and damage them. <Text style={styles.subtitleBold}>Tap2Laundry</Text>{" "}
            is different — we onboard trusted, trained housewives to wash,
            fold, and care for your laundry the way they&apos;d treat their
            own family&apos;s clothes.
          </Text>

          <View style={styles.ctaRow}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => router.push("/(auth)/sign-up")}
              accessibilityRole="button"
              accessibilityLabel="Book Your Pickup"
            >
              <Text style={styles.primaryBtnText}>Book Your Pickup</Text>
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
              placeholder="Enter your pickup address"
              placeholderTextColor={c.themeGray}
              value={address}
              onChangeText={setAddress}
            />
            <Pressable
              style={({ pressed }) => [styles.addressBtn, pressed && styles.pressed]}
              onPress={handleCheckAddress}
              accessibilityRole="button"
              accessibilityLabel="Check availability"
            >
              <Text style={styles.addressBtnText}>Check</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/(auth)/welcome")}
            accessibilityRole="button"
            accessibilityLabel="Are you a housewife? Become a Laundry Captain"
            style={({ pressed }) => [styles.customerNudge, pressed && styles.pressed]}
          >
            <Text style={styles.customerNudgeText}>
              Are you a housewife looking to earn from home?{" "}
              <Text style={styles.customerNudgeLink}>Become a Laundry Captain →</Text>
            </Text>
          </Pressable>
        </View>

        <View style={[styles.imageCol, isWebDesktop && styles.imageColDesktop]}>
          <View style={styles.imageBlobWrap}>
            <View style={styles.imageBlob} />
            <Image source={assets.onboarding.slide1} style={styles.image} contentFit="contain" />
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
