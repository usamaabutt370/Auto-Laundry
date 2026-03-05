import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OnboardingActionButton } from "@/components/onboarding-action-button";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
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

type DryCleaningItemKey = (typeof DRY_CLEANING_ITEM_KEYS)[number];
type TailoringItemKey = (typeof TAILORING_ITEM_KEYS)[number];

const ITEM_KEYS: Record<OtherServiceKey, readonly string[]> = {
  dryCleaning: DRY_CLEANING_ITEM_KEYS,
  tailoring: TAILORING_ITEM_KEYS,
};

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
 * Continue saves each item to merchant services and goes back.
 */
export default function ServiceOtherScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: string }>();
  const { locale } = useLocale();
  const onboardingStrings = getStrings(locale).partner.onboarding;
  const settingsStrings = getStrings(locale).partner.settings;
  const { addService } = useMerchantServices();

  const serviceKey = useMemo(
    () =>
      parseServiceKey(params as Record<string, string | string[] | undefined>),
    [params],
  );

  const itemKeys = serviceKey != null ? ITEM_KEYS[serviceKey] : [];

  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    [...DRY_CLEANING_ITEM_KEYS, ...TAILORING_ITEM_KEYS].forEach((k) => {
      initial[k] = "";
    });
    return initial;
  });

  const setPrice = (itemKey: string, value: string) => {
    setPrices((prev) => ({ ...prev, [itemKey]: allowDecimalOnly(value) }));
  };

  const canContinue =
    serviceKey != null &&
    itemKeys.length > 0 &&
    itemKeys.every((key) => prices[key]?.trim().length > 0);

  const handleContinue = () => {
    if (serviceKey == null || !canContinue) return;
    const serviceName = getServiceLabel(settingsStrings, serviceKey);
    itemKeys.forEach((itemKey) => {
      const itemName = getItemLabel(onboardingStrings, itemKey);
      const price = prices[itemKey]?.trim() ?? "";
      if (price) {
        addService({
          name: `${serviceName} - ${itemName}`,
          priceDisplay: price,
          category: serviceName,
        });
      }
    });
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
        onLeftPress={() => router.back()}
        rightIcon="tune-variant"
        onRightPress={() => {}}
        leftAccessibilityLabel={onboardingStrings.back}
        rightAccessibilityLabel="Settings"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {itemKeys.map((itemKey) => (
          <View key={itemKey} style={styles.card}>
            <Text style={styles.itemName} numberOfLines={1}>
              {getItemLabel(onboardingStrings, itemKey)}
            </Text>
            <TextInput
              style={styles.priceInput}
              placeholder={onboardingStrings.itemizePricePlaceholder}
              placeholderTextColor={c.blue500}
              value={prices[itemKey] ?? ""}
              onChangeText={(text) => setPrice(itemKey, text)}
              keyboardType="decimal-pad"
              editable
              {...(Platform.OS === "android" && { includeFontPadding: false })}
            />
          </View>
        ))}

        <OnboardingActionButton
          label={onboardingStrings.continue}
          rightIcon="arrow-right"
          onPress={handleContinue}
          disabled={!canContinue}
          style={styles.continueBtn}
          accessibilityLabel={onboardingStrings.continue}
        />
      </ScrollView>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  },
  continueBtn: {
    marginTop: 28,
  },
});
