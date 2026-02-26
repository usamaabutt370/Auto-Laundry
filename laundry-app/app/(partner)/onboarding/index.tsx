import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{s.step1Title}</Text>
        <Text style={styles.subtitle}>{s.step1Subtitle}</Text>
      </View>

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
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(partner)/onboarding/step2")}
        >
          <Text style={styles.nextLabel}>{s.next}</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={c.white}
          />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: fs.titleNormal,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fs.smallText,
    color: c.blue500,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.outline,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: fs.smallText,
    color: c.white,
    marginBottom: 16,
  },
  descriptionInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.lightBlue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    marginTop: 8,
  },
  nextLabel: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
