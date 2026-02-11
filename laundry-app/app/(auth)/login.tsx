import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { assets } from "@/assets/assets";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();
  const s = strings.auth.login;

  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = () => {
    // TODO: Supabase sign in
    router.push("/(auth)/otp");
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            onChangeText={setMobileNumber}
            containerStyle={styles.inputSpacing}
            borderColor="rgba(255,255,255,0.5)"
            focusUnderlineColor={theme.colors.backgroundLight}
          />
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
            <Pressable
              onPress={handleForgotPassword}
              style={({ pressed }) => [pressed && styles.pressed]}
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
            ]}
            accessibilityRole="button"
            accessibilityLabel={s.signInButton}
          >
            <ThemedText style={styles.signInButtonText}>
              {s.signInButton}
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
  passwordRow: {
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  passwordInputSpacing: {
    marginBottom: 6,
  },
  forgotPassword: {
    fontSize: 14,
    color: theme.colors.backgroundLight,
    alignSelf: "flex-end",
    marginBottom: 20,
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
