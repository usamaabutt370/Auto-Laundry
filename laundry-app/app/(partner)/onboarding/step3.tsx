import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormTextInput } from "@/components/form-text-input";
import { AppButton } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useMerchantServices } from "@/contexts/merchant-services-context";
import { getStrings } from "@/locales";
import { allowDecimalOnly } from "@/utils/input-filter";

const c = theme.colors;
const fs = theme.fontSize;

const SERVICE_KEYS = ["washAndFold", "dryCleaning", "tailoring"] as const;
type ServiceKey = (typeof SERVICE_KEYS)[number];

function getServiceLabel(
  s: ReturnType<typeof getStrings>["partner"]["settings"],
  key: ServiceKey,
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

function parseServiceKey(
  params: Record<string, string | string[] | undefined>,
): ServiceKey | null {
  const raw = params.service;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return SERVICE_KEYS.includes(raw as ServiceKey) ? (raw as ServiceKey) : null;
}

/**
 * Service detail: set pricing and details for one selected service.
 * Title = selected service name. Sections: Price per bag, Price per KG, Price per Item.
 * Save only updates onboarding draft; DB write happens on Step 2 Finish.
 */
export default function PartnerOnboardingStep3() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: string }>();
  const { locale } = useLocale();
  const onboardingStrings = getStrings(locale).partner.onboarding;
  const settingsStrings = getStrings(locale).partner.settings;
  const { washAndFoldPricing, setWashAndFoldPricing } = useMerchantServices();

  const serviceKey = useMemo(
    () =>
      parseServiceKey(params as Record<string, string | string[] | undefined>),
    [params],
  );

  const r = washAndFoldPricing?.rows ?? [];
  const getSavedValue = (label: string) =>
    r.find((row) => row.label === label)?.value ?? "";
  const [pricePerBag, setPricePerBag] = useState(() =>
    getSavedValue(onboardingStrings.pricePerBagLabel),
  );
  const [pricePerKg, setPricePerKg] = useState(() =>
    getSavedValue(onboardingStrings.pricePerKgLabel),
  );
  const [pricePerItem, setPricePerItem] = useState(() =>
    getSavedValue(onboardingStrings.pricePerItemLabel),
  );

  const hasAtLeastOnePrice =
    pricePerBag.trim().length > 0 ||
    pricePerKg.trim().length > 0 ||
    pricePerItem.trim().length > 0;

  const handleSave = async () => {
    if (serviceKey == null) return;
    if (!hasAtLeastOnePrice) {
      setWashAndFoldPricing(null);
      router.back();
      return;
    }
    const rows = [
      { label: onboardingStrings.pricePerBagLabel, value: pricePerBag.trim() },
      { label: onboardingStrings.pricePerKgLabel, value: pricePerKg.trim() },
      { label: onboardingStrings.pricePerItemLabel, value: pricePerItem.trim() },
    ].filter((row) => row.value.length > 0);
    setWashAndFoldPricing({ rows });
    router.back();
  };

  useEffect(() => {
    if (serviceKey == null) {
      router.replace("/(partner)/onboarding/step2");
    } else if (serviceKey !== "washAndFold") {
      router.replace({
        pathname: "/(partner)/onboarding/service-other",
        params: { service: serviceKey },
      });
    }
  }, [serviceKey, router]);

  if (serviceKey == null || serviceKey !== "washAndFold") {
    return null;
  }

  const serviceName = getServiceLabel(settingsStrings, serviceKey);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader
        title={serviceName}
        leftIcon="arrow-left"
        onLeftPress={() => router.back()}
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
        {/* Price per bag – same pill input as Business Detail */}
        <Text style={styles.sectionHeading}>
          {onboardingStrings.pricePerBagLabel}
        </Text>
        <FormTextInput
          placeholder={onboardingStrings.enterPricePerBagPlaceholder}
          value={pricePerBag ?? ""}
          onChangeText={(t) => setPricePerBag(allowDecimalOnly(t))}
          keyboardType="decimal-pad"
          editable
        />

        {/* Price per KG */}
        <Text style={styles.sectionHeading}>
          {onboardingStrings.pricePerKgLabel}
        </Text>
        <FormTextInput
          placeholder={onboardingStrings.enterPricePerBagPlaceholder}
          value={pricePerKg ?? ""}
          onChangeText={(t) => setPricePerKg(allowDecimalOnly(t))}
          keyboardType="decimal-pad"
          editable
        />

        {/* Price per Item */}
        <Text style={styles.sectionHeading}>
          {onboardingStrings.pricePerItemLabel}
        </Text>
        <FormTextInput
          placeholder={onboardingStrings.enterPricePerBagPlaceholder}
          value={pricePerItem ?? ""}
          onChangeText={(t) => setPricePerItem(allowDecimalOnly(t))}
          keyboardType="decimal-pad"
          editable
        />

        <AppButton
          label={settingsStrings.save}
          onPress={handleSave}
          variant="filled"
          rightIcon="check"
          fullWidth
          style={styles.saveBtn}
          accessibilityLabel={settingsStrings.save}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  sectionHeading: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    marginBottom: 10,
  },
  saveBtn: {
    marginTop: 24,
  },
});
