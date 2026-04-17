import { useRouter } from "expo-router";
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
import { StatusBar } from "expo-status-bar";
import { Input, Spacer, ThemedText, ThemedView } from "@/components";
import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";
import { assets } from "@/assets/assets";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { requestPhoneOtp } from "@/lib/phone-otp";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { type CountryCode } from "react-native-country-picker-modal";

const c = theme.colors;

export default function SignUpScreen() {
  const router = useRouter();
  const s = strings.auth.signUpScreen;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("PK");
  const [callingCode, setCallingCode] = useState("92");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    email?: string;
    password?: string;
  }>({});

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
      Alert.alert(
        "Configuration error",
        "Supabase is not configured. Please add your Supabase URL and anon key to the environment."
      );
      return;
    }

    const nextErrors: typeof errors = {};
    if (!firstName) nextErrors.firstName = "First name is required.";
    if (!lastName) nextErrors.lastName = "Last name is required.";
    if (!mobileNumber) nextErrors.mobileNumber = "Mobile number is required.";
    if (!email) nextErrors.email = "Email is required.";
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

      // 1) Create auth user with email + password (no email OTP).
      const { data, error } = await supabase.auth.signUp({
        email,
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
        Alert.alert("Sign up failed", error.message);
        return;
      }

      const user = data.user;

      // 2) Create/update profile row to map phone → email for phone-login later.
      if (user) {
        try {
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              email,
              phone: normalizedPhone,
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
              role: "customer",
            },
            { onConflict: "id" }
          );
        } catch {
          // Ignore profile errors for now; auth account is still created.
        }
      }

      // 3) Request a phone OTP (stub for now, real SMS later).
      await requestPhoneOtp(normalizedPhone);

      // 4) Go to phone OTP screen. We pass the phone so future verification logic has it.
      router.push({
        pathname: "/(auth)/otp",
        params: { phone: normalizedPhone },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Sign up error", message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignIn = () => router.replace("/(auth)/login");
  const handleFacebook = () => {};
  const handleGoogle = () => {};

  const inputProps = {
    borderColor: "rgba(255,255,255,0.5)",
    focusUnderlineColor: c.backgroundLight,
    containerStyle: styles.inputSpacing,
  };

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
          <Spacer.Column numberOfSpaces={10} />
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
            placeholder={s.email}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            {...inputProps}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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
          <ThemedText style={styles.orText}>{s.orSignUpWithSocial}</ThemedText>
          <ThemedView style={styles.socialButtons}>
            <Pressable
              onPress={handleFacebook}
              style={({ pressed }) => [
                styles.socialCircle,
                styles.googleCircle,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign up with Facebook"
            >
              <Image
                source={assets.icons.facebook_icon}
                style={styles.socialIcon}
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
              accessibilityLabel="Sign up with Google"
            >
              <Image
                source={assets.icons.google_icon}
                style={styles.socialIcon}
              />
            </Pressable>
          </ThemedView>
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
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    backgroundColor: "transparent",
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
    marginTop: -8,
    marginBottom: 4,
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
  orText: {
    fontSize: 15,
    color: c.white,
    textAlign: "center",
    marginBottom: 20,
    backgroundColor: "transparent",
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
  socialIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  facebookCircle: {
    backgroundColor: "#1877f2",
  },
  googleCircle: {
    backgroundColor: c.white,
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
