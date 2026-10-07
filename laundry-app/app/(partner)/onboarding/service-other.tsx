import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { assets } from "@/assets/assets";

import { showAppAlert } from "@/components/app-alert";
import { AppCtaButton } from "@/components/ui/cta-button";
import { UI } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import type {
  ItemizeState,
  OnboardingServicesSnapshot,
  ServicePricing,
  ServicePricingRow,
} from "@/contexts/merchant-services-context";
import {
  parseWashFoldAddOnLabel,
  useMerchantServices,
} from "@/contexts/merchant-services-context";
import {
  DRY_CLEAN_SUIT_2_PIECE_ID,
  DRY_CLEAN_SUIT_3_PIECE_ID,
  mergeDryCleanCatalog,
  PARTNER_DRY_CLEANING_ITEM_KEYS,
} from "@/constants/dry-clean-items";
import {
  isWashFoldPackageItem,
  mergePressCatalog,
  mergeWashFoldCatalog,
  PARTNER_PRESS_GARMENT_KEYS,
  PARTNER_WASH_FOLD_GARMENT_KEYS,
} from "@/constants/partner-wash-fold-items";
import {
  isLadiesTailoringItem,
  mergeTailoringCatalog,
  PARTNER_TAILORING_ITEM_KEYS,
} from "@/constants/tailoring-items";
import { getStrings } from "@/locales";
import {
  fetchPartnerServiceDetail,
  savePartnerServiceDetail,
  SERVICE_DETAIL_CATEGORIES,
} from "@/lib/partner-service-details";
import { allowDecimalOnly } from "@/utils/input-filter";
import { parsePriceDisplay } from "@/utils/parse-price-display";

const ITEMIZE_SERVICE_KEYS = ["washAndFold", "dryCleaning", "tailoring", "press"] as const;
type ItemizeServiceKey = (typeof ITEMIZE_SERVICE_KEYS)[number];

const ITEM_KEYS: Record<"dryCleaning" | "tailoring", readonly string[]> = {
  dryCleaning: PARTNER_DRY_CLEANING_ITEM_KEYS,
  tailoring: PARTNER_TAILORING_ITEM_KEYS,
};

function isWashFoldLikeService(key: ItemizeServiceKey | null): boolean {
  return key === "washAndFold" || key === "press";
}

function buildWashFoldDefaultItems(
  getLabel: (key: string) => string,
): ServiceItemRow[] {
  return PARTNER_WASH_FOLD_GARMENT_KEYS.map((key) => ({
    id: key,
    label: getLabel(key),
  }));
}

function buildPressDefaultItems(
  getLabel: (key: string) => string,
): ServiceItemRow[] {
  return PARTNER_PRESS_GARMENT_KEYS.map((key) => ({
    id: key,
    label: getLabel(key),
  }));
}

export interface ServiceItemRow {
  id: string;
  label: string;
}

function getDefaultItems(
  serviceKey: "dryCleaning" | "tailoring",
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
    case "press":
      return s.categoryPress;
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
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ service?: string }>();
  const { locale } = useLocale();
  const { user } = useAuth();
  const onboardingStrings = getStrings(locale).partner.onboarding;
  const settingsStrings = getStrings(locale).partner.settings;
  const {
    washAndFoldPricing,
    setWashAndFoldPricing,
    setDryCleaningPricing,
    setTailoringPricing,
    setPressPricing,
    washFoldItemizeState,
    setWashFoldItemizeState,
    dryCleaningItemizeState,
    setDryCleaningItemizeState,
    tailoringItemizeState,
    setTailoringItemizeState,
    pressItemizeState,
    setPressItemizeState,
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
  const [serviceImages, setServiceImages] = useState<string[]>([]);
  const [expressPrice, setExpressPrice] = useState("");
  const [tailoringServiceTypes, setTailoringServiceTypes] = useState<string[]>([
    "stitching",
  ]);
  const [measurementMode, setMeasurementMode] = useState("customer");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const isWashFoldLike = isWashFoldLikeService(serviceKey);

  useEffect(() => {
    if (serviceKey == null) return;
    const saved =
      serviceKey === "washAndFold"
        ? washFoldItemizeState
        : serviceKey === "press"
          ? pressItemizeState
          : serviceKey === "dryCleaning"
            ? dryCleaningItemizeState
            : tailoringItemizeState;
    const getLabelForKey = (key: string) => getItemLabel(onboardingStrings, key);

    setServiceImages(saved?.images ?? []);
    const express = (saved?.addOns ?? []).find((row) =>
      /express|ایکسپریس/i.test(row.label),
    );
    setExpressPrice(express?.price ?? "");
    if (serviceKey === "tailoring") {
      setTailoringServiceTypes(
        saved?.tailoringServiceTypes?.length
          ? saved.tailoringServiceTypes
          : ["stitching"],
      );
      setMeasurementMode(saved?.measurementMode?.trim() || "customer");
    } else {
      setTailoringServiceTypes(["stitching"]);
      setMeasurementMode("customer");
    }

    if (isWashFoldLikeService(serviceKey)) {
      let legacyPerItem =
        washAndFoldPricing?.rows.find(
          (row) =>
            row.label === onboardingStrings.pricePerItemLabel ||
            row.label === "Price per Item",
        )?.value?.trim() ?? "";

      if (saved?.items?.length) {
        const garmentOnly = saved.items.filter(
          (row) => parseWashFoldAddOnLabel(row.label) == null,
        );
        const merged =
          serviceKey === "press"
            ? mergePressCatalog(garmentOnly, saved.prices ?? {}, getLabelForKey)
            : mergeWashFoldCatalog(
                garmentOnly,
                saved.prices ?? {},
                getLabelForKey,
              );
        const withoutPackages = merged.items.filter(
          (row) => !isWashFoldPackageItem(row),
        );
        setItems(withoutPackages);
        const nextPrices: Record<string, string> = {};
        for (const row of withoutPackages) {
          nextPrices[row.id] = merged.prices[row.id] ?? legacyPerItem;
        }
        setPrices(nextPrices);
      } else {
        const defaultItems =
          serviceKey === "press"
            ? buildPressDefaultItems(getLabelForKey)
            : buildWashFoldDefaultItems(getLabelForKey);
        const initialPrices: Record<string, string> = {};
        defaultItems.forEach((item) => {
          initialPrices[item.id] = legacyPerItem;
        });
        setItems(defaultItems);
        setPrices(initialPrices);
      }
    } else if (serviceKey === "dryCleaning") {
      if (saved?.items?.length) {
        const garmentOnly = saved.items.filter(
          (row) => parseWashFoldAddOnLabel(row.label) == null,
        );
        const merged = mergeDryCleanCatalog(
          garmentOnly,
          saved.prices ?? {},
          getLabelForKey,
        );
        setItems(merged.items);
        setPrices(merged.prices);
      } else {
        const defaultItems = getDefaultItems("dryCleaning", getLabelForKey);
        setItems(defaultItems);
        const initialPrices: Record<string, string> = {};
        defaultItems.forEach((item) => {
          initialPrices[item.id] = "";
        });
        setPrices(initialPrices);
      }
    } else if (serviceKey === "tailoring") {
      if (saved?.items?.length) {
        const garmentOnly = saved.items.filter(
          (row) => parseWashFoldAddOnLabel(row.label) == null,
        );
        const merged = mergeTailoringCatalog(
          garmentOnly,
          saved.prices ?? {},
          getLabelForKey,
        );
        setItems(merged.items);
        setPrices(merged.prices);
      } else {
        const defaultItems = getDefaultItems("tailoring", getLabelForKey);
        setItems(defaultItems);
        const initialPrices: Record<string, string> = {};
        defaultItems.forEach((item) => {
          initialPrices[item.id] = "";
        });
        setPrices(initialPrices);
      }
    }
    // Only reset when switching service; use saved state if present so removals persist
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceKey]);

  useEffect(() => {
    if (!user?.id || serviceKey == null) return;
    let cancelled = false;
    void fetchPartnerServiceDetail(
      user.id,
      SERVICE_DETAIL_CATEGORIES[serviceKey],
    ).then((detail) => {
      if (cancelled || !detail) return;
      setServiceImages((current) => (current.length > 0 ? current : detail.images));
    });
    return () => {
      cancelled = true;
    };
  }, [serviceKey, user?.id]);

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

  const pricedRows: ServicePricingRow[] = (() => {
    const rows = items
      .filter((item) => !isWashFoldPackageItem(item))
      .map((item) => ({
        label: item.label,
        value: prices[item.id]?.trim() ?? "",
      }))
      .filter((row) => {
        if (!row.value.length) return false;
        const amount = parsePriceDisplay(row.value);
        return amount != null && amount > 0;
      });

    const expressValue = expressPrice.trim();
    const expressAmount = parsePriceDisplay(expressValue);
    if (expressValue.length && expressAmount != null && expressAmount > 0) {
      rows.push({
        label: `Add-on · ${onboardingStrings.expressServiceDefault}`,
        value: expressValue,
      });
    }

    // Suit card writes prices by fixed ids — always include them even if items[] drifted.
    if (serviceKey === "dryCleaning") {
      const getLabelForKey = (key: string) =>
        getItemLabel(onboardingStrings, key);
      for (const suitId of [
        DRY_CLEAN_SUIT_2_PIECE_ID,
        DRY_CLEAN_SUIT_3_PIECE_ID,
      ] as const) {
        const value = prices[suitId]?.trim() ?? "";
        if (!value.length) continue;
        const amount = parsePriceDisplay(value);
        if (amount == null || amount <= 0) continue;
        const label =
          items.find((item) => item.id === suitId)?.label ??
          getLabelForKey(suitId);
        const already = rows.some(
          (row) => row.label.trim().toLowerCase() === label.trim().toLowerCase(),
        );
        if (!already) rows.push({ label, value });
      }
    }
    return rows;
  })();

  const canContinue = serviceKey != null && pricedRows.length > 0;

  const buildItemizeState = (): ItemizeState => ({
    items: items.filter((item) => !isWashFoldPackageItem(item)),
    prices,
    images: serviceImages,
    addOns: expressPrice.trim()
      ? [
          {
            id: "express",
            label: onboardingStrings.expressServiceDefault,
            price: expressPrice.trim(),
            unit: "",
          },
        ]
      : [],
    ...(serviceKey === "tailoring"
      ? {
          tailoringServiceTypes,
          measurementMode,
        }
      : {}),
  });

  const toggleTailoringServiceType = (typeId: string) => {
    setTailoringServiceTypes((prev) => {
      if (prev.includes(typeId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const MAX_SERVICE_IMAGES = 10;

  const pickServiceImage = async () => {
    if (serviceImages.length >= MAX_SERVICE_IMAGES) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAppAlert(
        onboardingStrings.serviceImagePermissionTitle,
        onboardingStrings.serviceImagePermissionMessage,
      );
      return;
    }
    const remaining = MAX_SERVICE_IMAGES - serviceImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    const uris = result.assets.map((asset) => asset.uri).filter(Boolean);
    setServiceImages((prev) => [...prev, ...uris].slice(0, MAX_SERVICE_IMAGES));
  };

  const removeServiceImage = (uri: string) => {
    setServiceImages((prev) => prev.filter((image) => image !== uri));
  };

  const persistPricingToDatabase = async (
    key: ItemizeServiceKey,
    pricingWithRows: ServicePricing,
    itemize: ItemizeState,
  ): Promise<boolean> => {
    if (key === "washAndFold") {
      setWashAndFoldPricing(pricingWithRows);
      setWashFoldItemizeState(itemize);
    } else if (key === "press") {
      setPressPricing(pricingWithRows);
      setPressItemizeState(itemize);
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

    if (user?.id) {
      const savedDetail = await savePartnerServiceDetail({
        partnerId: user.id,
        category: SERVICE_DETAIL_CATEGORIES[key],
        images: itemize.images ?? [],
        serviceTypes: itemize.tailoringServiceTypes,
        measurementMode: itemize.measurementMode ?? null,
      });
      if (!savedDetail.ok) {
        showAppAlert("Could not save service images", savedDetail.error);
        return false;
      }
      const withRemoteImages: ItemizeState = { ...itemize, images: savedDetail.images };
      if (key === "washAndFold") setWashFoldItemizeState(withRemoteImages);
      else if (key === "press") setPressItemizeState(withRemoteImages);
      else if (key === "dryCleaning") setDryCleaningItemizeState(withRemoteImages);
      else setTailoringItemizeState(withRemoteImages);
      setServiceImages(savedDetail.images);
    }
    return true;
  };

  const handleContinue = async () => {
    if (serviceKey == null) return;
    const itemize = buildItemizeState();
    if (!canContinue) {
      if (serviceKey === "washAndFold") {
        setWashAndFoldPricing(null);
        setWashFoldItemizeState(itemize);
      } else if (serviceKey === "press") {
        setPressPricing(null);
        setPressItemizeState(itemize);
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

  const handleBack = () => {
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

  const sheetMeta = (() => {
    switch (serviceKey) {
      case "washAndFold":
        return {
          title: onboardingStrings.washFoldDetailsTitle,
          subtitle: onboardingStrings.washFoldDetailsSubtitle,
          art: assets.images.home_deal_laundry,
          artFit: "cover" as const,
          imagesHint: onboardingStrings.washFoldImagesHint,
        };
      case "dryCleaning":
        return {
          title: onboardingStrings.dryCleaningDetailsTitle,
          subtitle: onboardingStrings.dryCleaningDetailsSubtitle,
          art: assets.images.serviceSuit2Piece,
          artFit: "contain" as const,
          imagesHint: onboardingStrings.dryCleaningImagesHint,
        };
      case "press":
        return {
          title: onboardingStrings.pressDetailsTitle,
          subtitle: onboardingStrings.pressDetailsSubtitle,
          art: assets.images.home_category_ironing,
          artFit: "cover" as const,
          imagesHint: onboardingStrings.serviceImagesHint,
        };
      case "tailoring":
        return {
          title: onboardingStrings.tailoringDetailsTitle,
          subtitle: onboardingStrings.tailoringDetailsSubtitle,
          art: assets.images.home_deal_tailoring,
          artFit: "cover" as const,
          imagesHint: onboardingStrings.serviceImagesHint,
        };
      default:
        return {
          title: getServiceLabel(settingsStrings, serviceKey),
          subtitle: "",
          art: assets.images.home_deal_laundry,
          artFit: "cover" as const,
          imagesHint: onboardingStrings.serviceImagesHint,
        };
    }
  })();

  const sheetItems = isWashFoldLike
    ? items.filter((item) => !isWashFoldPackageItem(item))
    : items;

  const renderSheetItemRow = (item: ServiceItemRow) => (
    <View key={item.id} style={styles.pricingRow}>
      <TextInput
        value={item.label}
        onChangeText={(text) =>
          setItems((prev) =>
            prev.map((row) => (row.id === item.id ? { ...row, label: text } : row)),
          )
        }
        placeholder={onboardingStrings.newItemNamePlaceholder}
        placeholderTextColor={UI.muted}
        style={styles.pricingNameInput}
        numberOfLines={1}
      />
      <View style={styles.pricingPriceField}>
        <Text style={styles.sheetRs}>Rs.</Text>
        <TextInput
          value={prices[item.id] ?? ""}
          onChangeText={(text) => setPrice(item.id, text)}
          placeholder="0"
          placeholderTextColor={UI.muted}
          keyboardType="decimal-pad"
          style={styles.pricingPriceInput}
          maxLength={4}
          {...(Platform.OS === "android" && { includeFontPadding: false })}
        />
      </View>
      <View style={styles.pricingUnitLabel}>
        <Text style={styles.pricingUnitText} numberOfLines={1}>
          {onboardingStrings.perPiece}
        </Text>
      </View>
      <Pressable
        onPress={() => removeItem(item.id)}
        style={({ pressed }) => [styles.pricingDelete, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.label}`}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={18} color={UI.red} />
      </Pressable>
    </View>
  );

  const sheetHeight = Math.round(windowHeight * 0.9);
  return (
    <View style={styles.sheetBackdrop}>
      <StatusBar style="dark" />
      <Pressable
        style={styles.sheetDismiss}
        onPress={() => void handleBack()}
        accessibilityRole="button"
        accessibilityLabel={onboardingStrings.back}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheet, { height: sheetHeight }]}
      >
        <View style={styles.sheetHandleWrap}>
          <View style={styles.sheetHandle} />
        </View>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetArt}>
            <Image
              source={sheetMeta.art}
              style={styles.sheetArtImage}
              contentFit={sheetMeta.artFit}
            />
          </View>
          <View style={styles.sheetHeaderCopy}>
            <Text style={styles.sheetTitle}>{sheetMeta.title}</Text>
            <Text style={styles.sheetSubtitle}>{sheetMeta.subtitle}</Text>
          </View>
          <Pressable
            onPress={() => void handleBack()}
            style={styles.sheetClose}
            accessibilityRole="button"
            accessibilityLabel={onboardingStrings.back}
          >
            <MaterialCommunityIcons name="close" size={18} color={UI.text} />
          </Pressable>
        </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sheetSectionTitle}>
              {onboardingStrings.itemsAndPricing}
            </Text>
            <Text style={styles.lead}>{onboardingStrings.itemsAndPricingHint}</Text>
          {serviceKey === "tailoring"
            ? (() => {
                let ladiesHeaderShown = false;
                return sheetItems.map((item) => {
                  const isLadies = isLadiesTailoringItem(item.id);
                  const showHeader = isLadies && !ladiesHeaderShown;
                  if (isLadies) ladiesHeaderShown = true;
                  return (
                    <React.Fragment key={item.id}>
                      {showHeader ? (
                        <Text style={styles.sectionHeader}>
                          {(onboardingStrings as Record<string, string>).tailoringLadiesSection ??
                            "Ladies Stitching"}
                        </Text>
                      ) : null}
                      {renderSheetItemRow(item)}
                    </React.Fragment>
                  );
                });
              })()
            : sheetItems.map(renderSheetItemRow)}
          <Pressable
            onPress={() => setAddModalVisible(true)}
            style={({ pressed }) => [styles.addItemBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={onboardingStrings.addAnotherItem}
          >
            <MaterialCommunityIcons name="plus" size={18} color={UI.blue} />
            <Text style={styles.addItemText}>{onboardingStrings.addAnotherItem}</Text>
          </Pressable>

          {serviceKey === "tailoring" ? (
            <>
              <Text style={[styles.sheetSectionTitle, styles.sheetSectionSpaced]}>
                {onboardingStrings.tailoringServiceTypeTitle}
              </Text>
              <Text style={styles.choiceLead}>{onboardingStrings.tailoringServiceTypeHint}</Text>
              <View style={styles.choiceRow}>
                {(
                  [
                    {
                      id: "stitching",
                      label: onboardingStrings.tailoringTypeStitching,
                      icon: "tshirt-crew-outline" as const,
                    },
                    {
                      id: "alteration",
                      label: onboardingStrings.tailoringTypeAlteration,
                      icon: "scissors-cutting" as const,
                    },
                    {
                      id: "custom",
                      label: onboardingStrings.tailoringTypeCustom,
                      icon: "hanger" as const,
                    },
                  ] as const
                ).map((option) => {
                  const selected = tailoringServiceTypes.includes(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => toggleTailoringServiceType(option.id)}
                      style={({ pressed }) => [
                        styles.choiceCard,
                        selected && styles.choiceCardSelected,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={option.label}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={18}
                        color={selected ? UI.blue : UI.text}
                      />
                      <Text
                        style={[
                          styles.choiceCardLabel,
                          selected && styles.choiceCardLabelSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {option.label}
                      </Text>
                      <View
                        style={[
                          styles.choiceCheck,
                          selected && styles.choiceCheckSelected,
                        ]}
                      >
                        {selected ? (
                          <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sheetSectionTitle, styles.sheetSectionTight]}>
                {onboardingStrings.tailoringMeasurementTitle}
              </Text>
              <Text style={styles.choiceLead}>{onboardingStrings.tailoringMeasurementHint}</Text>
              <View style={styles.choiceRow}>
                {(
                  [
                    {
                      id: "customer",
                      label: onboardingStrings.tailoringMeasureCustomer,
                      icon: "account-outline" as const,
                    },
                    {
                      id: "provider",
                      label: onboardingStrings.tailoringMeasureProvider,
                      icon: "home-outline" as const,
                    },
                  ] as const
                ).map((option) => {
                  const selected = measurementMode === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setMeasurementMode(option.id)}
                      style={({ pressed }) => [
                        styles.choiceCardWide,
                        selected && styles.choiceCardSelected,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option.label}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={18}
                        color={selected ? UI.blue : UI.text}
                      />
                      <Text
                        style={[
                          styles.choiceCardLabel,
                          selected && styles.choiceCardLabelSelected,
                        ]}
                        numberOfLines={3}
                      >
                        {option.label}
                      </Text>
                      <View
                        style={[
                          styles.choiceCheck,
                          selected && styles.choiceCheckSelected,
                        ]}
                      >
                        {selected ? (
                          <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={[styles.sheetSectionTitle, styles.sheetSectionSpaced]}>
            {onboardingStrings.serviceImagesTitle}
          </Text>
          <Text style={styles.lead}>{sheetMeta.imagesHint}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageGallery}
          >
            {serviceImages.map((uri) => (
              <View key={uri} style={styles.imageThumbWrap}>
                <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
                <Pressable
                  onPress={() => removeServiceImage(uri)}
                  style={styles.imageRemoveBtn}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Remove image"
                >
                  <MaterialCommunityIcons name="close" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => void pickServiceImage()}
              style={({ pressed }) => [styles.imageAddBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={onboardingStrings.addImage}
            >
              <MaterialCommunityIcons name="plus" size={22} color={UI.blue} />
              <Text style={styles.imageAddText}>{onboardingStrings.addImage}</Text>
            </Pressable>
          </ScrollView>

          <Text style={[styles.sheetSectionTitle, styles.sheetSectionSpaced]}>
            {onboardingStrings.addOnsTitle}
          </Text>
          <Text style={styles.lead}>{onboardingStrings.addOnsHint}</Text>
          <View style={styles.pricingRow}>
            <View style={styles.expressName}>
              <Text style={styles.expressNameText} numberOfLines={1}>
                {onboardingStrings.expressServiceDefault}
              </Text>
            </View>
            <View style={styles.pricingPriceField}>
              <Text style={styles.sheetRs}>Rs.</Text>
              <TextInput
                style={styles.pricingPriceInput}
                value={expressPrice}
                onChangeText={(text) => setExpressPrice(allowDecimalOnly(text))}
                placeholder="0"
                placeholderTextColor={UI.muted}
                keyboardType="decimal-pad"
                maxLength={4}
                {...(Platform.OS === "android" && { includeFontPadding: false })}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.sheetFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AppCtaButton
            label={onboardingStrings.saveService}
            onPress={handleContinue}
            width="full"
            disabled={isSubmittingOnboardingServices}
            loading={isSubmittingOnboardingServices}
          />
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{onboardingStrings.addItem}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={onboardingStrings.newItemNamePlaceholder}
              placeholderTextColor={UI.muted}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <AppCtaButton
                label={settingsStrings.cancel}
                onPress={() => {
                  setNewItemName("");
                  setAddModalVisible(false);
                }}
                variant="outline"
                width="half"
              />
              <AppCtaButton
                label={onboardingStrings.add}
                onPress={addItem}
                width="half"
                disabled={!newItemName.trim()}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
  },
  scroll: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  lead: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 19,
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    padding: 4,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
  },
  tabLabelActive: {
    color: UI.text,
    fontFamily: "Poppins-Bold",
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: UI.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  emptyTabText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.iconWell,
  },
  pressed: {
    opacity: 0.85,
  },
  cardColumn: {
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  suitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  suitCardTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 12,
  },
  suitPriceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  suitPriceRowSpaced: {
    marginTop: 14,
  },
  suitPriceLabel: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: UI.text,
  },
  packageIncludes: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  itemName: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    flex: 1,
    marginRight: 12,
  },
  priceInput: {
    backgroundColor: UI.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    width: 128,
    minHeight: 40,
    height: 40,
    marginRight: 8,
    textAlign: "center",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    marginRight: 2,
  },
  continueBtn: {
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: UI.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: UI.text,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
    marginTop: 8,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  sheetDismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  sheetHandleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sheetArt: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E7F3FB",
  },
  sheetArtImage: {
    width: "100%",
    height: "100%",
  },
  sheetHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins-Bold",
    color: UI.purpleDeep,
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.iconWell,
  },
  sheetContent: {
    paddingHorizontal: 16, 
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheetSectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.purpleDeep,
    marginBottom: 4,
  },
  sheetSectionSpaced: {
    marginTop: 22,
  },
  sheetSectionTight: {
    marginTop: 14,
  },
  choiceLead: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    lineHeight: 18,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch",
  },
  choiceCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 26,
    gap: 4,
    justifyContent: "flex-start",
  },
  choiceCardWide: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 28,
    gap: 4,
    justifyContent: "flex-start",
  },
  choiceCardSelected: {
    borderColor: UI.blue,
    backgroundColor: "#F5F9FF",
  },
  choiceCardLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  choiceCardLabelSelected: {
    color: UI.blue,
  },
  choiceCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceCheckSelected: {
    borderColor: UI.blue,
    backgroundColor: UI.blue,
  },
  imageGallery: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 4,
    marginBottom: 4,
  },
  imageThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: UI.bg,
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  imageRemoveBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageAddBtn: {
    width: 88,
    height: 88,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#B7D0F5",
    backgroundColor: "#F5F9FF",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  imageAddText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: UI.blue,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  pricingNameInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: UI.text,
  },
  pricingPriceField: {
    width: 78,
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 2,
  },
  pricingPriceInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    padding: 0,
  },
  pricingUnitLabel: {
    width: 58,
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  pricingUnitText: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: UI.text,
    textAlign: "center",
  },
  pricingDelete: {
    width: 36,
    height: 36,
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.redBg,
  },
  expressName: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  expressNameText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  addOnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  addOnDrag: {
    width: 18,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  addOnNameInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: UI.text,
  },
  addOnPriceField: {
    width: 78,
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 2,
  },
  addOnUnitBtn: {
    width: 92,
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  addOnUnitText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: UI.text,
  },
  unitOption: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  unitOptionText: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: UI.text,
  },
  sheetItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sheetNameInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: UI.text,
  },
  sheetPriceField: {
    width: 98,
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 2,
  },
  sheetRs: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
  },
  sheetPriceInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    padding: 0,
  },
  sheetUnit: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetUnitText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: UI.text,
  },
  sheetDelete: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.redBg,
  },
  addItemBtn: {
    marginTop: 4,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F3F7FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addItemText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.blue,
  },
  sheetFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
  },
});
