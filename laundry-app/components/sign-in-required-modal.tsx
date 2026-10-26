import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppCtaButton } from "@/components/ui/cta-button";
import { useLocale } from "@/contexts/locale-context";
import { gradients, UI } from "@/constants/theme";
import { getStrings } from "@/locales";

type SignInRequiredModalProps = {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

/**
 * In-tree overlay (not RN Modal) so navigating to login does not leave an
 * iOS ghost touch-blocker over the auth screen.
 */
export function SignInRequiredModal({
  visible,
  onClose,
  onSignIn,
  onSignUp,
}: SignInRequiredModalProps) {
  const { locale } = useLocale();
  const s = getStrings(locale).customer.orderSummary;

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
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

        <LinearGradient
          colors={[...gradients.glass]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconRing}
        >
          <View style={styles.iconWell}>
            <MaterialCommunityIcons name="account-lock-outline" size={32} color={UI.purple} />
          </View>
        </LinearGradient>

        <Text style={styles.title}>{s.signInRequiredTitle}</Text>
        <Text style={styles.message}>{s.signInRequiredMessage}</Text>

        <View style={styles.actions}>
          <AppCtaButton label={s.signIn} onPress={onSignIn} width="full" />
          <AppCtaButton
            label={s.signUp}
            onPress={onSignUp}
            variant="outline"
            width="full"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    alignItems: "center",
    justifyContent: "center",
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
  actions: {
    width: "100%",
    gap: 10,
  },
});
