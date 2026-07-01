import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { AppHeader } from "@/components/app-header";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { openWhatsApp } from "@/lib/whatsapp";
import { goBackToCustomerHome } from "@/utils/customer-navigation";

const c = theme.colors;

export default function ContactSupportScreen() {
  const router = useRouter();
  const s = strings.customer.contactSupport;

  const [message, setMessage] = useState("");

  const handleSend = () => {
    Keyboard.dismiss();
    const trimmed = message.trim();
    if (!trimmed) {
      showAppAlert(s.messageRequired);
      return;
    }

    openWhatsApp(trimmed).catch(() => {
      showAppAlert(s.openError);
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]}>
        <AppHeader
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => goBackToCustomerHome(router)}
          leftAccessibilityLabel="Go back"
        />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={styles.input}
            placeholder={s.placeholder}
            placeholderTextColor={c.themeGray}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.whatsappHint}>{s.whatsappHint}</Text>

          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && styles.sendBtnPressed,
            ]}
          >
            <Text style={styles.sendBtnText}>{s.send}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  input: {
    fontSize: 16,
    minHeight: 200,
    marginBottom: 16,
    borderRadius: 12,
    color: c.themeGray,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: c.white,
  },
  whatsappHint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 8,
    lineHeight: 20,
  },
  sendBtn: {
    borderRadius: 25,
    marginTop: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.backgroundLight,
  },
  sendBtnPressed: {
    opacity: 0.9,
  },
  sendBtnText: {
    fontSize: 17,
    color: c.white,
    fontWeight: "500",
  },
});
