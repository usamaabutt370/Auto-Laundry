import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";

const NAV_LINKS = [
  { label: "How It Works", anchor: "how-it-works" },
  { label: "Services", anchor: "services" },
  { label: "Earn From Home", anchor: "become-captain" },
];

type Props = {
  onNavigate?: (anchor: string) => void;
};

/** Sticky navbar — stays fixed at the top with the same dark gradient always applied. */
export function LandingHeader({ onNavigate }: Props) {
  const router = useRouter();
  const { isWebDesktop, width } = useResponsiveLayout();
  const isCompact = width < 480;

  const handleLogoPress = () => {
    if (Platform.OS === "web") {
      window.location.href = "/";
    } else {
      router.replace("/");
    }
  };

  return (
    <View style={[styles.bar, isCompact && styles.barCompact]}>
      <LinearGradient
        colors={["#14536b", "#3b7f95", "#4aafc9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <LandingContainer style={styles.barRow}>
        {/* Logo — sized as a wordmark: height-driven, width follows aspect ratio. */}
        <Pressable
          onPress={handleLogoPress}
          accessibilityRole="link"
          accessibilityLabel="Tap2Laundry Home"
        >
          <Image
            source={assets.icons.landing_logo_white}
            style={[styles.brandIcon, isCompact && styles.brandIconCompact]}
            contentFit="contain"
          />
        </Pressable>

        {/* Desktop nav links */}
        {isWebDesktop && (
          <View style={styles.nav}>
            {NAV_LINKS.map((link) => (
              <Pressable
                key={link.anchor}
                onPress={() => onNavigate?.(link.anchor)}
                style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={link.label}
              >
                <Text style={styles.navLink}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Action button */}
        <View style={[styles.actions, isCompact && styles.actionsCompact]}>
          <Pressable
            style={({ pressed }) => [pressed && styles.pressed]}
            onPress={() => router.push("/(auth)/sign-up")}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <LinearGradient
              colors={["#f9c74f", "#f4a124"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.signUpBtn, isCompact && styles.btnCompact]}
            >
              <Text
                style={[styles.signUpText, isCompact && styles.btnTextCompact]}
                numberOfLines={1}
              >
                {isCompact ? "Start" : "Get Started"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 24,
    // paddingVertical: 10,
    zIndex: 10,
  },
  barCompact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandIcon: {
    height: 70,
    aspectRatio: 3,
    flexShrink: 1,
  },
  brandIconCompact: {
    height: 40,
    aspectRatio: 3,
    flexShrink: 1,
  },
  nav: {
    flexDirection: "row",
    gap: 4,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navLink: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: "#ffffff",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionsCompact: {
    gap: 6,
  },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  signUpText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  btnCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  btnTextCompact: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
