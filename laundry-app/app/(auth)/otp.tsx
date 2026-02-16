import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Spacer, ThemedText, ThemedView } from "@/components";
import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";
import { verifyPhoneOtp } from "@/lib/phone-otp";

const c = theme.colors;
const OTP_LENGTH = 4;

export default function OtpScreen() {
  const router = useRouter();
  const s = strings.auth.otp;

  const { phone } = useLocalSearchParams<{ phone?: string }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleBack = () => router.back();
  const handleContinue = async () => {
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) return;

    setIsVerifying(true);
    try {
      const { success, errorMessage } = await verifyPhoneOtp(
        String(phone ?? ""),
        code
      );

      // For now verifyPhoneOtp always succeeds; later it will check a real backend.
      if (!success) {
        // Optional: show a toast / alert once you have an error message.
        console.warn("Phone OTP verification failed:", errorMessage);
        return;
      }

      router.replace("/(customer)");
    } finally {
      setIsVerifying(false);
    }
  };
  const handleResend = () => {
    // TODO: resend OTP
  };

  const handleDigitChange = (value: string, index: number) => {
    const num = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = num;
    setDigits(next);
    if (num && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpCode = digits.join("");

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

        <Spacer.Column numberOfSpaces={10} />
        <ThemedView style={styles.headingContainer}>
          <ThemedText style={styles.headingTitle}>{s.title}</ThemedText>
        </ThemedView>
        <Spacer.Column numberOfSpaces={10} />
        <ThemedView style={styles.content}>
          <ThemedText style={styles.subtitle}>{s.subtitle}</ThemedText>
          <Spacer.Column numberOfSpaces={10} />

          <ThemedView style={styles.otpRow}>
            {digits.map((digit, index) => (
              <View
                key={index}
                style={styles.otpCircle}
                pointerEvents="box-none"
              >
                <TextInput
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(v) => handleDigitChange(v, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable
                  accessibilityLabel={`Digit ${index + 1}`}
                />
              </View>
            ))}
          </ThemedView>

          <Spacer.Column numberOfSpaces={10} />

          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
              (otpCode.length !== OTP_LENGTH || isVerifying) &&
                styles.continueButtonDisabled,
            ]}
            disabled={otpCode.length !== OTP_LENGTH || isVerifying}
            accessibilityRole="button"
            accessibilityLabel={s.continue}
          >
            <ThemedText style={styles.continueButtonText}>
              {isVerifying ? "Verifying..." : s.continue}
            </ThemedText>
          </Pressable>

          <Spacer.Column numberOfSpaces={5} />

          <ThemedText style={styles.didntReceive}>
            {s.didntReceiveCode}
          </ThemedText>
          <Pressable
            onPress={handleResend}
            style={({ pressed }) => [pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={s.resend}
          >
            <ThemedText style={styles.resendLink}>{s.resend}</ThemedText>
          </Pressable>
        </ThemedView>
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
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
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
  pressed: {
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "transparent",
  },
  subtitle: {
    fontSize: 15,
    color: c.white,
    lineHeight: 22,
    backgroundColor: "transparent",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "transparent",
  },
  otpCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  otpInput: {
    width: "100%",
    height: "100%",
    fontSize: 24,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
    padding: 0,
    backgroundColor: "transparent",
  },
  continueButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: c.backgroundLight,
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
  didntReceive: {
    fontSize: 14,
    color: c.white,
    textAlign: "center",
    backgroundColor: "transparent",
  },
  resendLink: {
    fontSize: 15,
    fontWeight: "700",
    color: c.backgroundLight,
    textAlign: "center",
    marginTop: 4,
    backgroundColor: "transparent",
  },
});
