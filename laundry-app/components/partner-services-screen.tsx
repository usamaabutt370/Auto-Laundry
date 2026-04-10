import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import { FormTextInput } from "@/components/form-text-input";
import { PartnerHeader } from "@/components/partner-header";
import {
  ServiceNoPricesButton,
  ServiceWithPricesCard,
} from "@/components/partner-service-entry";
import { AppButton } from "@/components/ui/button";
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

const CARD_TITLE_KEYS: Record<
  ServiceKey,
  keyof ReturnType<typeof getStrings>["partner"]["onboarding"]
> = {
  washAndFold: "washAndFoldPricesCardTitle",
  dryCleaning: "dryCleaningPricesCardTitle",
  tailoring: "tailoringPricesCardTitle",
};

export type ServicesScreenMode = "onboarding" | "settings";

export interface PartnerServicesScreenProps {
  /** "onboarding" = Services title, Finish button. "settings" = Merchant Services title, back only. */
  mode: ServicesScreenMode;
}

/**
 * Shared Services screen: same UI for onboarding (step2) and Settings.
 * Only title and bottom action differ by mode.
 *
 * Two UI patterns per service:
 * 1) No prices set → {@link ServiceNoPricesButton} (outline button only).
 * 2) Prices set → {@link ServiceWithPricesCard} (card with header row + price rows).
 */
export function PartnerServicesScreen({ mode }: PartnerServicesScreenProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const [inlineError, setInlineError] = useState<string | null>(null);
  const {
    washAndFoldPricing,
    dryCleaningPricing,
    tailoringPricing,
    pickupDeliveryPricing,
    setPickupDeliveryPricing,
    savePickupDeliveryPricing,
    isSavingPickupDeliveryPricing,
    submitOnboardingServices,
    isSubmittingOnboardingServices,
  } = useMerchantServices();
  const onboardingStrings = getStrings(locale).partner.onboarding;
  const settingsStrings = getStrings(locale).partner.settings;

  const isOnboarding = mode === "onboarding";
  const title = isOnboarding
    ? onboardingStrings.step2Title
    : settingsStrings.merchantServices;

  const pricingByKey: Record<ServiceKey, typeof washAndFoldPricing> = {
    washAndFold: washAndFoldPricing,
    dryCleaning: dryCleaningPricing,
    tailoring: tailoringPricing,
  };

  const handleServicePress = (key: ServiceKey) => {
    if (key === "washAndFold") {
      router.push({
        pathname: "/(partner)/onboarding/step3",
        params: { service: key },
      });
    } else {
      router.push({
        pathname: "/(partner)/onboarding/service-other",
        params: { service: key },
      });
    }
  };

  const allCoreServicesAdded =
    (washAndFoldPricing?.rows?.length ?? 0) > 0 &&
    (dryCleaningPricing?.rows?.length ?? 0) > 0 &&
    (tailoringPricing?.rows?.length ?? 0) > 0;
  const pickupAmountValid =
    !pickupDeliveryPricing.enabled || pickupDeliveryPricing.amount.trim().length > 0;

  const handleFinish = async () => {
    setInlineError(null);
    if (!allCoreServicesAdded) {
      setInlineError("Please add prices for all services before finishing.");
      return;
    }
    if (!pickupAmountValid) {
      setInlineError("Please enter pickup and delivery amount or disable the option.");
      return;
    }
    const result = await submitOnboardingServices();
    if (!result.ok) {
      setInlineError(result.error ?? "Unable to save services. Please try again.");
      return;
    }
    setInlineError(null);
    router.replace("/(partner)");
  };

  const handleSaveSettings = async () => {
    const ok = await savePickupDeliveryPricing();
    if (ok) {
      Alert.alert("Saved", "Pickup and delivery settings have been saved.");
      return;
    }
    Alert.alert("Error", "Could not save settings. Please try again.");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <PartnerHeader
        title={title}
        leftIcon="arrow-left"
        onLeftPress={() => router.back()}
        leftAccessibilityLabel={onboardingStrings.back}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>
          {onboardingStrings.chooseServicesHeading}
        </Text>

        {SERVICE_KEYS.map((key) => {
          const pricing = pricingByKey[key];
          const hasPrices =
            pricing?.rows != null && pricing.rows.length > 0;
          const label = getServiceLabel(settingsStrings, key);
          const onPress = () => handleServicePress(key);

          if (!hasPrices) {
            return (
              <ServiceNoPricesButton
                key={key}
                label={label}
                onPress={onPress}
              />
            );
          }

          return (
            <ServiceWithPricesCard
              key={key}
              label={label}
              onPress={onPress}
              pricesCardTitle={onboardingStrings[CARD_TITLE_KEYS[key]]}
              pricing={pricing}
            />
          );
        })}

        <View style={styles.pickupWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.checkboxRow,
              pressed && styles.checkboxRowPressed,
            ]}
            onPress={() =>
              setPickupDeliveryPricing((prev) => ({
                ...prev,
                enabled: !prev.enabled,
              }))
            }
            accessibilityRole="checkbox"
            accessibilityState={{ checked: pickupDeliveryPricing.enabled }}
            accessibilityLabel={onboardingStrings.includePickupDelivery}
          >
            <View
              style={[
                styles.roundCheckbox,
                pickupDeliveryPricing.enabled && styles.roundCheckboxChecked,
              ]}
            >
              {pickupDeliveryPricing.enabled ? (
                <MaterialCommunityIcons name="check" size={14} color={c.background} />
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>
              {onboardingStrings.includePickupDelivery}
            </Text>
          </Pressable>

          {pickupDeliveryPricing.enabled && (
            <View style={styles.pickupAmountWrap}>
              <Text style={styles.pickupAmountLabel}>
                {onboardingStrings.pickupDeliveryAmountLabel}
              </Text>
              <FormTextInput
                value={pickupDeliveryPricing.amount}
                onChangeText={(t) =>
                  setPickupDeliveryPricing((prev) => ({
                    ...prev,
                    amount: allowDecimalOnly(t),
                  }))
                }
                placeholder={onboardingStrings.pickupDeliveryAmountPlaceholder}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>

        {isOnboarding && (
          <>
            {inlineError ? <Text style={styles.errorText}>{inlineError}</Text> : null}
            <AppButton
              label={onboardingStrings.finish}
              onPress={handleFinish}
              variant="filled"
              rightIcon="arrow-right"
              fullWidth
              loading={isSubmittingOnboardingServices}
              disabled={isSubmittingOnboardingServices}
              style={styles.finishBtn}
              accessibilityLabel={onboardingStrings.finish}
            />
          </>
        )}
        {!isOnboarding && (
          <AppButton
            label={settingsStrings.save}
            onPress={handleSaveSettings}
            variant="filled"
            rightIcon="check"
            fullWidth
            disabled={isSavingPickupDeliveryPricing}
            style={styles.finishBtn}
            accessibilityLabel={settingsStrings.save}
          />
        )}
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
  heading: {
    fontSize: fs.titleMedium,
    fontWeight: "600",
    color: c.white,
    marginBottom: 20,
  },
  finishBtn: {
    marginTop: 28,
  },
  errorText: {
    color: "#FFB3B3",
    fontSize: fs.smallText,
    marginTop: 16,
    marginBottom: -16,
  },
  pickupWrap: {
    marginTop: 18,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkboxRowPressed: {
    opacity: 0.85,
  },
  roundCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: c.blue500,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  roundCheckboxChecked: {
    backgroundColor: c.blue500,
    borderColor: c.blue500,
  },
  checkboxLabel: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
    flex: 1,
  },
  pickupAmountWrap: {
    marginTop: 14,
    gap: 8,
  },
  pickupAmountLabel: {
    fontSize: fs.descText,
    color: c.blue500,
  },
});
