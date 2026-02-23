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
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";

const c = theme.colors;

export default function DryCleanItemizeDetailScreen() {
  const router = useRouter();
  const sItemize = strings.customer.dryCleanItemize;
  const s = strings.customer.laundryBagDetail;

  const [instructions, setInstructions] = useState("");

  const handleSave = () => {
    // TODO: persist and navigate (e.g. schedule-pickup or back to pickup-services)
    router.push("/(customer)/pickup-services");
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
          {sItemize.title}
        </Text>
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
        {/* Preferences */}
        <Text style={styles.sectionTitle}>{s.preferences}</Text>
        <View style={styles.preferencesBox}>
          <Text style={styles.preferencesPlaceholder}>
            {s.noPreferencesAvailable}
          </Text>
        </View>

        {/* Instructions */}
        <Text style={styles.sectionTitle}>{s.instructions}</Text>
        <TextInput
          style={styles.instructionsInput}
          value={instructions}
          onChangeText={setInstructions}
          placeholder={s.instructionsPlaceholder}
          placeholderTextColor="rgba(0,0,0,0.4)"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        >
          <Text style={styles.saveLabel}>{s.save}</Text>
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: c.white,
    marginBottom: 12,
  },
  preferencesBox: {
    backgroundColor: c.blue900,
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  preferencesPlaceholder: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
  },
  instructionsInput: {
    backgroundColor: c.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: c.themeBlack,
    minHeight: 100,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: c.background,
  },
  saveBtn: {
    backgroundColor: c.backgroundLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
});
