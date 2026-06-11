import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormTextInput } from "@/components/form-text-input";
import { PartnerHeader } from "@/components/partner-header";
import {
  ServiceNoPricesButton,
  ServiceWithPricesCard,
} from "@/components/partner-service-entry";
import { AppButton } from "@/components/ui/button";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useMerchantServices } from "@/contexts/merchant-services-context";
import { getStrings } from "@/locales";
import { submitPartnerOnboardingKyc } from "@/lib/partner-onboarding-submit";
import { validatePickupRiderRequirements } from "@/lib/partner-pickup-rider-requirements";
import { fetchPartnerRiders } from "@/lib/partner-riders";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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
  const { user, refreshPartnerApproval } = useAuth();
  const {
    services,
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
  const dashboardStrings = getStrings(locale).partner.dashboard;
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const isOnboarding = mode === "onboarding";
  const title = isOnboarding
    ? onboardingStrings.step2Title
    : settingsStrings.merchantServices;

  const pricingByKey: Record<ServiceKey, typeof washAndFoldPricing> = {
    washAndFold: washAndFoldPricing,
    dryCleaning: dryCleaningPricing,
    tailoring: tailoringPricing,
  };

  const hasConfiguredServices = SERVICE_KEYS.some((key) => {
    const pricing = pricingByKey[key];
    return pricing?.rows != null && pricing.rows.length > 0;
  });

  const normalizedPickupAmount = (pickupDeliveryPricing.amount ?? "").trim();
  const hasPickupAmount = normalizedPickupAmount.length > 0;

  const showRiderRequirementAlert = () => {
    Alert.alert("Required", onboardingStrings.riderDetailsIncomplete);
  };

  const ensurePickupRiderRequirements = async (userId: string): Promise<boolean> => {
    if (!pickupDeliveryPricing.enabled) return true;

    const validation = await validatePickupRiderRequirements(userId, true);
    if (validation.ok) return true;

    showRiderRequirementAlert();
    return false;
  };

  const handleOpenRiderDetail = async () => {
    if (!pickupDeliveryPricing.enabled) {
      Alert.alert(
        onboardingStrings.pickupRidersOnlyTitle,
        onboardingStrings.pickupRidersOnlyMessage,
      );
      return;
    }
    if (!hasPickupAmount) {
      Alert.alert("Required", onboardingStrings.pickupDeliveryAmountRequired);
      return;
    }

    const pickupSaved = await savePickupDeliveryPricing();
    if (!pickupSaved) {
      Alert.alert("Error", "Could not save pickup settings. Please try again.");
      return;
    }

    router.push("/(partner)/onboarding/rider-registration");
  };

  const handleServicePress = (key: ServiceKey) => {
    router.push({
      pathname: "/(partner)/onboarding/service-other",
      params: { service: key },
    });
  };

  const handlePickupToggle = () => {
    setPickupDeliveryPricing((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const handleFinish = async () => {
    if (isSubmittingRequest) return;

    if (!isSupabaseConfigured() || !supabase) {
      Alert.alert(
        "Configuration error",
        "Supabase is not configured. Please set your Supabase URL and anon key.",
      );
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const resolvedUserId =
        user?.id ??
        (await supabase.auth.getSession()).data.session?.user?.id ??
        null;
      if (!resolvedUserId) {
        Alert.alert("Error", "Missing user ID. Please sign in again.");
        return;
      }

      const persistedServiceResult = await submitOnboardingServices();
      if (!persistedServiceResult.ok) {
        Alert.alert(
          "Error",
          persistedServiceResult.error ?? "Could not save services before submitting KYC.",
        );
        return;
      }

      if (!hasConfiguredServices) {
        Alert.alert("Error", "Please add at least one service before submitting.");
        return;
      }

      if (pickupDeliveryPricing.enabled && !hasPickupAmount) {
        Alert.alert("Required", onboardingStrings.pickupDeliveryAmountRequired);
        return;
      }

      const { data: persistedServices, error: persistedServicesError } = await supabase
        .from("partner_services")
        .select("name,category,price_display")
        .eq("user_id", resolvedUserId)
        .order("created_at", { ascending: true });

      if (persistedServicesError) {
        Alert.alert("Error", `Could not load partner services. ${persistedServicesError.message}`);
        return;
      }

      const dbServiceLines = (persistedServices ?? [])
        .map((item) => ({
          name: (item.name ?? "").trim(),
          category: (item.category ?? "").trim(),
          priceDisplay: (item.price_display ?? "").trim(),
        }))
        .filter((item) => item.name.length > 0 && item.priceDisplay.length > 0);

      const memoryServiceLines = services
        .map((item) => ({
          name: (item.name ?? "").trim(),
          category: (item.category ?? "").trim(),
          priceDisplay: (item.priceDisplay ?? "").trim(),
        }))
        .filter((item) => item.name.length > 0 && item.priceDisplay.length > 0);

      const serviceLines = dbServiceLines.length > 0 ? dbServiceLines : memoryServiceLines;

      if (serviceLines.length === 0) {
        Alert.alert("Error", "Please add at least one service before submitting.");
        return;
      }

      if (!(await ensurePickupRiderRequirements(resolvedUserId))) {
        return;
      }

      let riderPayload: Array<{ name: string; phone: string; photoUrl: string }> = [];
      let ridersResponsibilityAccepted = false;

      if (pickupDeliveryPricing.enabled) {
        const existingRiders = await fetchPartnerRiders(resolvedUserId);
        riderPayload = existingRiders
          .filter(
            (rider) =>
              rider.name.trim().length > 0 &&
              rider.phone.trim().length > 0 &&
              rider.photoUrl.trim().length > 0,
          )
          .map((rider) => ({
            name: rider.name.trim(),
            phone: rider.phone.trim(),
            photoUrl: rider.photoUrl.trim(),
          }));

        const { data: partnerProfile, error: partnerProfileError } = await supabase
          .from("partner_profiles")
          .select("riders_responsibility_accepted_at")
          .eq("id", resolvedUserId)
          .maybeSingle<{ riders_responsibility_accepted_at: string | null }>();

        if (partnerProfileError) {
          Alert.alert("Error", partnerProfileError.message);
          return;
        }

        ridersResponsibilityAccepted = Boolean(
          partnerProfile?.riders_responsibility_accepted_at,
        );
      }

      const kycResult = await submitPartnerOnboardingKyc({
        userId: resolvedUserId,
        pickupDeliveryEnabled: Boolean(pickupDeliveryPricing.enabled),
        pickupDeliveryAmount: normalizedPickupAmount,
        serviceLines,
        riders: riderPayload,
        ridersResponsibilityAccepted,
      });

      if (!kycResult.ok) {
        if (kycResult.code === "missing_table") {
          Alert.alert("Database update required", kycResult.error);
        } else {
          Alert.alert("Error", kycResult.error);
        }
        return;
      }

      setSuccessModalVisible(true);
      void refreshPartnerApproval();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit onboarding request.";
      Alert.alert("Error", message);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleSaveSettings = async () => {
    const resolvedUserId =
      user?.id ?? (isSupabaseConfigured() && supabase
        ? (await supabase.auth.getSession()).data.session?.user?.id ?? null
        : null);

    if (!resolvedUserId) {
      Alert.alert("Error", "Missing user ID. Please sign in again.");
      return;
    }

    if (pickupDeliveryPricing.enabled && !hasPickupAmount) {
      Alert.alert("Required", onboardingStrings.pickupDeliveryAmountRequired);
      return;
    }

    if (!(await ensurePickupRiderRequirements(resolvedUserId))) {
      return;
    }

    const servicesResult = await submitOnboardingServices();
    if (!servicesResult.ok) {
      Alert.alert(
        "Error",
        servicesResult.error ?? "Could not save service prices. Please try again.",
      );
      return;
    }
    const pickupOk = await savePickupDeliveryPricing();
    if (pickupOk) {
      Alert.alert("Saved", "Service prices and pickup settings have been saved.");
      return;
    }
    Alert.alert("Error", "Service prices saved, but pickup settings could not be saved.");
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
            onPress={handlePickupToggle}
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

          <Text style={styles.pickupHint}>{onboardingStrings.pickupRidersRequiredHint}</Text>

          {pickupDeliveryPricing.enabled && (
            <View style={styles.pickupAmountWrap}>
              <Text style={styles.pickupAmountLabel}>
                {onboardingStrings.pickupDeliveryAmountLabel}
                <Text style={styles.requiredAsterisk}> *</Text>
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
              <AppButton
                label={onboardingStrings.configureRiderDetails}
                onPress={handleOpenRiderDetail}
                variant="outline"
                rightIcon="arrow-right"
                fullWidth
                disabled={!hasPickupAmount}
                style={styles.riderDetailBtn}
                accessibilityLabel={onboardingStrings.configureRiderDetails}
              />
            </View>
          )}
        </View>

        {isOnboarding && hasConfiguredServices ? (
          <AppButton
            label={onboardingStrings.finish}
            onPress={handleFinish}
            variant="filled"
            rightIcon="arrow-right"
            fullWidth
            disabled={isSubmittingRequest}
            style={styles.finishBtn}
            accessibilityLabel={onboardingStrings.finish}
          />
        ) : null}
        {!isOnboarding && (
          <AppButton
            label={settingsStrings.save}
            onPress={handleSaveSettings}
            variant="filled"
            rightIcon="check"
            fullWidth
            disabled={
              isSavingPickupDeliveryPricing || isSubmittingOnboardingServices
            }
            style={styles.finishBtn}
            accessibilityLabel={settingsStrings.save}
          />
        )}
      </ScrollView>

      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSuccessModalVisible(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalIconWrap}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={22}
                color={c.background}
              />
            </View>
            <Text style={styles.modalTitle}>{dashboardStrings.pendingTitle}</Text>
            <Text style={styles.modalMessage}>
              {dashboardStrings.pendingMessage}
            </Text>
            <AppButton
              label={dashboardStrings.pendingContinueButton}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace("/(partner)");
              }}
              variant="filled"
              fullWidth
              style={styles.modalButton}
              accessibilityLabel={dashboardStrings.pendingContinueButton}
            />
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
  heading: {
    fontSize: fs.titleMedium,
    fontWeight: "600",
    color: c.white,
    marginBottom: 20,
  },
  finishBtn: {
    marginTop: 28,
  },
  pickupWrap: {
    marginTop: 18,
  },
  pickupHint: {
    marginTop: 10,
    fontSize: fs.xxSmallText,
    lineHeight: 18,
    color: "rgba(255,255,255,0.55)",
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
  requiredAsterisk: {
    color: c.white,
    fontWeight: "600",
  },
  riderDetailBtn: {
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: c.modalOverlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "92%",
    maxWidth: 340,
    backgroundColor: c.blue900,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.modalBorder,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.blue500,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
    marginBottom: 10,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: fs.smallText,
    color: c.blue500,
    lineHeight: 21,
    textAlign: "center",
  },
  modalButton: {
    marginTop: 20,
    marginBottom: 6,
  },
});
