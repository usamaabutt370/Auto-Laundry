import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

type AcceptedPayload = { type: "accepted" };
type CompletedPayload = { type: "completed"; charged: number; balance: number };
export type PartnerOrderSuccessPayload = AcceptedPayload | CompletedPayload;

type Props = {
  payload: PartnerOrderSuccessPayload | null;
  onClose: () => void;
};

export function PartnerOrderSuccessModal({ payload, onClose }: Props) {
  return (
    <Modal
      visible={payload !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="check-circle" size={52} color="#4ade80" />
          </View>

          {payload?.type === "accepted" ? (
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
                  <Text style={styles.summaryValue}>
                    {payload?.charged ?? 0} credits
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Remaining balance</Text>
                  <Text style={[styles.summaryValue, styles.balanceValue]}>
                    {payload?.balance ?? 0} credits
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: c.blue900,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.35)",
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: fs.descText,
    color: c.blue500,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  summaryBox: {
    width: "100%",
    backgroundColor: "rgba(171, 233, 254, 0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.2)",
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
    backgroundColor: "rgba(171, 233, 254, 0.15)",
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: fs.descText,
    color: c.blue500,
  },
  summaryValue: {
    fontSize: fs.descText,
    fontWeight: "600",
    color: c.white,
  },
  balanceValue: {
    color: "#4ade80",
  },
  closeBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: c.outline,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: fs.descText,
    fontWeight: "700",
    color: c.background,
  },
  pressed: {
    opacity: 0.85,
  },
});
