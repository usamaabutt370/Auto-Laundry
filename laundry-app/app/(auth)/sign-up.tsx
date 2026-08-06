import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthErrorModal, Input, Spacer, ThemedText, ThemedView } from "@/components";
import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

const c = theme.colors;

export default function SignUpScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
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

      // Normalize phone number to E.164
      const phoneNumber = parsePhoneNumberFromString(`+${callingCode}${mobileNumber}`);
      const normalizedPhone = phoneNumber ? phoneNumber.number : `+${callingCode}${mobileNumber}`;
      const generatedEmail = `${normalizedPhone.replace(/\D/g, "")}@autolaundry.app`;

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

      // 2) Create profile row so phone-login and RLS account checks work.
      if (user) {
        const { error: profileError } = await supabase.rpc("bootstrap_user_profile", {
          p_email: generatedEmail,
          p_phone: normalizedPhone,
          p_full_name: fullName,
          p_first_name: firstName,
          p_last_name: lastName,
          p_role: "customer",
        });
        if (profileError) {
          showAuthError("Profile setup failed", profileError.message);
          return;
        }
      }

      // Resume prior screen when coming from chat / checkout; otherwise go home.
      if (returnTo === "order-summary") {
        // Auth was pushed as a sheet over order-summary — dismiss to resume checkout.
        if (typeof router.canDismiss === "function" && router.canDismiss()) {
          router.dismiss();
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(customer)/order-summary");
        }
      } else if (returnTo === "chat") {
        router.replace("/(customer)/(tabs)/chat");
      } else if (returnTo === "orders") {
        router.replace("/(customer)/(tabs)/order");
      } else if (returnTo === "profile") {
        router.replace("/(customer)/(tabs)/profile");
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
  const handleSignIn = () =>
    router.replace({
      pathname: "/(auth)/login",
      params: returnTo ? { returnTo } : undefined,
    });

  const handleClose = () => {
    if (typeof router.canDismiss === "function" && router.canDismiss()) {
      router.dismiss();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (returnTo === "order-summary") {
      router.replace("/(customer)/order-summary");
      return;
    }
    if (returnTo === "chat") {
      router.replace("/(customer)/(tabs)/chat");
      return;
    }
    if (returnTo === "orders") {
      router.replace("/(customer)/(tabs)/order");
      return;
    }
    if (returnTo === "profile") {
      router.replace("/(customer)/(tabs)/profile");
      return;
    }
    router.replace("/(customer)");
  };

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
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <MaterialCommunityIcons name="close" size={22} color={c.white} />
        </Pressable>
      </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    alignItems: "flex-end",
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
