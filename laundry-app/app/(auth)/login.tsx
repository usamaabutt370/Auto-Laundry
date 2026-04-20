import { assets } from "@/assets/assets";
import { Input, Spacer, ThemedText, ThemedView } from "@/components";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { type CountryCode } from "react-native-country-picker-modal";

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
      Alert.alert(
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

      // 1) Look up email by phone number from profiles.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }
      if (!profile?.email) {
        Alert.alert(
          "Account not found",
          "We couldn’t find an account with that phone number. Please check it or sign up first.",
        );
        return;
      }

      // 2) Sign in to Supabase with resolved email + password.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (signInError) {
        Alert.alert("Sign in failed", signInError.message);
        return;
      }

      // Auth state change listener (AuthProvider) has the session;
      // go directly to the customer area instead of bouncing through root.
      router.replace("/(customer)");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      Alert.alert("Sign in error", message);
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
  const handleFacebook = () => {};
  const handleGoogle = () => {};

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ThemedView style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={theme.colors.white}
            />
          </Pressable>
          {/* <ThemedText style={styles.headerTitle}>
            {strings.auth.signIn}
          </ThemedText> */}
        </ThemedView>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Spacer.Column numberOfSpaces={10} />
          <ThemedView style={styles.headingContainer}>
            <ThemedText style={styles.headingTitle}>{s.heading}</ThemedText>
          </ThemedView>
          <Spacer.Column numberOfSpaces={5} />
          <ThemedText style={styles.title}>{s.title}</ThemedText>
          <Spacer.Column numberOfSpaces={5} />
          <ThemedText style={styles.subtitle}>{s.subtitle}</ThemedText>
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

          <ThemedText style={styles.orText}>{s.orSignInWithSocial}</ThemedText>
          <ThemedView style={styles.socialButtons}>
            <Pressable
              onPress={handleFacebook}
              style={({ pressed }) => [
                styles.socialCircle,
                styles.googleCircle,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Facebook"
            >
              <Image
                source={assets.icons.facebook_icon}
                style={styles.googleIcon}
              />
            </Pressable>
            <Pressable
              onPress={handleGoogle}
              style={({ pressed }) => [
                styles.socialCircle,
                styles.googleCircle,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
            >
              <Image
                source={assets.icons.google_icon}
                style={styles.googleIcon}
              />
              {/* <MaterialCommunityIcons name="google" size={28} color="#4285F4" /> */}
            </Pressable>
          </ThemedView>

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
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
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.white,
    marginTop: 24,
    marginBottom: 8,
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
    marginTop: -8,
    marginBottom: 4,
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
  orText: {
    fontSize: 15,
    color: theme.colors.white,
    textAlign: "center",
    marginBottom: 20,
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    backgroundColor: "transparent",
  },
  socialCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  facebookCircle: {
    backgroundColor: "#1877f2",
  },
  googleCircle: {
    backgroundColor: theme.colors.white,
  },
  googleIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
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
