import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_HEIGHT } from "@/components/bottom-tab-bar";
import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

export type GuestSignInPromptVariant = "chat" | "orders";

type GuestSignInPromptProps = {
  variant: GuestSignInPromptVariant;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPressLogin: () => void;
};

function GuestArt({ variant }: { variant: GuestSignInPromptVariant }) {
  const iconName =
    variant === "chat" ? "message-text-outline" : "clipboard-list-outline";

  return (
    <View style={styles.art} accessibilityElementsHidden>
      <View style={[styles.card, styles.cardBack]} />
      <View style={[styles.card, styles.cardFront]}>
        <MaterialCommunityIcons name={iconName} size={36} color={c.backgroundDark} />
      </View>
      <View style={styles.badge}>
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
}: GuestSignInPromptProps) {
  const insets = useSafeAreaInsets();
  // Tab bar is absolute, so pad bottom so optical center matches the visible area.
  const bottomPad = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8);

  return (
    <View style={[styles.root, { paddingBottom: bottomPad }]}>
      <View style={styles.content}>
        <GuestArt variant={variant} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Pressable
          onPress={onPressLogin}
          style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
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
  badgeText: {
    color: c.white,
    fontSize: 18,
    fontWeight: "800",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fs.xSmallText,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    marginBottom: 24,
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
  loginLabel: {
    color: c.white,
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
});
