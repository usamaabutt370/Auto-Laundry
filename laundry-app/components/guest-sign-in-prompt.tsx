import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "@/components/bottom-tab-bar";
import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

const LIGHT = {
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  card: "#FFFFFF",
  border: "#E5E7EB",
};

export type GuestSignInPromptVariant = "chat" | "orders";

type GuestSignInPromptProps = {
  variant: GuestSignInPromptVariant;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPressLogin: () => void;
  appearance?: "dark" | "light";
};

function GuestArt({
  variant,
  light,
}: {
  variant: GuestSignInPromptVariant;
  light: boolean;
}) {
  const iconName =
    variant === "chat" ? "message-text-outline" : "clipboard-list-outline";

  return (
    <View style={styles.art} accessibilityElementsHidden>
      <View style={[styles.card, styles.cardBack, light && styles.cardLight]} />
      <View style={[styles.card, styles.cardFront, light && styles.cardLight]}>
        <MaterialCommunityIcons
          name={iconName}
          size={36}
          color={light ? LIGHT.teal : c.backgroundDark}
        />
      </View>
      <View style={[styles.badge, light && styles.badgeLight]}>
        <Text style={styles.badgeText}>?</Text>
      </View>
    </View>
  );
}

export function GuestSignInPrompt({
  variant,
  title,
  subtitle,
  buttonLabel,
  onPressLogin,
  appearance = "dark",
}: GuestSignInPromptProps) {
  const insets = useSafeAreaInsets();
  const light = appearance === "light";
  // Tab bar is absolute, so pad bottom so optical center matches the visible area.
  const bottomPad = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8);

  return (
    <View style={[styles.root, { paddingBottom: bottomPad }]}>
      <View style={styles.content}>
        <GuestArt variant={variant} light={light} />
        <Text style={[styles.title, light && styles.titleLight]}>{title}</Text>
        <Text style={[styles.subtitle, light && styles.subtitleLight]}>{subtitle}</Text>
        <Pressable
          onPress={onPressLogin}
          style={({ pressed }) => [
            styles.loginBtn,
            light && styles.loginBtnLight,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Text style={styles.loginLabel}>{buttonLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  content: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  art: {
    width: 140,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  card: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLight: {
    backgroundColor: LIGHT.card,
    borderColor: LIGHT.border,
  },
  cardBack: {
    width: 88,
    height: 72,
    left: 8,
    top: 8,
    opacity: 0.55,
    transform: [{ rotate: "-8deg" }],
  },
  cardFront: {
    width: 96,
    height: 80,
    right: 6,
    top: 18,
    transform: [{ rotate: "4deg" }],
  },
  badge: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.backgroundDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: c.white,
  },
  badgeLight: {
    backgroundColor: LIGHT.teal,
    borderColor: LIGHT.card,
  },
  badgeText: {
    color: c.white,
    fontSize: 18,
    fontWeight: "800",
  },
  title: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
    marginBottom: 8,
  },
  titleLight: {
    color: LIGHT.text,
  },
  subtitle: {
    fontSize: fs.xSmallText,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    marginBottom: 24,
  },
  subtitleLight: {
    color: LIGHT.muted,
  },
  loginBtn: {
    alignSelf: "stretch",
    backgroundColor: c.lightBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.filledButtonBorder,
  },
  loginBtnLight: {
    backgroundColor: LIGHT.teal,
    borderWidth: 0,
  },
  loginLabel: {
    color: c.white,
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
});
