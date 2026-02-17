import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";

const c = theme.colors;
const s = strings.partner.onboarding;

export default function PartnerOnboardingStep1() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{s.step1Title}</Text>
          <Text style={styles.subtitle}>{s.step1Subtitle}</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Business name, address, and contact (placeholder – add form later)
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(partner)/onboarding/step2")}
        >
          <Text style={styles.nextLabel}>{s.next}</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={c.background}
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: c.blue500,
  },
  placeholder: {
    backgroundColor: c.blue900,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  placeholderText: {
    fontSize: 14,
    color: c.blue500,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.blue500,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: c.background,
  },
  pressed: {
    opacity: 0.8,
  },
});
