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

const MIN_BAGS = 1;
const MAX_BAGS = 99;

export default function BagsScreen() {
  const router = useRouter();
  const s = strings.customer.bags;
  const [bagCount, setBagCount] = useState(3);

  const increment = () => {
    setBagCount((prev) => Math.min(prev + 1, MAX_BAGS));
  };
  const decrement = () => {
    setBagCount((prev) => Math.max(prev - 1, MIN_BAGS));
  };

  const handleContinue = () => {
    router.push("/(customer)/laundry-bag-detail?bag=1");
  };

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
        keyboardShouldPersistTaps="handled"
      >
        <Spacer.Column numberOfSpaces={30} />
        <Text style={styles.heading}>{s.heading}</Text>

        <View style={styles.inputRow}>
          <MaterialCommunityIcons
            name="information-outline"
            size={22}
            color={c.white}
            style={styles.inputIcon}
          />
          <Text style={styles.inputLabel}>{s.numberOfBags}</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={increment}
              style={({ pressed }) => [
                styles.stepperBtn,
                pressed && styles.pressed,
                bagCount >= MAX_BAGS && styles.stepperBtnDisabled,
              ]}
              disabled={bagCount >= MAX_BAGS}
              accessibilityRole="button"
              accessibilityLabel="Increase"
            >
              <MaterialCommunityIcons
                name="chevron-up"
                size={24}
                color={bagCount >= MAX_BAGS ? "rgba(255,255,255,0.4)" : c.white}
              />
            </Pressable>
            <Text style={styles.stepperValue}>{bagCount}</Text>
            <Pressable
              onPress={decrement}
              style={({ pressed }) => [
                styles.stepperBtn,
                pressed && styles.pressed,
                bagCount <= MIN_BAGS && styles.stepperBtnDisabled,
              ]}
              disabled={bagCount <= MIN_BAGS}
              accessibilityRole="button"
              accessibilityLabel="Decrease"
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={24}
                color={bagCount <= MIN_BAGS ? "rgba(255,255,255,0.4)" : c.white}
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.hint}>{s.hint}</Text>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.continueLabel}>{s.continue}</Text>
        </Pressable>
      </SafeAreaView>
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
  },
  headerRight: {
    padding: 8,
  },
  headerRightIcon: {
    width: 20,
    height: 20,
    tintColor: c.white,
  },
  pressed: {
    opacity: 0.8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: c.white,
    marginBottom: 28,
    lineHeight: 28,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.blue900,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  inputIcon: {
    marginRight: 10,
  },
  inputLabel: {
    flex: 1,
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  stepper: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtn: {
    padding: 4,
  },
  stepperBtnDisabled: {
    opacity: 0.5,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginVertical: 2,
    minWidth: 28,
    textAlign: "center",
  },
  hint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
    marginBottom: 32,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: c.background,
  },
  continueBtn: {
    backgroundColor: c.backgroundLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
});
