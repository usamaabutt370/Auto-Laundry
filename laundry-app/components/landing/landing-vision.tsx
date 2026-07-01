import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";

const c = theme.colors;

/** "Our Vision" — image + mission statement. */
export function LandingVision() {
  const router = useRouter();
  const { isWebDesktop } = useResponsiveLayout();

  return (
    <View style={styles.section}>
      <LandingContainer style={isWebDesktop ? styles.rowDesktop : undefined}>
        <View style={[styles.imageCol, isWebDesktop && styles.imageColDesktop]}>
          <View style={styles.imageBlobWrap}>
            <View style={styles.imageBlob} />
            <Image source={assets.onboarding.slide2} style={styles.image} contentFit="contain" />
          </View>
        </View>

        <View style={[styles.textCol, isWebDesktop && styles.textColDesktop]}>
          <Text style={styles.kicker}>
            Our <Text style={styles.kickerAccent}>Vision</Text>
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.paragraphBold}>Tap2Laundry</Text> was built
            around a simple idea: women who are home shouldn&apos;t have to
            choose between being there for their family and earning their own
            income. Our Laundry Captains run their business from home, on
            their own schedule.
          </Text>
          <Text style={styles.paragraph}>
            Every order moves through the same simple loop: collect, clean,
            deliver — so nearby customers get trusted, local laundry care
            while Captains earn from the comfort of home.
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
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 56,
    backgroundColor: c.white,
    overflow: "hidden",
  },
  rowDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 64,
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
    backgroundColor: c.blue500,
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
  kicker: {
    fontSize: 36,
    fontWeight: "800",
    color: c.themeBlack,
    marginBottom: 18,
  },
  kickerAccent: {
    color: c.background,
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 27,
    color: c.themeGray,
    marginBottom: 14,
    maxWidth: 500,
  },
  paragraphBold: {
    fontWeight: "800",
    color: c.themeBlack,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: c.background,
    ...theme.shadow,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
  },
  pressed: {
    opacity: 0.8,
  },
});
