import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

const c = theme.colors;

const NAV_LINKS = [
  { label: "How It Works", anchor: "how-it-works" },
  { label: "Services", anchor: "services" },
  { label: "Earn From Home", anchor: "become-captain" },
];

type Props = {
  onNavigate?: (anchor: string) => void;
  scrolled?: boolean;
};

/** Transparent navbar that fades in a gradient background once the user scrolls. */
export function LandingHeader({ onNavigate, scrolled = false }: Props) {
  const router = useRouter();
  const { isWebDesktop, width } = useResponsiveLayout();
  const isCompact = width < 480;

  // 0 = top of page (transparent bg, dark text)
  // 1 = scrolled (gradient bg, white text)
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: scrolled ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [scrolled, progress]);

  const textColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#1a1a1a", "#ffffff"],
  });

  const signInBg = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0.06)", "rgba(255,255,255,0.18)"],
  });

  return (
    <View style={[styles.bar, isCompact && styles.barCompact]}>
      {/* Gradient layer fades in on scroll */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <LinearGradient
          colors={["#14536b", "#3b7f95", "#4aafc9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Logo */}
      <View style={styles.brand}>
        <Image
          source={assets.icons.app_icon}
          style={[styles.brandIcon, isCompact && styles.brandIconCompact]}
          contentFit="cover"
        />
        <Animated.Text
          style={[styles.logo, isCompact && styles.logoCompact, { color: textColor }]}
          numberOfLines={1}
        >
          Tap2Laundry
        </Animated.Text>
      </View>

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
              <Animated.Text style={[styles.navLink, { color: textColor }]}>
                {link.label}
              </Animated.Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={[styles.actions, isCompact && styles.actionsCompact]}>
        <Pressable
          style={({ pressed }) => [pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          <Animated.View
            style={[
              styles.signInBtn,
              isCompact && styles.btnCompact,
              { backgroundColor: signInBg },
            ]}
          >
            <Animated.Text style={[styles.signInText, isCompact && styles.btnTextCompact, { color: textColor }]}>
              Sign In
            </Animated.Text>
          </Animated.View>
        </Pressable>

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
            <Animated.Text
              style={[styles.signUpText, isCompact && styles.btnTextCompact]}
              numberOfLines={1}
            >
              {isCompact ? "Start" : "Get Started"}
            </Animated.Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    zIndex: 10,
  },
  barCompact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    backgroundColor: "transparent",
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandIconCompact: {
    width: 26,
    height: 26,
    borderRadius: 7,
  },
  logo: {
    fontSize: 23,
    fontWeight: "800",
    flexShrink: 1,
  },
  logoCompact: {
    fontSize: 16,
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
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionsCompact: {
    gap: 6,
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  signInText: {
    fontSize: 15,
    fontWeight: "600",
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
