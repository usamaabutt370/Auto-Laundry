import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";

const c = theme.colors;

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
  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={22} color={c.themeGray} />
          </Pressable>

          <Image
            source={assets.icons.app_icon}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Tap2Laundry"
          />

          <View style={styles.messageBlock}>
            <Text style={styles.message}>Please sign in to submit the</Text>
            <Text style={styles.message}>order</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onSignIn}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <Text style={styles.actionLabel}>Sign in</Text>
            </Pressable>
            <Pressable
              onPress={onSignUp}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Sign up"
            >
              <Text style={styles.actionLabel}>Sign up</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: c.sheetBackdrop,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: c.white,
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: "center",
    ...theme.shadow,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 1,
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: 16,
    borderRadius: 20,
  },
  messageBlock: {
    alignItems: "center",
    marginBottom: 22,
  },
  message: {
    fontSize: 18,
    fontWeight: "700",
    color: c.themeBlack,
    textAlign: "center",
    lineHeight: 26,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    backgroundColor: c.backgroundDark,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: c.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
