import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppCtaButton } from "@/components/ui/cta-button";
import { UI } from "@/constants/theme";

type AuthErrorModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
};

export function AuthErrorModal({
  visible,
  title,
  message,
  onClose,
  actionLabel = "OK",
}: AuthErrorModalProps) {
  // In-tree overlay (not RN Modal) — avoids iOS ghost touch-blockers on login.
  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View style={styles.card} accessibilityViewIsModal>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={UI.muted} />
          </Pressable>

          <View style={styles.iconRing}>
            <View style={styles.iconWell}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color={UI.red} />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <AppCtaButton label={actionLabel} onPress={onClose} width="full" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI.overlay,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: UI.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: UI.shadowStrong,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.iconWell,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: UI.redBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconWell: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
});
