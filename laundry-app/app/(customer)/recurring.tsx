import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { Spacer } from "@/components";

const c = theme.colors;

type RecurringOptionId = "weekly" | "biWeekly" | "threeWeeks" | "monthly";

const OPTIONS: {
  id: RecurringOptionId;
  labelKey: keyof typeof strings.customer.recurring;
}[] = [
  { id: "weekly", labelKey: "weekly" },
  { id: "biWeekly", labelKey: "biWeekly" },
  { id: "threeWeeks", labelKey: "threeWeeks" },
  { id: "monthly", labelKey: "monthly" },
];

export default function RecurringOptionsScreen() {
  const router = useRouter();
  const s = strings.customer.recurring;
  const [activeId, setActiveId] = useState<RecurringOptionId>("biWeekly");

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{s.title}</Text>
        <View style={styles.headerSpacer} />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Spacer.Column numberOfSpaces={10} />
        {OPTIONS.map(({ id, labelKey }) => {
          const isActive = activeId === id;
          return (
            <View key={id} style={styles.optionWrap}>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{s.active}</Text>
                </View>
              )}
              <Pressable
                onPress={() => setActiveId(id)}
                style={({ pressed }) => [
                  styles.optionBlock,
                  isActive
                    ? styles.optionBlockActive
                    : styles.optionBlockInactive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    isActive
                      ? styles.optionLabelActive
                      : styles.optionLabelInactive,
                  ]}
                >
                  {s[labelKey]}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.background,
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    backgroundColor: "transparent",
  },
  headerSpacer: {
    width: 32,
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.8,
  },
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  optionWrap: {
    marginBottom: 20,
    position: "relative",
    // alignItems: "center",

    backgroundColor: "transparent",
    borderRadius: 14,
  },
  activeBadge: {
    position: "absolute",
    top: -10,
    zIndex: 1,
    backgroundColor: c.blue600,
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 5,
    marginLeft: 20,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.background,
  },
  optionBlock: {
    width: "100%",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  optionBlockInactive: {
    backgroundColor: c.blue900,
  },
  optionBlockActive: {
    backgroundColor: c.backgroundLight,
    borderWidth: 2,
    borderColor: c.blue600,
    borderRadius: 14,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: "600",
  },
  optionLabelInactive: {
    color: c.white,
  },
  optionLabelActive: {
    color: c.white,
  },
});
