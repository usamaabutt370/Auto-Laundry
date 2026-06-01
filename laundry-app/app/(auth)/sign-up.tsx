import { useRouter } from "expo-router";
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
import { StatusBar } from "expo-status-bar";
import { AuthErrorModal, Input, Spacer, ThemedText, ThemedView } from "@/components";
import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { type CountryCode } from "react-native-country-picker-modal";
import { normalizePhoneE164, phoneToAuthEmail } from "@/lib/phone-auth";
import { fetchUserRoleFromProfile } from "@/lib/user-role";

const c = theme.colors;

export default function SignUpScreen() {
  const router = useRouter();
  const s = strings.auth.signUpScreen;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("PK");
  const [callingCode, setCallingCode] = useState("92");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    password?: string;
  }>({});
  const [authError, setAuthError] = useState<{ title: string; message: string } | null>(null);

  const showAuthError = (title: string, message: string) => {
    setAuthError({ title, message });
  };

  const handleMobileChange = (raw: string) => {
    // Keep only digits
    let digits = raw.replace(/\D/g, "");
    // Drop any leading 0 (we want numbers like 3xxxxxxxxx)
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    // Most international numbers are 15 digits max
    if (digits.length > 15) {
      digits = digits.slice(0, 15);
    }
    setMobileNumber(digits);
    setErrors((prev) => ({ ...prev, mobileNumber: undefined }));
  };

  const handleContinue = async () => {
    if (!isSupabaseConfigured()) {
      showAuthError(
        "Configuration error",
        "Supabase is not configured. Please add your Supabase URL and anon key to the environment.",
      );
      return;
    }

    const nextErrors: typeof errors = {};
    if (!firstName) nextErrors.firstName = "First name is required.";
    if (!lastName) nextErrors.lastName = "Last name is required.";
    if (!mobileNumber) nextErrors.mobileNumber = "Mobile number is required.";
    if (!password) nextErrors.password = "Password is required.";

    const fullNumber = `+${callingCode}${mobileNumber}`;
    const phoneNumber = parsePhoneNumberFromString(fullNumber);

    if (mobileNumber && (!phoneNumber || !phoneNumber.isValid())) {
      nextErrors.mobileNumber = `Enter a valid mobile number for ${countryCode}.`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();

      const normalizedPhone = normalizePhoneE164(callingCode, mobileNumber);
      const generatedEmail = phoneToAuthEmail(normalizedPhone);

      // 1) Create auth user with email + password (no email OTP).
      const { data, error } = await supabase.auth.signUp({
        email: generatedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            phone: normalizedPhone,
          },
        },
      });

      if (error) {
        showAuthError("Sign up failed", error.message);
        return;
      }

      const user = data.user;

      // 2) Create/update profile row to map phone → email for phone-login later.
      if (user) {
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: generatedEmail,
            password,
          });
          if (signInError) {
            showAuthError(
              "Sign up incomplete",
              "Your account was created but we could not finish setup. Please sign in with your phone number.",
            );
            return;
          }
        }

        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: generatedEmail,
            phone: normalizedPhone,
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            role: "customer",
          },
          { onConflict: "id" },
        );

        if (profileError) {
          if (profileError.message?.includes("profiles_phone_key")) {
            showAuthError(
              "Phone already registered",
              "This phone number is already linked to an account. Please sign in instead.",
            );
            return;
          }
          console.warn("[SignUp] Profile upsert failed:", profileError.message);
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (uid) {
        const role = await fetchUserRoleFromProfile(uid);
        router.replace(role === "launderer" ? "/(partner)" : "/(customer)");
      } else {
        router.replace("/(customer)");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      showAuthError("Sign up error", message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignIn = () => router.replace("/(auth)/login");
  const inputProps = {
    borderColor: "rgba(255,255,255,0.5)",
    focusUnderlineColor: c.backgroundLight,
    containerStyle: styles.inputSpacing,
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
            <ThemedText style={styles.headingTitle}>
              {strings.auth.signUpScreen.title}
            </ThemedText>
          </ThemedView>
          <Spacer.Column numberOfSpaces={10} />
          <ThemedText style={styles.subtitle}>{s.subtitle}</ThemedText>
          <Spacer.Column numberOfSpaces={4} />
          <Input
            placeholder={s.firstName}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            {...inputProps}
          />
          {errors.firstName && (
            <Text style={styles.errorText}>{errors.firstName}</Text>
          )}
          <Spacer.Column numberOfSpaces={1} />
          <Input
            placeholder={s.lastName}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            {...inputProps}
          />
          {errors.lastName && (
            <Text style={styles.errorText}>{errors.lastName}</Text>
          )}
          <Spacer.Column numberOfSpaces={1} />
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
            {...inputProps}
          />
          {errors.mobileNumber && (
            <Text style={styles.errorText}>{errors.mobileNumber}</Text>
          )}
          <Spacer.Column numberOfSpaces={1} />
          <Input
            placeholder={s.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            {...inputProps}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
          <Spacer.Column numberOfSpaces={1} />
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
              isLoading && styles.continueButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={s.continue}
            disabled={isLoading}
          >
            <ThemedText style={styles.continueButtonText}>
              {isLoading ? "Creating account..." : s.continue}
            </ThemedText>
          </Pressable>
          <ThemedView style={styles.footer}>
            <ThemedText style={styles.haveAccount}>{s.haveAccount}</ThemedText>
            <Pressable
              onPress={handleSignIn}
              style={({ pressed }) => [pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={s.signIn}
            >
              <ThemedText style={styles.signInLink}>{s.signIn}</ThemedText>
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
    backgroundColor: c.background,
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
    color: c.white,
    lineHeight: 20,
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  inputSpacing: {
    marginBottom: 14,
  },
  errorText: {
    color: "#ffb3b3",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  continueButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: c.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 28,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
    backgroundColor: "transparent",
  },
  continueButtonDisabled: {
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
  haveAccount: {
    fontSize: 15,
    color: c.white,
    backgroundColor: "transparent",
  },
  signInLink: {
    fontSize: 15,
    fontWeight: "700",
    color: c.backgroundLight,
    backgroundColor: "transparent",
  },
});
