import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { showAppAlert } from "@/components/app-alert";
import { AppHeader } from "@/components/app-header";
import {
  WashFoldPackageBox,
  WashFoldPackageGrid,
} from "@/components/wash-fold-package-box";
import { AppButton } from "@/components/ui/button";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import type {
  ItemizeState,
  OnboardingServicesSnapshot,
  ServicePricing,
  ServicePricingRow,
} from "@/contexts/merchant-services-context";
import { useMerchantServices } from "@/contexts/merchant-services-context";
import {
  isWashFoldPackageItem,
  isWashFoldPackageItemId,
  mergeWashFoldCatalog,
  PARTNER_WASH_FOLD_GARMENT_KEYS,
  PARTNER_WASH_FOLD_PACKAGE_KEYS,
  getWashFoldPackageDescription,
  isWashFoldCustomPackageId,
} from "@/constants/partner-wash-fold-items";
import { getStrings } from "@/locales";
import { allowDecimalOnly } from "@/utils/input-filter";
import { parsePriceDisplay } from "@/utils/parse-price-display";

const c = theme.colors;
const fs = theme.fontSize;

const ITEMIZE_SERVICE_KEYS = ["washAndFold", "dryCleaning", "tailoring"] as const;
type ItemizeServiceKey = (typeof ITEMIZE_SERVICE_KEYS)[number];

const DRY_CLEANING_ITEM_KEYS = [
  "dryCleaningItemSuit",
  "dryCleaningItemShirt",
  "dryCleaningItemPants",
  "dryCleaningItemDress",
  "dryCleaningItemSweater",
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

const ITEM_KEYS: Record<Exclude<ItemizeServiceKey, "washAndFold">, readonly string[]> = {
  dryCleaning: DRY_CLEANING_ITEM_KEYS,
  tailoring: TAILORING_ITEM_KEYS,
};

type WashFoldPriceTab = "items" | "packages";

function buildWashFoldDefaultItems(
  getLabel: (key: string) => string,
): ServiceItemRow[] {
  const garments = PARTNER_WASH_FOLD_GARMENT_KEYS.map((key) => ({
    id: key,
    label: getLabel(key),
  }));
  const packages = PARTNER_WASH_FOLD_PACKAGE_KEYS.map((key) => ({
    id: key,
    label: getLabel(key),
  }));
  return [...garments, ...packages];
}

export interface ServiceItemRow {
  id: string;
  label: string;
}

function getDefaultItems(
  serviceKey: Exclude<ItemizeServiceKey, "washAndFold">,
  getLabel: (key: string) => string,
): ServiceItemRow[] {
  return ITEM_KEYS[serviceKey].map((key) => ({
    id: key,
    label: getLabel(key),
  }));
}

function getServiceLabel(
  s: ReturnType<typeof getStrings>["partner"]["settings"],
  key: ItemizeServiceKey,
): string {
  switch (key) {
    case "washAndFold":
      return s.categoryWashAndFold;
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
): ItemizeServiceKey | null {
  const raw = params.service;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return ITEMIZE_SERVICE_KEYS.includes(raw as ItemizeServiceKey)
    ? (raw as ItemizeServiceKey)
    : null;
}

/**
 * Dry Cleaning / Tailoring - Itemize: list of items with name + price only (no quantity).
 * Continue saves prices to the database when at least one price is set.
 */
export default function ServiceOtherScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: string }>();
  const { locale } = useLocale();
  const onboardingStrings = getStrings(locale).partner.onboarding;
  const settingsStrings = getStrings(locale).partner.settings;
  const {
    washAndFoldPricing,
    setWashAndFoldPricing,
    setDryCleaningPricing,
    setTailoringPricing,
    washFoldItemizeState,
    setWashFoldItemizeState,
    dryCleaningItemizeState,
    setDryCleaningItemizeState,
    tailoringItemizeState,
    setTailoringItemizeState,
    submitOnboardingServices,
    isSubmittingOnboardingServices,
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
  const [washFoldTab, setWashFoldTab] = useState<WashFoldPriceTab>("items");

  const isWashFold = serviceKey === "washAndFold";
  const showHeaderAddButton = !isWashFold || washFoldTab === "items";

  useEffect(() => {
    if (serviceKey == null) return;
    const saved =
      serviceKey === "washAndFold"
        ? washFoldItemizeState
        : serviceKey === "dryCleaning"
          ? dryCleaningItemizeState
          : tailoringItemizeState;
    const getLabelForKey = (key: string) => getItemLabel(onboardingStrings, key);

    if (serviceKey === "washAndFold") {
      let legacyPerItem =
        washAndFoldPricing?.rows.find(
          (row) =>
            row.label === onboardingStrings.pricePerItemLabel ||
            row.label === "Price per Item",
        )?.value?.trim() ?? "";

      if (saved?.items?.length) {
        const merged = mergeWashFoldCatalog(
          saved.items,
          saved.prices ?? {},
          getLabelForKey,
        );
        setItems(merged.items);
        const nextPrices = { ...merged.prices };
        for (const row of merged.items) {
          if (nextPrices[row.id] === undefined || nextPrices[row.id] === "") {
            nextPrices[row.id] = isWashFoldPackageItem(row) ? "" : legacyPerItem;
          }
        }
        setPrices(nextPrices);
      } else {
        const defaultItems = buildWashFoldDefaultItems(getLabelForKey);
        const initialPrices: Record<string, string> = {};
        defaultItems.forEach((item) => {
          initialPrices[item.id] = isWashFoldPackageItemId(item.id)
            ? ""
            : legacyPerItem;
        });
        setItems(defaultItems);
        setPrices(initialPrices);
      }
      setWashFoldTab("items");
    } else if (saved?.items?.length) {
      setItems(saved.items);
      setPrices(saved.prices ?? {});
    } else {
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

  const pricedRows: ServicePricingRow[] = items
    .map((item) => ({
      label: item.label,
      value: prices[item.id]?.trim() ?? "",
    }))
    .filter((row) => {
      if (!row.value.length) return false;
      const amount = parsePriceDisplay(row.value);
      return amount != null && amount > 0;
    });

  const canContinue = serviceKey != null && pricedRows.length > 0;

  const persistPricingToDatabase = async (
    key: ItemizeServiceKey,
    pricingWithRows: ServicePricing,
    itemize: ItemizeState,
  ): Promise<boolean> => {
    if (key === "washAndFold") {
      setWashAndFoldPricing(pricingWithRows);
      setWashFoldItemizeState(itemize);
    } else if (key === "dryCleaning") {
      setDryCleaningPricing(pricingWithRows);
      setDryCleaningItemizeState(itemize);
    } else if (key === "tailoring") {
      setTailoringPricing(pricingWithRows);
      setTailoringItemizeState(itemize);
    }

    const snapshot: OnboardingServicesSnapshot = { [key]: pricingWithRows };
    const result = await submitOnboardingServices(snapshot);
    if (!result.ok) {
      showAppAlert(
        "Could not save prices",
        result.error ?? "Please try again.",
      );
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (serviceKey == null) return;
    const itemize: ItemizeState = { items, prices };
    if (!canContinue) {
      if (serviceKey === "washAndFold") {
        setWashAndFoldPricing(null);
        setWashFoldItemizeState(itemize);
      } else if (serviceKey === "dryCleaning") {
        setDryCleaningPricing(null);
        setDryCleaningItemizeState(itemize);
      } else if (serviceKey === "tailoring") {
        setTailoringPricing(null);
        setTailoringItemizeState(itemize);
      }
      router.back();
      return;
    }
    const ok = await persistPricingToDatabase(
      serviceKey,
      { rows: pricedRows },
      itemize,
    );
    if (!ok) return;
    router.back();
  };

  const handleBack = async () => {
    if (serviceKey == null) {
      router.back();
      return;
    }
    if (items.length === 0) {
      if (serviceKey === "washAndFold") {
        setWashAndFoldPricing(null);
        setWashFoldItemizeState(null);
      } else if (serviceKey === "dryCleaning") {
        setDryCleaningPricing(null);
        setDryCleaningItemizeState(null);
      } else if (serviceKey === "tailoring") {
        setTailoringPricing(null);
        setTailoringItemizeState(null);
      }
      router.back();
      return;
    }

    const itemize: ItemizeState = { items, prices };
    if (pricedRows.length > 0) {
      const ok = await persistPricingToDatabase(
        serviceKey,
        { rows: pricedRows },
        itemize,
      );
      if (!ok) return;
    } else if (serviceKey === "washAndFold") {
      setWashFoldItemizeState(itemize);
    } else if (serviceKey === "dryCleaning") {
      setDryCleaningItemizeState(itemize);
    } else if (serviceKey === "tailoring") {
      setTailoringItemizeState(itemize);
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
  const title = serviceName;

  const garmentItems = isWashFold
    ? items.filter((item) => !isWashFoldPackageItem(item))
    : items;
  const packageItems = isWashFold
    ? items.filter((item) => isWashFoldPackageItem(item))
    : [];
  const visibleItems = isWashFold
    ? washFoldTab === "packages"
      ? packageItems
      : garmentItems
    : items;
  const pricedGarmentCount = garmentItems.filter(
    (item) => (prices[item.id]?.trim() ?? "").length > 0,
  ).length;
  const pricedPackageCount = packageItems.filter(
    (item) => (prices[item.id]?.trim() ?? "").length > 0,
  ).length;

  const packageDescriptions = useMemo(
    () => ({
      washFoldPkg25: onboardingStrings.washFoldPkg25Desc,
      washFoldPkg50: onboardingStrings.washFoldPkg50Desc,
      washFoldPkg75: onboardingStrings.washFoldPkg75Desc,
      washFoldPkg100: onboardingStrings.washFoldPkg100Desc,
    }),
    [onboardingStrings],
  );

  const packageDescription = (item: ServiceItemRow) =>
    getWashFoldPackageDescription(
      item,
      packageDescriptions,
      onboardingStrings.washFoldPackageBoxCustomDesc,
    );

  const renderPackageBox = (item: ServiceItemRow) => {
    const isCustomPackage = isWashFoldCustomPackageId(item.id);

    return (
      <WashFoldPackageBox
        key={item.id}
        mode="partner"
        title={item.label}
        description={packageDescription(item)}
        priceValue={prices[item.id] ?? ""}
        pricePlaceholder={onboardingStrings.itemizePricePlaceholder}
        onPriceChange={(text) => setPrice(item.id, text)}
        priceSetLabel={onboardingStrings.washFoldPackageBoxPriceSet}
        onRemove={isCustomPackage ? () => removeItem(item.id) : undefined}
        removeAccessibilityLabel={`Remove ${item.label}`}
      />
    );
  };

  const renderItemRow = (item: ServiceItemRow) => (
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
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.label}`}
      >
        <MaterialCommunityIcons name="close" size={22} color={c.white} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader
        title={title}
        leftIcon="arrow-left"
        onLeftPress={handleBack}
        rightElement={
          showHeaderAddButton ? (
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
          ) : undefined
        }
        leftAccessibilityLabel={onboardingStrings.back}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {isWashFold ? (
          <>
            <View style={styles.tabRow}>
              <Pressable
                onPress={() => setWashFoldTab("items")}
                style={({ pressed }) => [
                  styles.tabBtn,
                  washFoldTab === "items" && styles.tabBtnActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: washFoldTab === "items" }}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    washFoldTab === "items" && styles.tabLabelActive,
                  ]}
                >
                  {onboardingStrings.washFoldTabItems}
                </Text>
                {pricedGarmentCount > 0 ? (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{pricedGarmentCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => setWashFoldTab("packages")}
                style={({ pressed }) => [
                  styles.tabBtn,
                  washFoldTab === "packages" && styles.tabBtnActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: washFoldTab === "packages" }}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    washFoldTab === "packages" && styles.tabLabelActive,
                  ]}
                >
                  {onboardingStrings.washFoldTabPackages}
                </Text>
                {pricedPackageCount > 0 ? (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{pricedPackageCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
            <Text style={styles.lead}>
              {washFoldTab === "packages"
                ? onboardingStrings.washFoldPackagesTabLead
                : onboardingStrings.washFoldPricingLead}
            </Text>
          </>
        ) : null}
        {isWashFold && washFoldTab === "packages" ? (
          <WashFoldPackageGrid>
            {packageItems.map(renderPackageBox)}
          </WashFoldPackageGrid>
        ) : (
          visibleItems.map(renderItemRow)
        )}

        <AppButton
          label={onboardingStrings.continue}
          onPress={handleContinue}
          variant="filled"
          rightIcon="arrow-right"
          fullWidth
          disabled={isSubmittingOnboardingServices}
          style={styles.continueBtn}
          accessibilityLabel={onboardingStrings.continue}
        />
      </ScrollView>
    </KeyboardAvoidingView>

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
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  lead: {
    fontSize: fs.descText,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 21,
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: fs.descText,
    color: c.blue500,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  tabBtnActive: {
    backgroundColor: c.white,
    borderColor: c.white,
  },
  tabLabel: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  tabLabelActive: {
    color: c.themeBlack,
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: c.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.white,
  },
  emptyTabText: {
    fontSize: fs.descText,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 20,
    marginBottom: 12,
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
