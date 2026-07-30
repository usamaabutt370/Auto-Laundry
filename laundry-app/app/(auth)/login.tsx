import { AuthErrorModal, Input, Spacer, ThemedText, ThemedView } from "@/components";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

export default function LoginScreen() {
  const router = useRouter();
  const s = strings.auth.login;

  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("PK");
  const [callingCode, setCallingCode] = useState("92");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    mobileNumber?: string;
    password?: string;
  }>({});
  const [authError, setAuthError] = useState<{ title: string; message: string } | null>(null);

  const showAuthError = (title: string, message: string) => {
    setAuthError({ title, message });
  };

  const handleMobileChange = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    // Many countries use 0 as a national prefix; we usually strip it for international format
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    // Most international numbers (excluding calling code) are 15 digits max per ITU-T E.164
    if (digits.length > 15) {
      digits = digits.slice(0, 15);
    }
    setMobileNumber(digits);
    setErrors((prev) => ({ ...prev, mobileNumber: undefined }));
  };

  const handleSignIn = async () => {
    if (!isSupabaseConfigured()) {
      showAuthError(
        "Configuration error",
        "Supabase is not configured. Please add your Supabase URL and anon key to the environment.",
      );
      return;
    }

    const nextErrors: typeof errors = {};
    const fullNumber = `+${callingCode}${mobileNumber}`;
    const phoneNumber = parsePhoneNumberFromString(fullNumber);

    if (!mobileNumber) {
      nextErrors.mobileNumber = "Mobile number is required.";
    } else if (!phoneNumber || !phoneNumber.isValid()) {
      nextErrors.mobileNumber = `Enter a valid mobile number for ${countryCode}.`;
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Normalize to E.164 format: +[countryCode][number]
      const phoneNumber = parsePhoneNumberFromString(`+${callingCode}${mobileNumber}`);
      const normalizedPhone = phoneNumber ? phoneNumber.number : `+${callingCode}${mobileNumber}`;

      // 1) Look up email AND role by phone number from profiles.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, role, is_deleted")
        .eq("phone", normalizedPhone)
        .maybeSingle<{
          email: string | null;
          role: string | null;
          is_deleted: boolean | null;
        }>();

      if (profileError) {
        throw profileError;
      }
      if (!profile?.email) {
        showAuthError(
          "Account not found",
          "We couldn't find an account with that phone number. Please check it or sign up first.",
        );
        return;
      }

      if (profile.is_deleted) {
        showAuthError(
          "Account deleted",
          "Your account was deleted. Please sign up again with the same phone number to restore your account.",
        );
        return;
      }

      // 2) Sign in to Supabase with resolved email + password.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (signInError) {
        showAuthError("Sign in failed", signInError.message);
        return;
      }

      // 3) Navigate directly to the correct area based on role.
      //    We cannot go through "/" first — onAuthStateChange fires asynchronously,
      //    so index.tsx would see session=null and bounce back to the auth screen.
      if (profile.role === "launderer") {
        router.replace("/(partner)");
      } else {
        router.replace("/(customer)");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      showAuthError("Sign in error", message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = () => {
    router.push("/(auth)/reset-password");
  };
  const handleSignUp = () => {
    router.push("/(auth)/sign-up");
  };
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <AuthErrorModal
        visible={Boolean(authError)}
        title={authError?.title ?? ""}
        message={authError?.message ?? ""}
        onClose={() => setAuthError(null)}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.headingContainer}>
            <ThemedText style={styles.headingTitle}>{s.heading}</ThemedText>
          </ThemedView>
          <Spacer.Column numberOfSpaces={5} />
          
          <Spacer.Column numberOfSpaces={5} />

          <Input
            variant="phone"
            placeholder={s.mobileNumber}
            value={mobileNumber}
            onChangeText={handleMobileChange}
            selectedCca2={countryCode}
            selectedCallingCode={callingCode}
            onCountrySelect={(c) => {
              setCountryCode(c.cca2);
              setCallingCode(c.callingCode);
              setErrors((prev) => ({ ...prev, mobileNumber: undefined }));
            }}
            containerStyle={styles.inputSpacing}
            borderColor="rgba(255,255,255,0.5)"
            focusUnderlineColor={theme.colors.backgroundLight}
          />
          {errors.mobileNumber && (
            <Text style={styles.errorText}>{errors.mobileNumber}</Text>
          )}
          <Spacer.Column numberOfSpaces={1} />

          <ThemedView style={styles.passwordRow}>
            <Input
              placeholder={s.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={styles.passwordInputSpacing}
              borderColor="rgba(255,255,255,0.5)"
              focusUnderlineColor={theme.colors.backgroundLight}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
            <Pressable
              onPress={handleForgotPassword}
              style={({ pressed }) => [
                styles.forgotPasswordPressable,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={s.forgotPassword}
            >
              <ThemedText style={styles.forgotPassword}>
                {s.forgotPassword}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <Pressable
            onPress={handleSignIn}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.pressed,
              isLoading && styles.signInButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={s.signInButton}
            disabled={isLoading}
          >
            <ThemedText style={styles.signInButtonText}>
              {isLoading ? "Signing in..." : s.signInButton}
            </ThemedText>
          </Pressable>

          <ThemedView style={styles.footer}>
            <ThemedText style={styles.noAccount}>{s.noAccount}</ThemedText>
            <Pressable
              onPress={handleSignUp}
              style={({ pressed }) => [pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={s.signUp}
            >
              <ThemedText style={styles.signUpLink}>{s.signUp}</ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
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
  subtitle: {
    fontSize: 14,
    color: theme.colors.white,
    marginBottom: 28,
    textAlign: "center",
    backgroundColor: "transparent",
  },
  inputSpacing: {
    marginBottom: 14,
    backgroundColor: "transparent",
  },
  errorText: {
    color: "#ffb3b3",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  passwordRow: {
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  passwordInputSpacing: {
    marginBottom: 6,
  },
  forgotPasswordPressable: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPassword: {
    fontSize: 14,
    color: theme.colors.backgroundLight,
  },
  signInButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.white,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    gap: 6,
    backgroundColor: "transparent",
  },
  noAccount: {
    fontSize: 15,
    color: theme.colors.white,
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.backgroundLight,
  },
});
