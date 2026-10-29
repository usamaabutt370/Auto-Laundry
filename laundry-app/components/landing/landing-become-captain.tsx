import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";
import { LandingPartnerCurve } from "./landing-partner-curve";
import { LandingBecomeCaptain as LandingBecomeCaptainWeb } from "./landing-become-captain-web";

const BENEFITS = [
  { label: "Reach nearby customers", icon: "map-marker" as const, color: UI.blue },
  { label: "Showcase your services", icon: "camera-outline" as const, color: UI.dealPink },
  { label: "Manage enquiries", icon: "message-outline" as const, color: UI.teal },
  { label: "Grow your business", icon: "chart-line" as const, color: UI.green },
];

export function LandingBecomeCaptain() {
  if (Platform.OS === "web") {
    return <LandingBecomeCaptainWeb />;
  }
  return <LandingBecomeCaptainNative />;
}

function LandingBecomeCaptainNative() {
  const router = useRouter();
  const { isWebDesktop } = useResponsiveLayout();

  return (
    <View style={styles.section}>
      <LandingContainer style={isWebDesktop ? styles.rowDesktop : undefined}>
        <View style={[styles.textCol, isWebDesktop && styles.textColDesktop]}>
          <Text style={styles.heading}>Turn your skills into income</Text>
          <Text style={styles.subtitle}>
            Offer your services to customers near you and grow your business with Tap2Laundry.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            onPress={() => router.push("/(auth)/welcome")}
            accessibilityRole="button"
            accessibilityLabel="Become a Tap2Laundry Partner"
          >
            <Text style={styles.btnText}>Become a Tap2Laundry Partner</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={UI.card} />
          </Pressable>
        </View>

        <View style={[styles.checklist, isWebDesktop && styles.checklistDesktop]}>
          {BENEFITS.map((item) => (
            <View key={item.label} style={styles.checkRow}>
              <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
              <Text style={styles.checkText}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.imageCol, isWebDesktop && styles.imageColDesktop]}>
          <LandingPartnerCurve source={assets.hero.becomeCaptain} tall={isWebDesktop} />
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: UI.card,
    paddingVertical: 28,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  rowDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 56,
  },
  textCol: {
    backgroundColor: "transparent",
  },
  textColDesktop: {
    flex: 1.15,
    maxWidth: 340,
    marginRight: 24,
  },
  heading: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: UI.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: UI.muted,
    marginBottom: 16,
    maxWidth: 320,
  },
  btn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.blue,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
  },
  btnText: {
    color: UI.card,
    fontWeight: "700",
    fontSize: 14,
  },
  checklist: {
    gap: 6,
    marginTop: 20,
  },
  checklistDesktop: {
    flex: 0.85,
    marginTop: 0,
    gap: 6,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.muted,
  },
  imageCol: {
    marginTop: 20,
    alignItems: "center",
  },
  imageColDesktop: {
    flex: 1,
    marginTop: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
