import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { strings } from "@/constants/strings";

const c = theme.colors;
const s = strings.partner.onboarding;

export default function PartnerOnboardingStep2() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace("/(partner)/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={c.blue500}
          />
          <Text style={styles.backLabel}>{s.back}</Text>
        </Pressable>
        <View style={styles.header}>
          <Text style={styles.title}>{s.step2Title}</Text>
          <Text style={styles.subtitle}>{s.step2Subtitle}</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Services offered (placeholder – add form later)
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.completeBtn, pressed && styles.pressed]}
          onPress={handleComplete}
        >
          <Text style={styles.completeLabel}>{s.complete}</Text>
          <MaterialCommunityIcons
            name="check"
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  backLabel: {
    fontSize: 16,
    color: c.blue500,
    fontWeight: "600",
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
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.blue500,
    paddingVertical: 14,
    borderRadius: 12,
  },
  completeLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: c.background,
  },
  pressed: {
    opacity: 0.8,
  },
});
