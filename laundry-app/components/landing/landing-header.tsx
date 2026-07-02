import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

const c = theme.colors;

const NAV_LINKS = [
  { label: "How It Works", anchor: "how-it-works" },
  { label: "Services", anchor: "services" },
  { label: "Why Us", anchor: "why-choose-us" },
  { label: "Earn From Home", anchor: "become-captain" },
];

type Props = {
  /** Scrolls the landing page to a named section (desktop nav links). */
  onNavigate?: (anchor: string) => void;
};

/** Sticky-feel top bar: logo, desktop nav links, and Sign In / Get Started CTAs. */
export function LandingHeader({ onNavigate }: Props) {
  const router = useRouter();
  const { isWebDesktop, width } = useResponsiveLayout();
  const isCompact = width < 480;

  return (
    <View style={[styles.bar, isCompact && styles.barCompact]}>
      <View style={styles.brand}>
        <Image
          source={assets.icons.app_icon}
          style={[styles.brandIcon, isCompact && styles.brandIconCompact]}
          contentFit="cover"
        />
        <Text
          style={[styles.logo, isCompact && styles.logoCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          Tap2Laundry
        </Text>
      </View>

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

      <View style={[styles.actions, isCompact && styles.actionsCompact]}>
        <Pressable
          style={({ pressed }) => [
            styles.signInBtn,
            isCompact && styles.btnCompact,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          <Text style={[styles.signInText, isCompact && styles.btnTextCompact]}>Sign In</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.signUpBtn,
            isCompact && styles.btnCompact,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push("/(auth)/sign-up")}
          accessibilityRole="button"
          accessibilityLabel="Get Started"
        >
          <Text style={[styles.signUpText, isCompact && styles.btnTextCompact]} numberOfLines={1}>
            {isCompact ? "Start" : "Get Started"}
          </Text>
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
    backgroundColor: c.background,
    ...theme.shadow,
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
    color: c.white,
    flexShrink: 1,
  },
  logoCompact: {
    fontSize: 16,
  },
  nav: {
    flexDirection: "row",
    gap: 10,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  navLink: {
    fontSize: 15,
    fontWeight: "700",
    color: c.white,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionsCompact: {
    gap: 6,
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  signInText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.white,
  },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: c.white,
  },
  signUpText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.background,
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
