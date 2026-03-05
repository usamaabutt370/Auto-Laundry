import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/button";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { getStrings } from "@/locales";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const c = theme.colors;
const fs = theme.fontSize;

export default function PartnerOnboardingStep1() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();
  const s = getStrings(locale).partner.onboarding;

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) return;
    supabase
      .from("partner_profiles")
      .select("business_name, business_description")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBusinessName(data.business_name ?? "");
          setBusinessDescription(data.business_description ?? "");
        }
      });
  }, [user?.id]);

  const canGoNext =
    businessName.trim().length > 0 && businessDescription.trim().length > 0;

  const handleNext = useCallback(async () => {
    if (!canGoNext) return;
    if (isSupabaseConfigured() && supabase && user?.id) {
      await supabase.from("partner_profiles").upsert(
        {
          id: user.id,
          business_name: businessName.trim(),
          business_description: businessDescription.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }
    router.push("/(partner)/onboarding/step2");
  }, [canGoNext, user?.id, businessName, businessDescription]);

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
        <AppButton
          label={s.next}
          onPress={handleNext}
          variant="filled"
          rightIcon="arrow-right"
          fullWidth
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
