import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { Spacer } from "@/components";

const c = theme.colors;

type OptionId = "sortedByCleaner" | "itemizedByUser";

const OPTIONS: {
  id: OptionId;
  labelKey: keyof typeof strings.customer.dryCleanOptions;
}[] = [
  { id: "sortedByCleaner", labelKey: "sortedByCleaner" },
  { id: "itemizedByUser", labelKey: "itemizedByUser" },
];

export default function DryCleanOptionsScreen() {
  const router = useRouter();
  const s = strings.customer.dryCleanOptions;
  const [selectedId, setSelectedId] = useState<OptionId>("sortedByCleaner");

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
        <Pressable
          style={({ pressed }) => [
            styles.headerRight,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Options"
        >
          <Image
            source={assets.icons.menu_icon}
            style={styles.headerRightIcon}
          />
        </Pressable>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Spacer.Column numberOfSpaces={20} />
        <View style={styles.contentBlock}>
          <Text style={styles.prompt}>{s.prompt}</Text>
          <Spacer.Column numberOfSpaces={10} />
          {OPTIONS.map(({ id, labelKey }) => {
            const isSelected = selectedId === id;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  setSelectedId(id);
                  if (id === "sortedByCleaner") {
                    router.push("/(customer)/dry-clean-detail");
                  } else if (id === "itemizedByUser") {
                    router.push("/(customer)/dry-clean-itemized-by-user");
                  }
                }}
                style={({ pressed }) => [
                  styles.optionPill,
                  isSelected
                    ? styles.optionPillSelected
                    : styles.optionPillUnselected,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}
                >
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={c.background}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected
                      ? styles.optionLabelSelected
                      : styles.optionLabelUnselected,
                  ]}
                >
                  {s[labelKey]}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
  },
  headerRight: { padding: 8 },
  headerRightIcon: {
    width: 20,
    height: 20,
    tintColor: c.white,
  },
  pressed: { opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  contentBlock: {
    flexShrink: 0,
  },
  prompt: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 24,
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 999,
    marginBottom: 14,
    gap: 14,
  },
  optionPillSelected: {
    backgroundColor: c.backgroundLight,
    borderWidth: 0,
  },
  optionPillUnselected: {
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: c.backgroundLight,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    backgroundColor: c.blue500,
    borderColor: c.blue500,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionLabelSelected: {
    color: c.white,
  },
  optionLabelUnselected: {
    color: c.white,
    opacity: 0.9,
  },
});
