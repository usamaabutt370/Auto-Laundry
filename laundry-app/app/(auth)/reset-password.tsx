import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Input, Spacer, ThemedText, ThemedView } from "@/components";
import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const c = theme.colors;
const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const s = strings.auth.resetPassword;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBack = () => router.back();

  const handleContinue = async () => {
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(s.errorPasswordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(s.errorPasswordMismatch);
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) throw updateError;
        Alert.alert("", s.successMessage, [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        setLoading(false);
      }
    } else {
      // No Supabase: simulate success and navigate
      Alert.alert("", s.successMessage, [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
      setLoading(false);
    }
  };

  const canSubmit =
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    !loading;

  const inputProps = {
    containerStyle: styles.inputSpacing,
    backgroundColor: c.white,
    borderColor: c.backgroundLight,
    placeholderTextColor: c.white,
    textColor: c.white,
    focusUnderlineColor: c.backgroundLight,
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ThemedView style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={c.white}
            />
          </Pressable>
          {/* <ThemedView style={styles.headerTitleWrap}>
            <ThemedText style={styles.headerTitle}>{s.title}</ThemedText>
          </ThemedView> */}
        </ThemedView>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Spacer.Column numberOfSpaces={5} />
          <ThemedView style={styles.headingContainer}>
            <ThemedText style={styles.headingTitle}>{s.title}</ThemedText>
          </ThemedView>
          <Spacer.Column numberOfSpaces={10} />
          <ThemedText style={styles.subtitle}>{s.subtitle}</ThemedText>
          <Spacer.Column numberOfSpaces={10} />
          <Input
            placeholder={s.newPassword}
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              setError(null);
            }}
            secureTextEntry
            {...inputProps}
          />
          <Input
            placeholder={s.confirmPassword}
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setError(null);
            }}
            secureTextEntry
            {...inputProps}
          />

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}
          <Spacer.Column numberOfSpaces={15} />
          <Pressable
            onPress={handleContinue}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && canSubmit && styles.pressed,
              !canSubmit && styles.continueButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={s.continue}
          >
            <ThemedText style={styles.continueButtonText}>
              {loading ? "..." : s.continue}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
    backgroundColor: "transparent",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.8,
  },
  scroll: {
    flex: 1,
  },
  headingContainer: {
    backgroundColor: "transparent",
  },
  headingTitle: {
    fontSize: 32,
    lineHeight: 32,
    fontWeight: "700",
    color: theme.colors.white,
    backgroundColor: "transparent",
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 15,
    color: c.white,
    lineHeight: 22,
    backgroundColor: "transparent",
  },
  inputSpacing: {
    marginBottom: 14,
  },
  errorText: {
    fontSize: 14,
    color: "#F04438",
    marginTop: 4,
    backgroundColor: "transparent",
  },
  continueButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: c.backgroundLight,
    borderWidth: 1,
    borderColor: c.blue900,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
    backgroundColor: "transparent",
  },
});
