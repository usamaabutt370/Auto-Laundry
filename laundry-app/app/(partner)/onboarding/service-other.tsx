import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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

import { PartnerHeader } from "@/components/partner-header";
import { AppButton } from "@/components/ui/button";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import type { ItemizeState } from "@/contexts/merchant-services-context";
import { useMerchantServices } from "@/contexts/merchant-services-context";
import { getStrings } from "@/locales";
import { allowDecimalOnly } from "@/utils/input-filter";

const c = theme.colors;
const fs = theme.fontSize;

const OTHER_SERVICE_KEYS = ["dryCleaning", "tailoring"] as const;
type OtherServiceKey = (typeof OTHER_SERVICE_KEYS)[number];

const DRY_CLEANING_ITEM_KEYS = [
  "dryCleaningItemCoat",
  "dryCleaningItemJacket",
  "dryCleaningItemTie",
  "dryCleaningItemRobe",
  "dryCleaningItemBlanket",
] as const;

const TAILORING_ITEM_KEYS = [
  "tailoringItemPants",
  "tailoringItemShirt",
  "tailoringItemSuit",
  "tailoringItemDress",
] as const;

const ITEM_KEYS: Record<OtherServiceKey, readonly string[]> = {
  dryCleaning: DRY_CLEANING_ITEM_KEYS,
  tailoring: TAILORING_ITEM_KEYS,
};

export interface ServiceItemRow {
  id: string;
  label: string;
}

function getDefaultItems(
  serviceKey: OtherServiceKey,
  getLabel: (key: string) => string,
): ServiceItemRow[] {
  return ITEM_KEYS[serviceKey].map((key) => ({
    id: key,
    label: getLabel(key),
  }));
}

function getServiceLabel(
  s: ReturnType<typeof getStrings>["partner"]["settings"],
  key: OtherServiceKey,
): string {
  switch (key) {
    case "dryCleaning":
      return s.categoryDryCleaning;
    case "tailoring":
      return s.categoryTailoring;
    default:
      return key;
  }
}

function getItemLabel(
  s: ReturnType<typeof getStrings>["partner"]["onboarding"],
  itemKey: string,
): string {
  return (s as Record<string, string>)[itemKey] ?? itemKey;
}

function parseServiceKey(
  params: Record<string, string | string[] | undefined>,
): OtherServiceKey | null {
  const raw = params.service;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return OTHER_SERVICE_KEYS.includes(raw as OtherServiceKey)
    ? (raw as OtherServiceKey)
    : null;
}

/**
 * Dry Cleaning / Tailoring - Itemize: list of items with name + price only (no quantity).
 * Continue saves draft state only; DB write happens on Step 2 Finish.
 */
export default function ServiceOtherScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: string }>();
  const { locale } = useLocale();
  const onboardingStrings = getStrings(locale).partner.onboarding;
  const settingsStrings = getStrings(locale).partner.settings;
  const {
    setDryCleaningPricing,
    setTailoringPricing,
    dryCleaningItemizeState,
    setDryCleaningItemizeState,
    tailoringItemizeState,
    setTailoringItemizeState,
  } = useMerchantServices();

  const serviceKey = useMemo(
    () =>
      parseServiceKey(params as Record<string, string | string[] | undefined>),
    [params],
  );

  const [items, setItems] = useState<ServiceItemRow[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");

  useEffect(() => {
    if (serviceKey == null) return;
    const saved =
      serviceKey === "dryCleaning"
        ? dryCleaningItemizeState
        : tailoringItemizeState;
    if (saved?.items?.length) {
      setItems(saved.items);
      setPrices(saved.prices ?? {});
    } else {
      const getLabelForKey = (key: string) =>
        getItemLabel(onboardingStrings, key);
      const defaultItems = getDefaultItems(serviceKey, getLabelForKey);
      setItems(defaultItems);
      const initialPrices: Record<string, string> = {};
      defaultItems.forEach((item) => {
        initialPrices[item.id] = "";
      });
      setPrices(initialPrices);
    }
    // Only reset when switching service; use saved state if present so removals persist
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceKey]);

  const setPrice = (itemId: string, value: string) => {
    setPrices((prev) => ({ ...prev, [itemId]: allowDecimalOnly(value) }));
  };

  const addItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    const id = `custom_${Date.now()}`;
    setItems((prev) => [...prev, { id, label: name }]);
    setPrices((prev) => ({ ...prev, [id]: "" }));
    setNewItemName("");
    setAddModalVisible(false);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setPrices((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const openEdit = (item: ServiceItemRow) => {
    setEditingItemId(item.id);
    setEditItemName(item.label);
    setEditItemPrice(prices[item.id] ?? "");
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingItemId(null);
    setEditItemName("");
    setEditItemPrice("");
  };

  const saveEdit = () => {
    if (editingItemId == null) return;
    const name = editItemName.trim();
    if (!name) return;
    setItems((prev) =>
      prev.map((i) => (i.id === editingItemId ? { ...i, label: name } : i)),
    );
    setPrices((prev) => ({
      ...prev,
      [editingItemId]: allowDecimalOnly(editItemPrice),
    }));
    closeEditModal();
  };

  const canContinue =
    serviceKey != null &&
    items.length > 0 &&
    items.every((item) => (prices[item.id]?.trim().length ?? 0) > 0);

  const handleContinue = async () => {
    if (serviceKey == null) return;
    if (!canContinue) {
      // All items removed (or incomplete): clear pricing so Services screen shows button only, not price card.
      if (items.length === 0) {
        if (serviceKey === "dryCleaning") {
          setDryCleaningPricing(null);
          setDryCleaningItemizeState(null);
        } else if (serviceKey === "tailoring") {
          setTailoringPricing(null);
          setTailoringItemizeState(null);
        }
        router.back();
        return;
      }
      const state: ItemizeState = { items, prices };
      if (serviceKey === "dryCleaning") {
        setDryCleaningItemizeState(state);
      } else if (serviceKey === "tailoring") {
        setTailoringItemizeState(state);
      }
      router.back();
      return;
    }
    const serviceName = getServiceLabel(settingsStrings, serviceKey);
    const rows = items.map((item) => ({
      label: item.label,
      value: prices[item.id]?.trim() ?? "",
    }));
    const pricingWithRows = { rows };

    if (serviceKey === "dryCleaning") {
      setDryCleaningPricing(pricingWithRows);
      setDryCleaningItemizeState({ items, prices });
    } else if (serviceKey === "tailoring") {
      setTailoringPricing(pricingWithRows);
      setTailoringItemizeState({ items, prices });
    }
    router.back();
  };

  const handleBack = () => {
    if (items.length === 0 && serviceKey != null) {
      if (serviceKey === "dryCleaning") {
        setDryCleaningPricing(null);
        setDryCleaningItemizeState(null);
      } else if (serviceKey === "tailoring") {
        setTailoringPricing(null);
        setTailoringItemizeState(null);
      }
      router.back();
      return;
    }
    const state: ItemizeState = { items, prices };
    if (serviceKey === "dryCleaning") {
      setDryCleaningItemizeState(state);
    } else if (serviceKey === "tailoring") {
      setTailoringItemizeState(state);
    }
    router.back();
  };

  useEffect(() => {
    if (serviceKey == null) {
      router.replace("/(partner)/onboarding/step2");
    }
  }, [serviceKey, router]);

  if (serviceKey == null) {
    return null;
  }

  const serviceName = getServiceLabel(settingsStrings, serviceKey);
  const title = `${serviceName}${onboardingStrings.itemizeTitleSuffix}`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <PartnerHeader
        title={title}
        leftIcon="arrow-left"
        onLeftPress={handleBack}
        rightElement={
          <Pressable
            onPress={() => setAddModalVisible(true)}
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.pressed,
            ]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={onboardingStrings.addItem}
          >
            <MaterialCommunityIcons name="plus" size={24} color={c.white} />
          </Pressable>
        }
        leftAccessibilityLabel={onboardingStrings.back}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.label}
            </Text>
            <TextInput
              style={styles.priceInput}
              placeholder={onboardingStrings.itemizePricePlaceholder}
              placeholderTextColor={c.blue500}
              value={prices[item.id] ?? ""}
              onChangeText={(text) => setPrice(item.id, text)}
              keyboardType="decimal-pad"
              editable
              {...(Platform.OS === "android" && { includeFontPadding: false })}
            />
            <Pressable
              onPress={() => openEdit(item)}
              style={({ pressed }) => [
                styles.iconBtn,
                styles.editBtn,
                pressed && styles.pressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${settingsStrings.edit} ${item.label}`}
            >
              <MaterialCommunityIcons name="pencil" size={22} color={c.white} />
            </Pressable>
            <Pressable
              onPress={() => removeItem(item.id)}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.label}`}
            >
              <MaterialCommunityIcons name="close" size={22} color={c.white} />
            </Pressable>
          </View>
        ))}

        <AppButton
          label={onboardingStrings.continue}
          onPress={handleContinue}
          variant="filled"
          rightIcon="arrow-right"
          fullWidth
          style={styles.continueBtn}
          accessibilityLabel={onboardingStrings.continue}
        />
      </ScrollView>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAddModalVisible(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{onboardingStrings.addItem}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={onboardingStrings.newItemNamePlaceholder}
              placeholderTextColor={c.blue500}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <AppButton
                label={settingsStrings.cancel}
                onPress={() => {
                  setNewItemName("");
                  setAddModalVisible(false);
                }}
                variant="outline"
                fullWidth
                style={styles.modalActionBtn}
              />
              <AppButton
                label={onboardingStrings.add}
                onPress={addItem}
                variant="filled"
                fullWidth
                disabled={!newItemName.trim()}
                style={styles.modalActionBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeEditModal}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{onboardingStrings.editItem}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={onboardingStrings.newItemNamePlaceholder}
              placeholderTextColor={c.blue500}
              value={editItemName}
              onChangeText={setEditItemName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={onboardingStrings.itemizePricePlaceholder}
              placeholderTextColor={c.blue500}
              value={editItemPrice}
              onChangeText={(text) => setEditItemPrice(allowDecimalOnly(text))}
              keyboardType="decimal-pad"
              {...(Platform.OS === "android" && { includeFontPadding: false })}
            />
            <View style={styles.modalActions}>
              <AppButton
                label={settingsStrings.cancel}
                onPress={closeEditModal}
                variant="outline"
                fullWidth
                style={styles.modalActionBtn}
              />
              <AppButton
                label={settingsStrings.save}
                onPress={saveEdit}
                variant="filled"
                fullWidth
                disabled={!editItemName.trim()}
                style={styles.modalActionBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerIconBtn: {
    padding: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.blue900,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.outline,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  itemName: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
    flex: 1,
    marginRight: 12,
  },
  priceInput: {
    backgroundColor: c.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: fs.xSmallText,
    color: c.white,
    width: 120,
    minHeight: 44,
    height: 44,
    marginRight: 8,
  },
  iconBtn: {
    padding: 4,
  },
  editBtn: {
    marginRight: 4,
  },
  continueBtn: {
    marginTop: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: c.modalOverlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: c.blue900,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.modalBorder,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: c.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: fs.smallText,
    color: c.white,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  modalActionBtn: {
    flex: 1,
  },
});
