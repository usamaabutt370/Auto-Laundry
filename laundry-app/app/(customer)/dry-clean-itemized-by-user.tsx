import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";

const c = theme.colors;

const DRY_CLEAN_ITEMS: { id: string; name: string; price: number }[] = [
  { id: "coat", name: "Coat", price: 28.79 },
  { id: "jacket", name: "Jacket", price: 12.79 },
  { id: "tie", name: "Tie", price: 8.79 },
  { id: "robe", name: "Robe", price: 12.79 },
  { id: "blanket", name: "Blanket", price: 25.79 },
];

export default function DryCleanItemizedByUserScreen() {
  const router = useRouter();
  const s = strings.customer.dryCleanItemize;
  const [quantities, setQuantities] = useState<Record<string, number>>({
    coat: 1,
    jacket: 0,
    tie: 1,
    robe: 0,
    blanket: 1,
  });

  const setQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = (prev[id] ?? 0) + delta;
      return { ...prev, [id]: Math.max(0, next) };
    });
  };

  const handleContinue = () => {
    router.push("/(customer)/dry-clean-itemize-detail");
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {s.title}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.headerRight, pressed && styles.pressed]}
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
        {DRY_CLEAN_ITEMS.map((item) => {
          const qty = quantities[item.id] ?? 0;
          return (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemLabel}>
                {item.name} - ${item.price.toFixed(2)}
              </Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setQty(item.id, -1)}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    pressed && styles.pressed,
                    qty <= 0 && styles.stepperBtnDisabled,
                  ]}
                  disabled={qty <= 0}
                >
                  <MaterialCommunityIcons
                    name="minus"
                    size={20}
                    color={qty <= 0 ? "rgba(255,255,255,0.5)" : c.white}
                  />
                </Pressable>
                <Text style={styles.stepperValue}>{qty}</Text>
                <Pressable
                  onPress={() => setQty(item.id, 1)}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={c.white} />
                </Pressable>
              </View>
            </View>
          );
        })}
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
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.blue900,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: c.white,
    flex: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: { opacity: 0.5 },
  stepperValue: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
    minWidth: 24,
    textAlign: "center",
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
