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
import { isMissingPartnerOnboardingRequestsTableError } from "@/lib/partner-onboarding-request";
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
    const resolvedUserId =
      user?.id ??
      (await supabase.auth.getSession()).data.session?.user?.id ??
      null;
    if (!resolvedUserId) {
      setIsSubmittingRequest(false);
      Alert.alert("Error", "Missing user ID. Please sign in again.");
      return;
    }

      const normalizedPickupAmount = (pickupDeliveryPricing.amount ?? "").trim();
      const kycStatus = "submitted" as const;

      // Ensure partner profile is fully persisted at submission time.
      const { data: existingPartnerProfile } = await supabase
        .from("partner_profiles")
        .select("business_name,business_description")
        .eq("id", resolvedUserId)
        .maybeSingle<{
          business_name: string | null;
          business_description: string | null;
        }>();

      const businessName = (existingPartnerProfile?.business_name ?? "").trim();
      const businessDescription = (existingPartnerProfile?.business_description ?? "").trim();
      const resolvedBusinessName = businessName || "Laundry Business";
      const resolvedBusinessDescription =
        businessDescription || "Submitted from mobile onboarding flow.";

      const { error: partnerProfileSaveError } = await supabase.from("partner_profiles").upsert(
        {
          id: resolvedUserId,
          business_name: resolvedBusinessName,
          business_description: resolvedBusinessDescription,
          pickup_delivery_enabled: Boolean(pickupDeliveryPricing.enabled),
          pickup_delivery_amount: normalizedPickupAmount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (partnerProfileSaveError) {
        setIsSubmittingRequest(false);
        Alert.alert("Error", `Could not save partner profile. ${partnerProfileSaveError.message}`);
        return;
      }

      // Read latest persisted services to produce reliable KYC snapshot.
      const { data: persistedServices, error: persistedServicesError } = await supabase
        .from("partner_services")
        .select("name,category,price_display")
        .eq("user_id", resolvedUserId)
        .order("created_at", { ascending: true });

      if (persistedServicesError) {
        setIsSubmittingRequest(false);
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
        setIsSubmittingRequest(false);
        Alert.alert("Error", "Please add at least one service before submitting.");
        return;
      }

      const notesPayload = {
        businessProfile: {
          businessName: resolvedBusinessName,
          businessDescription: resolvedBusinessDescription,
        },
        servicePricing: {
          pickupDeliveryEnabled: Boolean(pickupDeliveryPricing.enabled),
          pickupDeliveryAmount: normalizedPickupAmount,
        },
        serviceLines,
      };

      let notesSerialized = "";
      try {
        notesSerialized = JSON.stringify(notesPayload);
      } catch {
        setIsSubmittingRequest(false);
        Alert.alert("Error", "Could not prepare KYC snapshot.");
        return;
      }

      const submittedAt = new Date().toISOString();
      const kycPayload = {
        user_id: resolvedUserId,
        status: kycStatus,
        submitted_at: submittedAt,
        updated_at: submittedAt,
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
        notes: notesSerialized,
      };

      const { error } = await supabase
        .from("partner_onboarding_requests")
        .upsert(kycPayload, { onConflict: "user_id" });

      if (error) {
        setIsSubmittingRequest(false);
        if (isMissingPartnerOnboardingRequestsTableError(error)) {
          Alert.alert(
            "Database update required",
            "The partner KYC table has not been created in Supabase yet. Run `npx supabase db push` from `laundry-app`, then try again.",
          );
          return;
        }
        Alert.alert("Error", error.message);
        return;
      }

    await refreshPartnerApproval();

    setIsSubmittingRequest(false);
    setSuccessModalVisible(true);
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
