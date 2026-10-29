import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { LandingContainer } from "./landing-container";

const NAV_LINKS = [
  { label: "Home", anchor: "home" },
  { label: "For Providers", anchor: "become-captain" },
  { label: "Help", anchor: "help" },
];

type Props = {
  onNavigate?: (anchor: string) => void;
  cityLabel?: string;
};

/** Web nav link — Liquid morph hover (Prismic / CodePen WbeNvrr). */
function LiquidNavLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  if (Platform.OS === "web") {
    return (
      <button
        type="button"
        className="landing-nav-liquid"
        aria-label={label}
        onClick={onPress}
      >
        <span className="landing-nav-liquid-label">{label}</span>
      </button>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.navLink}>{label}</Text>
    </Pressable>
  );
}

/** Sticky white navbar for the web marketplace landing. */
export function LandingHeader({ onNavigate, cityLabel = "Lahore" }: Props) {
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
      <LandingContainer style={styles.barRow}>
        <Pressable
          onPress={handleLogoPress}
          accessibilityRole="link"
          accessibilityLabel="Tap2Laundry Home"
        >
          <Image
            source={assets.icons.landing_logo}
            style={[styles.brandIcon, isCompact && styles.brandIconCompact]}
            contentFit="contain"
          />
        </Pressable>

        {isWebDesktop ? (
          <View style={styles.nav}>
            {NAV_LINKS.map((link) => (
              <LiquidNavLink
                key={link.anchor}
                label={link.label}
                onPress={() => onNavigate?.(link.anchor)}
              />
            ))}
          </View>
        ) : null}

        <View style={[styles.actions, isCompact && styles.actionsCompact]}>
          {isWebDesktop ? (
            <View style={styles.cityChip}>
              <MaterialCommunityIcons name="map-marker" size={16} color={UI.blue} />
              <Text style={styles.cityText}>{cityLabel}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={UI.muted} />
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
            onPress={() => router.push("/(auth)/login")}
            accessibilityRole="button"
            accessibilityLabel="Login or Sign Up"
          >
            <Text style={[styles.loginText, isCompact && styles.loginTextCompact]} numberOfLines={1}>
              {isCompact ? "Login" : "Login / Sign Up"}
            </Text>
          </Pressable>
        </View>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: UI.card,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    zIndex: 10,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  barCompact: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandIcon: {
    height: 44,
    aspectRatio: 3,
    flexShrink: 1,
  },
  brandIconCompact: {
    height: 34,
    aspectRatio: 3,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navLink: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.text,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionsCompact: {
    gap: 6,
  },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.bg,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  cityText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: UI.blue,
  },
  loginText: {
    fontSize: 14,
    fontWeight: "700",
    color: UI.card,
  },
  loginTextCompact: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
