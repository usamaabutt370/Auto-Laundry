import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const UI = {
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  chipBorder: "#E5E7EB",
  mint: "#ECFDF5",
};
const fs = theme.fontSize;

type AcceptedPayload = { type: "accepted" };
type CompletedPayload = { type: "completed"; charged: number; balance: number };
export type PartnerOrderSuccessPayload = AcceptedPayload | CompletedPayload;

type Props = {
  payload: PartnerOrderSuccessPayload | null;
  onClose: () => void;
};

/** Success overlay without RN Modal — avoids iOS touch freeze after accept/complete. */
export function PartnerOrderSuccessModal({ payload, onClose }: Props) {
  if (payload === null) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="check-circle" size={52} color={UI.teal} />
        </View>

        {payload.type === "accepted" ? (
          <>
            <Text style={styles.title}>Order Accepted!</Text>
            <Text style={styles.message}>
              You have successfully accepted this order. The customer will be notified.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Order Completed!</Text>
            <Text style={styles.message}>
              Great work! Here's a summary of this order.
            </Text>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Credits charged</Text>
                <Text style={styles.summaryValue}>{payload.charged} credits</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Remaining balance</Text>
                <Text style={[styles.summaryValue, styles.balanceValue]}>
                  {payload.balance} credits
                </Text>
              </View>
            </View>
          </>
        )}

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
        >
          <Text style={styles.closeBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: UI.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 24,
    alignItems: "center",
    zIndex: 1,
    elevation: 1,
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: UI.text,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: fs.descText,
    color: UI.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  summaryBox: {
    width: "100%",
    backgroundColor: UI.mint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingVertical: 4,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: UI.chipBorder,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: fs.descText,
    color: UI.muted,
  },
  summaryValue: {
    fontSize: fs.descText,
    fontWeight: "600",
    color: UI.text,
  },
  balanceValue: {
    color: UI.teal,
  },
  closeBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: UI.teal,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: fs.descText,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.85,
  },
});
