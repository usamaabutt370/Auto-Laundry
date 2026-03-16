import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

const CARD_RADIUS = 16;

/** Right-side icon for order card (e.g. delivery type or bag). */
export type OrderCardRightIcon = "scooter" | "bag" | "none";

export interface OrderCardProps {
  /** Customer or contact name. */
  customerName: string;
  /** Letter shown in avatar (e.g. first initial). Defaults to first char of customerName. */
  initial?: string;
  /** Subtitle line (e.g. "Requested a Pick-up on April 6th at 10am"). */
  subtitle: string;
  /** Optional icon on the right. */
  rightIcon?: OrderCardRightIcon;
  /** Optional press handler; when set, card is pressable. */
  onPress?: () => void;
  /** Optional style for the card container. */
  style?: ComponentProps<typeof View>["style"];
  /** Minimum height of the card. */
  minHeight?: number;
}

/**
 * Reusable order card: avatar, name, subtitle, optional right icon.
 * Light card background with black text.
 */
export function OrderCard({
  customerName,
  initial,
  subtitle,
  rightIcon = "none",
  onPress,
  style,
  minHeight = 80,
}: OrderCardProps) {
  const initialChar =
    initial ?? (customerName.trim()[0]?.toUpperCase() ?? "?");

  const content = (
    <>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialChar}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.customerName}>{customerName}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {rightIcon !== "none" && (
        <View style={styles.cardRight}>
          <MaterialCommunityIcons
            name={rightIcon === "scooter" ? "moped" : "bag-checked"}
            size={22}
            color={c.themeBlack}
          />
        </View>
      )}
    </>
  );

  const cardStyle = [styles.card, { minHeight }, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${customerName}, ${subtitle}`}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.blue500,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 16,
  },
  pressed: {
    opacity: 0.9,
  },
  avatarWrap: {
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.blue900,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: fs.smallTitle,
    fontWeight: "600",
    color: c.white,
  },
  cardBody: {
    flex: 1,
  },
  customerName: {
    fontSize: fs.smallTitle,
    fontWeight: "600",
    color: c.themeBlack,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fs.smallText,
    color: c.themeBlack,
    lineHeight: 18,
    opacity: 0.85,
  },
  cardRight: {
    marginLeft: 8,
  },
});
