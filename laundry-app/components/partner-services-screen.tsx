import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const {
    washAndFoldPricing,
    dryCleaningPricing,
    tailoringPricing,
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

  const handleFinish = () => {
    router.replace("/(partner)");
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

        {isOnboarding && (
          <AppButton
            label={onboardingStrings.finish}
            onPress={handleFinish}
            variant="filled"
            rightIcon="arrow-right"
            fullWidth
            style={styles.finishBtn}
            accessibilityLabel={onboardingStrings.finish}
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
});
