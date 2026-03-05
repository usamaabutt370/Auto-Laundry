import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OnboardingActionButton } from "@/components/onboarding-action-button";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

export default function PartnerOnboardingStep1() {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.onboarding;

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  const canGoNext =
    businessName.trim().length > 0 && businessDescription.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <PartnerHeader
        title={s.step1Title}
        subtitle={s.step1Subtitle}
        leftIcon="arrow-left"
        onLeftPress={() => router.back()}
        leftAccessibilityLabel={s.back}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.input}
          placeholder={s.businessNamePlaceholder}
          placeholderTextColor={c.blue500}
          value={businessName}
          onChangeText={setBusinessName}
        />
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder={s.businessDescriptionPlaceholder}
          placeholderTextColor={c.blue500}
          value={businessDescription}
          onChangeText={setBusinessDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <OnboardingActionButton
          label={s.next}
          rightIcon="arrow-right"
          onPress={() => router.push("/(partner)/onboarding/step2")}
          disabled={!canGoNext}
          style={styles.nextBtn}
          accessibilityLabel={s.next}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  input: {
    backgroundColor: c.blue900,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: c.outline,
    paddingVertical: 17,
    paddingHorizontal: 20,
    fontSize: fs.smallText,
    color: c.white,
    marginBottom: 16,
  },
  descriptionInput: {
    minHeight: 150,
    paddingTop: 14,
  },
  nextBtn: {
    marginTop: 8,
  },
});
