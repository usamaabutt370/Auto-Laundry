import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";

const c = theme.colors;

const PERKS = [
  {
    icon: "home-heart" as const,
    title: "Work From Home",
    description: "Run your laundry business from your own home, on your terms.",
  },
  {
    icon: "clock-time-eight-outline" as const,
    title: "Flexible Hours",
    description: "Accept orders around your day — no fixed shifts required.",
  },
  {
    icon: "cash-multiple" as const,
    title: "Keep What You Earn",
    description: "Get paid for every order, with earnings tracked in your dashboard.",
  },
];

/**
 * Secondary section: invites housewives to become the Laundry Captains
 * that make the customer promise (gentle, trusted care) possible.
 */
export function LandingBecomeCaptain() {
  const router = useRouter();
  const { isWebDesktop } = useResponsiveLayout();

  return (
    <View style={styles.section}>
      <LandingContainer style={isWebDesktop ? styles.rowDesktop : undefined}>
        <View style={[styles.imageCol, isWebDesktop && styles.imageColDesktop]}>
          <View style={styles.imageBlobWrap}>
            <View style={styles.imageBlob} />
            <Image source={assets.onboarding.slide3} style={styles.image} contentFit="contain" />
          </View>
        </View>

        <View style={[styles.textCol, isWebDesktop && styles.textColDesktop]}>
          <View style={styles.eyebrowPill}>
            <MaterialCommunityIcons name="home-heart" size={14} color={c.outline} />
            <Text style={styles.eyebrow}>For Housewives</Text>
          </View>
          <Text style={styles.heading}>
            Are You A Housewife? Turn Spare Time Into{" "}
            <Text style={styles.headingAccent}>Real Income</Text>
          </Text>
          <Text style={styles.subtitle}>
            Every Tap2Laundry order is cared for by a Laundry Captain — a
            trained housewife earning from home on her own schedule.
            If that&apos;s you, we&apos;d love to have you.
          </Text>

          <View style={styles.perks}>
            {PERKS.map((perk) => (
              <View key={perk.title} style={styles.perkRow}>
                <View style={styles.perkIcon}>
                  <MaterialCommunityIcons name={perk.icon} size={20} color={c.white} />
                </View>
                <View style={styles.perkText}>
                  <Text style={styles.perkTitle}>{perk.title}</Text>
                  <Text style={styles.perkDescription}>{perk.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            onPress={() => router.push("/(auth)/welcome")}
            accessibilityRole="button"
            accessibilityLabel="Become a Laundry Captain"
          >
            <Text style={styles.btnText}>Become a Laundry Captain</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={c.themeBlack} />
          </Pressable>
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 56,
    backgroundColor: c.blue900,
    overflow: "hidden",
  },
  rowDesktop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 56,
  },
  imageCol: {
    alignItems: "center",
    backgroundColor: "transparent",
  },
  imageColDesktop: {
    flex: 0.9,
  },
  imageBlobWrap: {
    width: "100%",
    maxWidth: 340,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  imageBlob: {
    position: "absolute",
    width: "85%",
    height: "85%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textCol: {
    marginTop: 40,
    backgroundColor: "transparent",
  },
  textColDesktop: {
    flex: 1.1,
    marginTop: 0,
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: c.outline,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    color: c.white,
    marginBottom: 14,
  },
  headingAccent: {
    color: c.outline,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 25,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 24,
    maxWidth: 480,
  },
  perks: {
    gap: 16,
    marginBottom: 28,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  perkText: {
    flex: 1,
    backgroundColor: "transparent",
  },
  perkTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
    marginBottom: 2,
  },
  perkDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.75)",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: c.outline,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.themeBlack,
  },
  pressed: {
    opacity: 0.8,
  },
});
