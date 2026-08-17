import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "@/contexts/auth-context";
import { deleteUserAccount } from "@/lib/account-deletion";

const DESTRUCTIVE_RED = "#FF3B30";

export function DeleteAccountButton() {
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

      Alert.alert("Account deleted", "Your account has been deleted.");
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
      "This will permanently delete your account. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "This action cannot be undone.",
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
      <MaterialCommunityIcons name="account-remove-outline" size={16} color="#FFFFFF" />
      <Text style={styles.label}>Delete Account</Text>
      {isDeleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DESTRUCTIVE_RED,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  pressed: { opacity: 0.7 },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
