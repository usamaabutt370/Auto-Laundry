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
  /** Mark order complete (e.g. accepted / in progress). */
  onComplete?: () => void;
  /** Label for the complete action. */
  completeLabel?: string;
  /** Extra lines under the subtitle (e.g. total, services, address). */
  detailRows?: { label: string; value: string }[];
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
  onComplete,
  completeLabel = "Complete",
  detailRows,
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
        {detailRows && detailRows.length > 0 ? (
          <View style={styles.detailBlock}>
            {detailRows.map((row, index) => (
              <View key={`${row.label}-${index}`} style={styles.detailItem}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue} numberOfLines={4}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {(statusLabel || onAccept || onReject || onComplete) ? (
          <View
            style={[
              styles.bottomBar,
              !statusLabel && (onAccept || onReject || onComplete) && styles.bottomBarActionsOnly,
            ]}
          >
            {statusLabel ? (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText} numberOfLines={1}>
                  {statusLabel}
                </Text>
              </View>
            ) : null}
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
                <Text style={[styles.actionText, styles.rejectActionText]}>
                  Reject
                </Text>
              </Pressable>
            ) : null}
            {onComplete ? (
              <Pressable
                onPress={onComplete}
                disabled={actionsDisabled}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.acceptButton,
                  pressed && !actionsDisabled && styles.pressed,
                  actionsDisabled && styles.actionDisabled,
                ]}
              >
                <Text style={styles.actionText}>{completeLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
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
    alignItems: "flex-start",
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
  detailBlock: {
    marginTop: 10,
    gap: 8,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: fs.xxSmallText,
    fontWeight: "600",
    color: c.blue500,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    opacity: 0.9,
  },
  detailValue: {
    fontSize: fs.descText,
    color: c.white,
    lineHeight: 18,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  /** When there is no status chip, keep action buttons aligned to the end. */
  bottomBarActionsOnly: {
    justifyContent: "flex-end",
  },
  /** Same outline treatment as Accept / Complete (pending, accepted, etc.). */
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.filledButtonBorder,
    backgroundColor: c.blue900,
    flexShrink: 1,
  },
  statusPillText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "600",
    textTransform: "capitalize",
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
    backgroundColor: c.white,
    borderColor: c.white,
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
