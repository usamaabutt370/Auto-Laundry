import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

import { LanguageSelector } from "@/components/language-selector";
import { ServicePricingCard } from "@/components/service-pricing-card";
import { AppButton } from "@/components/ui/button";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useMerchantServices } from "@/contexts/merchant-services-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;

const CATEGORY_KEYS = [
  "dryCleaning",
  "washAndFold",
  "tailoring",
  "other",
] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

function getCategoryLabel(
  s: ReturnType<typeof getStrings>["partner"]["settings"],
  key: CategoryKey,
): string {
  switch (key) {
    case "dryCleaning":
      return s.categoryDryCleaning;
    case "washAndFold":
      return s.categoryWashAndFold;
    case "tailoring":
      return s.categoryTailoring;
    case "other":
      return s.categoryOther;
    default:
      return key;
  }
}

/** Screen 2: Add Service – list + form (Category, Name, Price) + Add Service + Save (back to Screen 1). */
export default function AddServiceScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.settings;
  const { services, addService } = useMerchantServices();
  const [categoryKey, setCategoryKey] = useState<CategoryKey | "">("");
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const handleAddService = useCallback(() => {
    const name = formName.trim();
    const price = formPrice.trim();
    if (!name || !price) return;
    addService({
      name,
      priceDisplay: price,
      category: categoryKey
        ? getCategoryLabel(s, categoryKey as CategoryKey)
        : undefined,
    });
    setFormName("");
    setFormPrice("");
    setCategoryKey("");
  }, [addService, categoryKey, formName, formPrice, s]);

  const handleSave = useCallback(() => {
    router.replace("/(partner)/settings");
  }, [router]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={c.white}
            />
          </Pressable>
          <Text style={styles.title}>{s.merchantServices}</Text>
          <LanguageSelector />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {services.length > 0 ? (
            <View style={styles.tableHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.columnHeader}>{s.service}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.columnHeader}>{s.price}</Text>
              </View>
            </View>
          ) : null}

          {services.map((item) => (
            <ServicePricingCard
              key={item.id}
              title={item.name}
              price={item.priceDisplay}
              readOnly
            />
          ))}

          <View style={styles.formCard}>
            <Text style={styles.formLabel}>{s.category}</Text>
            <Pressable
              onPress={() => setCategoryModalVisible(true)}
              style={styles.categoryTouch}
            >
              <Text
                style={[
                  styles.categoryText,
                  !categoryKey && styles.categoryPlaceholder,
                ]}
              >
                {categoryKey
                  ? getCategoryLabel(s, categoryKey)
                  : s.categoryPlaceholder}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={c.white}
              />
            </Pressable>
            <Text style={styles.formLabel}>{s.serviceItemName}</Text>
            <TextInput
              style={styles.input}
              placeholder={s.serviceNamePlaceholder}
              placeholderTextColor={c.blue500}
              value={formName}
              onChangeText={setFormName}
              autoCapitalize="words"
            />
            <Text style={styles.formLabel}>{s.serviceItemPrice}</Text>
            <TextInput
              style={styles.input}
              placeholder={s.pricePlaceholder}
              placeholderTextColor={c.blue500}
              value={formPrice}
              onChangeText={setFormPrice}
              keyboardType="default"
            />
          </View>

          <View style={styles.buttonRow}>
            <AppButton
              label={s.addService}
              onPress={handleAddService}
              variant="filled"
              leftIcon="plus"
              fullWidth
            />
            <AppButton
              label={s.save}
              onPress={handleSave}
              variant="outline"
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {CATEGORY_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  setCategoryKey(key);
                  setCategoryModalVisible(false);
                }}
                style={({ pressed }) => [
                  styles.modalOption,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalOptionText}>
                  {getCategoryLabel(s, key)}
                </Text>
              </Pressable>
            ))}
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
  pressed: {
    opacity: 0.8,
  },
  safeArea: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  tableHeader: {
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  columnHeader: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: c.blue900,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  categoryTouch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  categoryText: {
    fontSize: fs.smallText,
    color: c.white,
  },
  categoryPlaceholder: {
    color: c.blue500,
  },
  formLabel: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: c.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: fs.smallText,
    color: c.white,
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 16,
    minWidth: 240,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalOptionText: {
    fontSize: fs.smallText,
    color: c.white,
  },
});
