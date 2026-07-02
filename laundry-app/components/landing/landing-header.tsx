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
  const { isWebDesktop } = useResponsiveLayout();

  return (
    <View style={styles.bar}>
      <View style={styles.brand}>
        <Image source={assets.icons.app_icon} style={styles.brandIcon} contentFit="cover" />
        <Text style={styles.logo}>Tap2Laundry</Text>
      </View>

      {isWebDesktop && (
        <View style={styles.nav}>
          {NAV_LINKS.map((link) => (
            <Pressable key={link.anchor} onPress={() => onNavigate?.(link.anchor)}>
              <Text style={styles.navLink}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.signUpBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/sign-up")}
          accessibilityRole="button"
          accessibilityLabel="Get Started"
        >
          <Text style={styles.signUpText}>Get Started</Text>
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
    backgroundColor: c.white,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "transparent",
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logo: {
    fontSize: 23,
    fontWeight: "800",
    color: c.background,
  },
  nav: {
    flexDirection: "row",
    gap: 28,
  },
  navLink: {
    fontSize: 16,
    fontWeight: "600",
    color: c.themeBlack,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.background,
  },
  signInText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.background,
  },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: c.background,
  },
  signUpText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.white,
  },
  pressed: {
    opacity: 0.8,
  },
});
