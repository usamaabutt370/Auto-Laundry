import type { ComponentProps } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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
  /** Optional avatar URL to display instead of initials. */
  avatarUrl?: string | null;
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
  /** Status label shown on the card. */
  statusLabel?: string;
  /** Optional accept action. */
  onAccept?: () => void;
  /** Optional reject action. */
  onReject?: () => void;
  /** Disable action buttons. */
  actionsDisabled?: boolean;
}

/**
 * Reusable order card: avatar, name, subtitle, optional right icon.
 * Light card background with black text.
 */
export function OrderCard({
  customerName,
  initial,
  avatarUrl,
  subtitle,
  rightIcon = "none",
  onPress,
  style,
  minHeight = 80,
  statusLabel,
  onAccept,
  onReject,
  actionsDisabled = false,
}: OrderCardProps) {
  const initialChar =
    initial ?? (customerName.trim()[0]?.toUpperCase() ?? "?");

  const content = (
    <>
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialChar}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.customerName}>{customerName}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {statusLabel ? (
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        ) : null}
        {(onAccept || onReject) && (
          <View style={styles.actionsRow}>
            {onAccept ? (
              <Pressable
                onPress={onAccept}
                disabled={actionsDisabled}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.acceptButton,
                  pressed && !actionsDisabled && styles.pressed,
                  actionsDisabled && styles.actionDisabled,
                ]}
              >
                <Text style={styles.actionText}>Accept</Text>
              </Pressable>
            ) : null}
            {onReject ? (
              <Pressable
                onPress={onReject}
                disabled={actionsDisabled}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.rejectButton,
                  pressed && !actionsDisabled && styles.pressed,
                  actionsDisabled && styles.actionDisabled,
                ]}
              >
                <Text style={[styles.actionText, styles.rejectActionText]}>Reject</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
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
    backgroundColor: c.blue900,
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
    backgroundColor:'transparent',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: "cover",
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
    color: c.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fs.smallText,
    color: c.blue500,
    lineHeight: 18,
    opacity: 0.85,
  },
  statusWrap: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: c.blue900,
  },
  statusText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  acceptButton: {
    backgroundColor: c.blue900,
    borderColor: c.filledButtonBorder,
  },
  rejectButton: {
    backgroundColor: "transparent",
    borderColor: "#D9534F",
  },
  actionText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "600",
  },
  rejectActionText: {
    color: "#D9534F",
  },
  actionDisabled: {
    opacity: 0.5,
  },
  cardRight: {
    marginLeft: 8,
  },
});
