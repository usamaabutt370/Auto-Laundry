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

import { AppButton } from "@/components/ui/button";
import { PartnerHeader } from "@/components/partner-header";
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
 * Title = selected service name. Sections: Price per bag, Price per KG, Price per Item. Save adds to merchant services and goes back.
 */
export default function PartnerOnboardingStep3() {
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

  const [pricePerBag, setPricePerBag] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [pricePerItem, setPricePerItem] = useState("");

  const canSave =
    serviceKey != null &&
    pricePerBag.trim().length > 0 &&
    pricePerKg.trim().length > 0 &&
    pricePerItem.trim().length > 0;

  const handleSave = async () => {
    if (serviceKey == null || !canSave) return;
    const name = getServiceLabel(settingsStrings, serviceKey);
    await addService({
      name,
      priceDisplay: pricePerBag.trim(),
      category: name,
    });
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
      <PartnerHeader
        title={serviceName}
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
        {/* Price per bag – for merchant service */}
        <Text style={styles.sectionHeading}>
          {onboardingStrings.pricePerBagLabel}
        </Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder={onboardingStrings.enterPricePerBagPlaceholder}
            placeholderTextColor={c.blue500}
            value={pricePerBag ?? ""}
            onChangeText={(t) => setPricePerBag(allowDecimalOnly(t))}
            keyboardType="decimal-pad"
            editable
            {...(Platform.OS === "android" && { includeFontPadding: false })}
          />
        </View>

        {/* Price per KG */}
        <Text style={styles.sectionHeading}>
          {onboardingStrings.pricePerKgLabel}
        </Text>
        <View style={styles.card}>
          <View style={styles.weightRow}>
            <TextInput
              style={[styles.input, styles.weightInput]}
              placeholder={onboardingStrings.enterPricePerBagPlaceholder}
              placeholderTextColor={c.blue500}
              value={pricePerKg ?? ""}
              onChangeText={(t) => setPricePerKg(allowDecimalOnly(t))}
              keyboardType="decimal-pad"
              editable
              {...(Platform.OS === "android" && { includeFontPadding: false })}
            />
            <Text style={styles.unit}>{onboardingStrings.weightUnitKg}</Text>
          </View>
        </View>

        {/* Price per Item */}
        <Text style={styles.sectionHeading}>
          {onboardingStrings.pricePerItemLabel}
        </Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder={onboardingStrings.enterPricePerBagPlaceholder}
            placeholderTextColor={c.blue500}
            value={pricePerItem ?? ""}
            onChangeText={(t) => setPricePerItem(allowDecimalOnly(t))}
            keyboardType="decimal-pad"
            editable
            {...(Platform.OS === "android" && { includeFontPadding: false })}
          />
        </View>

        <AppButton
          label={settingsStrings.save}
          onPress={handleSave}
          variant="filled"
          rightIcon="check"
          fullWidth
          disabled={!canSave}
          style={styles.saveBtn}
          accessibilityLabel={settingsStrings.save}
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
  sectionHeading: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    marginBottom: 10,
  },
  card: {
    backgroundColor: c.blue900,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.outline,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  input: {
    backgroundColor: c.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: fs.xSmallText,
    color: c.white,
    minHeight: 48,
    height: 48,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weightInput: {
    flex: 1,
  },
  unit: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
  saveBtn: {
    marginTop: 24,
  },
});
