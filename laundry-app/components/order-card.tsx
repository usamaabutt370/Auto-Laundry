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
  const isRejectedStatus = statusLabel?.trim().toLowerCase() === "rejected";
  const isCompletedStatus = statusLabel?.trim().toLowerCase() === "completed";
  const handleStatusPillPress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();
  };

  const content = (
    <>
      <View style={styles.mainRow}>
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
          <View style={styles.topRow}>
            <Text style={styles.customerName}>{customerName}</Text>
            {statusLabel ? (
              <Pressable
                onPress={handleStatusPillPress}
                onPressIn={handleStatusPillPress}
                style={[
                  styles.statusPill,
                  isRejectedStatus && styles.statusPillRejected,
                  isCompletedStatus && styles.statusPillCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    isRejectedStatus && styles.statusPillTextRejected,
                    isCompletedStatus && styles.statusPillTextCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {statusLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {detailRows && detailRows.length > 0 ? (
            <View style={styles.detailGrid}>
              {detailRows.map((row, index) => (
                <View
                  key={`${row.label}-${index}`}
                  style={[
                    styles.detailCell,
                    index % 2 === 0 ? styles.detailCellLeft : styles.detailCellRight,
                    index === detailRows.length - 1 &&
                      detailRows.length % 2 === 1 &&
                      styles.detailCellFull,
                  ]}
                >
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      {(onAccept || onReject || onComplete) ? (
        <View
          style={[
            styles.bottomBar,
            styles.bottomBarActionsOnly,
          ]}
        >
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
    flexDirection: "column",
    backgroundColor: c.blue900,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  pressed: {
    opacity: 0.9,
  },
  avatarWrap: {
    marginRight: 10,
    backgroundColor: "transparent",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  customerName: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    flex: 1,
  },
  subtitle: {
    fontSize: fs.descText,
    color: c.blue500,
    lineHeight: 16,
    opacity: 0.85,
  },
  detailGrid: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "stretch",
    flexWrap: "wrap",
    gap: 8,
  },
  detailCell: {
    minWidth: 0,
  },
  detailCellLeft: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  detailCellRight: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  detailCellFull: {
    flexBasis: "100%",
  },
  detailLabel: {
    fontSize: fs.xxSmallText,
    fontWeight: "600",
    color: c.blue500,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    opacity: 0.9,
    paddingTop: 1,
  },
  detailValue: {
    fontSize: fs.xxSmallText,
    color: c.white,
    lineHeight: 15,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    marginTop: 8,
    gap: 8,
    width: "100%",
  },
  /** When there is no status chip, keep action buttons aligned to the end. */
  bottomBarActionsOnly: {
    justifyContent: "center",
    alignSelf: "stretch",
  },
  /** Same outline treatment as Accept / Complete (pending, accepted, etc.). */
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.filledButtonBorder,
    backgroundColor: c.blue900,
    flexShrink: 1,
  },
  statusPillRejected: {
    borderColor: "#f87171",
    backgroundColor: "rgba(127, 29, 29, 0.2)",
  },
  statusPillCompleted: {
    borderColor: "#86efac",
    backgroundColor: "rgba(22, 101, 52, 0.2)",
  },
  statusPillText: {
    color: c.white,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.1,
  },
  statusPillTextRejected: {
    color: "#fecaca",
  },
  statusPillTextCompleted: {
    color: "#ecfdf5",
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: fs.xxSmallText,
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
