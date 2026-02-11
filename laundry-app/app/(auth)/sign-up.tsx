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

const c = theme.colors;

export default function SignUpScreen() {
  const router = useRouter();
  const s = strings.auth.signUpScreen;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleContinue = () => {
    // TODO: Supabase sign up
    router.push("/(auth)/login");
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
          <Spacer.Column numberOfSpaces={1} />
          <Input
            placeholder={s.lastName}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            {...inputProps}
          />
          <Spacer.Column numberOfSpaces={1} />
          <Input
            variant="phone"
            placeholder={s.mobileNumber}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            {...inputProps}
          />
          <Spacer.Column numberOfSpaces={1} />
          <Input
            placeholder={s.email}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            {...inputProps}
          />
          <Spacer.Column numberOfSpaces={1} />
          <Input
            placeholder={s.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            {...inputProps}
          />
          <Spacer.Column numberOfSpaces={1} />
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={s.continue}
          >
            <ThemedText style={styles.continueButtonText}>
              {s.continue}
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
