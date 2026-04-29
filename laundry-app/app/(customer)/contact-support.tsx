import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
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

import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { Spacer } from "@/components/spacer";
import { ThemedView } from "@/components";
import { AppHeader } from "@/components/app-header";

const c = theme.colors;

type ContactType = "support" | "feedback";

function RadioOption({
  id,
  label,
  selected,
  onSelect,
}: {
  id: ContactType;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [styles.radioRow, pressed && styles.pressed]}
    >
      <Text style={styles.radioLabel}>{label}</Text>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

export default function ContactSupportScreen() {
  const router = useRouter();
  const s = strings.customer.contactSupport;

  const [contactType, setContactType] = useState<ContactType>("support");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    // TODO: submit to backend or open email
    if (message.trim()) {
      // placeholder
    }
  };

  const openEmail = () => {
    Linking.openURL(`mailto:${s.email}`);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]}>
        <AppHeader
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
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
          <Text style={styles.question}>{s.question}</Text>
          <Spacer.Column numberOfSpaces={5} />
          <View style={styles.radioRowWrap}>
            <RadioOption
              id="support"
              label={s.support}
              selected={contactType === "support"}
              onSelect={() => setContactType("support")}
            />
            <RadioOption
              id="feedback"
              label={s.feedback}
              selected={contactType === "feedback"}
              onSelect={() => setContactType("feedback")}
            />
          </View>

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
          <ThemedView style={styles.emailContainer}>
            <Text style={styles.orEmail}>{s.orEmailUs}</Text>
            <Pressable
              onPress={openEmail}
              style={({ pressed }) => [
                styles.emailLink,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emailText}>{s.email}</Text>
            </Pressable>
          </ThemedView>
          <Spacer.Column numberOfSpaces={80} />
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

        {/* <View style={styles.footer}>
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && styles.sendBtnPressed,
            ]}
          >
            <Text style={styles.sendBtnText}>{s.send}</Text>
          </Pressable>
        </View> */}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  pressed: {
    opacity: 0.8,
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
  question: {
    fontSize: 16,
    color: c.white,
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  radioRowWrap: {
    gap: 24,
    marginBottom: 20,
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  radioRow: {
    gap: 10,
    alignItems: "center",
    flexDirection: "row",
  },
  radioOuter: {
    width: 15,
    height: 15,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: c.white,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: c.white,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: c.white,
  },
  radioLabel: {
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  input: {
    fontSize: 16,
    minHeight: 200,
    marginBottom: 20,
    borderRadius: 12,
    color: c.themeGray,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: c.white,
  },
  emailContainer: {
    gap: 10,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  orEmail: {
    fontSize: 16,
    color: c.white,
    marginBottom: 6,
  },
  emailLink: {
    alignSelf: "flex-start",
  },
  emailText: {
    fontSize: 16,
    color: c.white,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  sendBtn: {
    borderRadius: 25,
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
