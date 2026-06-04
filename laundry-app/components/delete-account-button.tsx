import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";
import { deleteUserAccount } from "@/lib/account-deletion";

type Props = {
  supportEmail?: string;
};

export function DeleteAccountButton({ supportEmail = "usamaabutt370@gmail.com" }: Props) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const goToSignUpAfterDelete = async () => {
    await signOut();
    if (router.canDismiss?.()) {
      router.dismissAll?.();
    }
    router.replace("/(auth)/sign-up");
  };

  const runDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteUserAccount();
      if (!result.ok) {
        Alert.alert("Cannot delete account", result.message);
        return;
      }

      await goToSignUpAfterDelete();

      Alert.alert(
        "Account deleted",
        "Your account has been deleted. Sign up again with the same phone number to restore your account and order history.",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setIsDeleting(false);
    }
  };

  const onPress = () => {
    Alert.alert(
      "Delete account",
      `Your Laundri account will be deleted and you will be signed out. Your orders and messages are kept so you can sign up again later with the same phone number.\n\nFor permanent data removal, contact ${supportEmail}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "You will need to sign up again with the same phone number to use the app.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => void runDelete() },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDeleting}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Delete account"
    >
      <View style={styles.row}>
        <MaterialCommunityIcons name="account-remove-outline" size={22} color={stylesVars.danger} />
        <Text style={styles.label}>Delete account</Text>
        {isDeleting ? (
          <ActivityIndicator size="small" color={stylesVars.danger} />
        ) : null}
      </View>
    </Pressable>
  );
}

const stylesVars = {
  danger: "#D32F2F",
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  pressed: { opacity: 0.85 },
  label: {
    fontSize: 16,
    color: stylesVars.danger,
    fontWeight: "600",
  },
});
