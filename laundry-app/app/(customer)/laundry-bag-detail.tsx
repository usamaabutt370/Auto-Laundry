import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

const c = theme.colors;

const WEIGHT_OPTIONS = [
  "1lb",
  "2lb",
  "3lb",
  "4lb",
  "5lb",
  "6lb",
  "7lb",
  "8lb",
  "9lb",
  "10lb",
];
const MIN_ITEMS = 1;
const MAX_ITEMS = 999;

export default function LaundryBagDetailScreen() {
  const router = useRouter();
  const { isNarrow, ms, s: scale } = useResponsiveLayout();
  const params = useLocalSearchParams<{ bag?: string }>();
  const bagNumber = params.bag ? parseInt(params.bag, 10) : 1;
  const s = strings.customer.laundryBagDetail;
  const stepperBtn = scale(isNarrow ? 30 : 36);
  const iconSize = isNarrow ? 18 : 22;

  const [weightIndex, setWeightIndex] = useState(3); // 40 lb
  const [itemCount, setItemCount] = useState(2);
  const [instructions, setInstructions] = useState("");
  const [weightPickerVisible, setWeightPickerVisible] = useState(false);

  const weightLabel = WEIGHT_OPTIONS[weightIndex] ?? WEIGHT_OPTIONS[3];

  const handleSave = () => {
    // TODO: persist bag detail and navigate (e.g. next bag or schedule-pickup)
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
          {s.titlePrefix}
          {bagNumber}
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

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Weight */}
        <Text style={[styles.sectionTitle, { fontSize: ms(isNarrow ? 15 : 17) }]}>
          {s.weight}
        </Text>
        <Pressable
          style={[styles.inputRow, isNarrow && styles.inputRowNarrow]}
          onPress={() => setWeightPickerVisible(true)}
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={iconSize}
            color={c.white}
            style={styles.inputIcon}
          />
          <Text
            style={[styles.inputLabel, { fontSize: ms(isNarrow ? 14 : 16) }]}
            numberOfLines={1}
          >
            {s.estimatedWeight}
          </Text>
          <Text style={[styles.inputValue, { fontSize: ms(isNarrow ? 14 : 16) }]}>
            {weightLabel}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={iconSize}
            color={c.white}
          />
        </Pressable>

        {/* Items */}
        <Text style={[styles.sectionTitle, { fontSize: ms(isNarrow ? 15 : 17) }]}>
          {s.items}
        </Text>
        <View style={[styles.inputRow, isNarrow && styles.inputRowNarrow]}>
          <MaterialCommunityIcons
            name="information-outline"
            size={iconSize}
            color={c.white}
            style={styles.inputIcon}
          />
          <Text
            style={[styles.inputLabel, { fontSize: ms(isNarrow ? 14 : 16) }]}
            numberOfLines={1}
          >
            {s.numberOfItems}
          </Text>
          <View style={[styles.stepper, { gap: scale(isNarrow ? 8 : 12) }]}>
            <Pressable
              onPress={() =>
                setItemCount((prev) => Math.max(prev - 1, MIN_ITEMS))
              }
              style={({ pressed }) => [
                styles.stepperBtn,
                {
                  width: stepperBtn,
                  height: stepperBtn,
                  borderRadius: stepperBtn / 2,
                },
                pressed && styles.pressed,
                itemCount <= MIN_ITEMS && styles.stepperBtnDisabled,
              ]}
              disabled={itemCount <= MIN_ITEMS}
            >
              <MaterialCommunityIcons
                name="minus"
                size={isNarrow ? 18 : 22}
                color={c.white}
              />
            </Pressable>
            <Text
              style={[
                styles.stepperValue,
                {
                  fontSize: ms(isNarrow ? 15 : 18),
                  minWidth: scale(isNarrow ? 28 : 36),
                },
              ]}
            >
              {itemCount}
            </Text>
            <Pressable
              onPress={() =>
                setItemCount((prev) => Math.min(prev + 1, MAX_ITEMS))
              }
              style={({ pressed }) => [
                styles.stepperBtn,
                {
                  width: stepperBtn,
                  height: stepperBtn,
                  borderRadius: stepperBtn / 2,
                },
                pressed && styles.pressed,
                itemCount >= MAX_ITEMS && styles.stepperBtnDisabled,
              ]}
              disabled={itemCount >= MAX_ITEMS}
            >
              <MaterialCommunityIcons
                name="plus"
                size={isNarrow ? 18 : 22}
                color={c.white}
              />
            </Pressable>
          </View>
        </View>

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
    </KeyboardAvoidingView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        >
          <Text style={styles.saveLabel}>{s.save}</Text>
        </Pressable>
      </SafeAreaView>

      <Modal
        visible={weightPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeightPickerVisible(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setWeightPickerVisible(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>{s.weight}</Text>
            {WEIGHT_OPTIONS.map((label, index) => (
              <Pressable
                key={label}
                onPress={() => {
                  setWeightIndex(index);
                  setWeightPickerVisible(false);
                }}
                style={[
                  styles.pickerOption,
                  weightIndex === index && styles.pickerOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    weightIndex === index && styles.pickerOptionTextSelected,
                  ]}
                >
                  {label}
                </Text>
                {weightIndex === index && (
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color={c.white}
                  />
                )}
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [
                styles.pickerClose,
                pressed && styles.pressed,
              ]}
              onPress={() => setWeightPickerVisible(false)}
            >
              <Text style={styles.pickerCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  keyboardView: {
    flex: 1,
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.blue900,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  inputRowNarrow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  inputLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  inputValue: {
    fontSize: 16,
    color: c.white,
    fontWeight: "600",
    marginRight: 8,
    flexShrink: 0,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  stepperBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: { opacity: 0.5 },
  stepperValue: {
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginBottom: 16,
    textAlign: "center",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  pickerOptionSelected: {
    backgroundColor: c.backgroundLight,
  },
  pickerOptionText: {
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  pickerOptionTextSelected: { fontWeight: "700" },
  pickerClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: c.backgroundLight,
  },
  pickerCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: c.white,
  },
});
