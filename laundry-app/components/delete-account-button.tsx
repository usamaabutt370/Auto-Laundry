import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createContext, useContext, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { showAppAlert } from "@/components/app-alert";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { UI } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { deleteUserAccount } from "@/lib/account-deletion";
import { getStrings } from "@/locales";

type ConfirmFn = (options: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) => Promise<boolean>;

const DeleteAccountConfirmContext = createContext<ConfirmFn | null>(null);

/** Mount around a screen so the delete confirm covers the page, not the button row. */
export function DeleteAccountDialogHost({ children }: { children: ReactNode }) {
  const { confirm, dialog } = useConfirmDialog();
  return (
    <DeleteAccountConfirmContext.Provider value={confirm}>
      <View style={styles.host}>
        {children}
        {dialog}
      </View>
    </DeleteAccountConfirmContext.Provider>
  );
}

export function DeleteAccountButton() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { locale } = useLocale();
  const copy = getStrings(locale).common.deleteAccount;
  const confirm = useContext(DeleteAccountConfirmContext);
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
        showAppAlert(copy.cannotTitle, result.message);
        return;
      }

      await goToSignUpAfterDelete();
      showAppAlert(copy.deletedTitle, copy.deletedMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.errorFallback;
      showAppAlert(copy.errorTitle, message);
    } finally {
      setIsDeleting(false);
    }
  };

  const onPress = async () => {
    if (!confirm) return;
    const first = await confirm({
      title: copy.title,
      message: copy.message,
      confirmLabel: copy.delete,
      cancelLabel: copy.cancel,
      destructive: true,
    });
    if (!first) return;
    const second = await confirm({
      title: copy.confirmTitle,
      message: copy.confirmMessage,
      confirmLabel: copy.delete,
      cancelLabel: copy.cancel,
      destructive: true,
    });
    if (!second) return;
    await runDelete();
  };

  return (
    <Pressable
      onPress={() => void onPress()}
      disabled={isDeleting}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={copy.button}
    >
      <MaterialCommunityIcons name="account-remove-outline" size={16} color="#FFFFFF" />
      <Text style={styles.label}>{copy.button}</Text>
      {isDeleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: UI.red,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flex: 1,
  },
  pressed: { opacity: 0.7 },
  label: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
