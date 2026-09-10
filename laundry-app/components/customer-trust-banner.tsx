import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";

const c = theme.colors;

type CustomerTrustBannerProps = {
  verified?: boolean;
  onPressChat?: () => void;
  appearance?: "dark" | "light";
};

export function CustomerTrustBanner({
  verified = false,
  onPressChat,
  appearance = "dark",
}: CustomerTrustBannerProps) {
  const { locale } = useLocale();
  const message = getStrings(locale).customer.trustBanner.message;
  const light = appearance === "light";

  if (!verified) return null;

  const content = (
    <>
      <MaterialCommunityIcons
        name="shield-check"
        size={20}
        color={light ? "#12B886" : c.outline}
        style={styles.icon}
      />
      <Text style={[styles.text, light && styles.textLight]}>{message}</Text>
    </>
  );

  if (onPressChat) {
    return (
      <Pressable
        onPress={onPressChat}
        style={({ pressed }) => [
          styles.banner,
          light && styles.bannerLight,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={message}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.banner, light && styles.bannerLight]}>{content}</View>;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.35)",
    backgroundColor: "rgba(171, 233, 254, 0.08)",
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: c.white,
    fontWeight: "500",
  },
  bannerLight: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  textLight: {
    color: "#047857",
    fontFamily: "Poppins-Regular",
  },
});
