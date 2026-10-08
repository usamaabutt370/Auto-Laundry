import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { assets } from "@/assets/assets";
import { showAppAlert } from "@/components/app-alert";
import { PartnerHeader } from "@/components/partner-header";
import { AppButton } from "@/components/ui/button";
import { AppCtaButton } from "@/components/ui/cta-button";
import { theme, UI } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useMerchantServices, type ServicePricing } from "@/contexts/merchant-services-context";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { getStrings } from "@/locales";
import { submitPartnerOnboardingKyc } from "@/lib/partner-onboarding-submit";
import { validatePickupRiderRequirements } from "@/lib/partner-pickup-rider-requirements";
import { fetchPartnerRiders } from "@/lib/partner-riders";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { allowDecimalOnly } from "@/utils/input-filter";

const c = theme.colors;
const fs = theme.fontSize;

const SERVICE_KEYS = ["washAndFold", "dryCleaning", "tailoring", "press"] as const;
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
    case "press":
      return s.categoryPress;
    default:
      return key;
  }
}

const SERVICE_COPY: Record<
  ServiceKey,
  {
    description: keyof ReturnType<typeof getStrings>["partner"]["onboarding"];
    addPrompt: keyof ReturnType<typeof getStrings>["partner"]["onboarding"];
    image: number;
    well: string;
    fit: "cover" | "contain";
  }
> = {
  washAndFold: {
    description: "washFoldCardDescription",
    addPrompt: "serviceAddWashFold",
    image: assets.images.home_deal_laundry,
    well: "#E7F3FB",
    fit: "cover",
  },
  dryCleaning: {
    description: "dryCleaningCardDescription",
    addPrompt: "serviceAddDryCleaning",
    image: assets.images.serviceSuit2Piece,
    well: "#EEF2FF",
    fit: "contain",
  },
  tailoring: {
    description: "tailoringCardDescription",
    addPrompt: "serviceAddTailoring",
    image: assets.images.home_deal_tailoring,
    well: "#FDE8F0",
    fit: "cover",
  },
  press: {
    description: "pressCardDescription",
    addPrompt: "serviceAddPress",
    image: assets.images.home_category_ironing,
    well: "#E8F8F1",
    fit: "cover",
  },
};

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function lowestAmount(rows: { value: string }[]): string | null {
  let min: number | null = null;
  for (const row of rows) {
    const match = row.value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    if (!match) continue;
    const amount = Number(match[0]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (min == null || amount < min) min = amount;
  }
  if (min == null) return null;
  return Number.isInteger(min) ? String(min) : String(Math.round(min));
}

function pricingSummary(
  pricing: ServicePricing | null,
  s: ReturnType<typeof getStrings>["partner"]["onboarding"],
  addPrompt: string,
): string {
  const rows = pricing?.rows ?? [];
  if (rows.length === 0) return addPrompt;
  const amount = lowestAmount(rows);
  if (amount == null) {
    return fill(rows.length === 1 ? s.serviceItemCount : s.serviceItemsCount, {
      count: rows.length,
    });
  }
  return fill(rows.length === 1 ? s.serviceItemFrom : s.serviceItemsFrom, {
    count: rows.length,
    amount,
  });
}

export type ServicesScreenMode = "onboarding" | "settings";

export interface PartnerServicesScreenProps {
  /** "onboarding" = Services title, Finish button. "settings" = Merchant Services title, back only. */
  mode: ServicesScreenMode;
}

/**
 * Shared Services screen: same UI for onboarding (step2) and Settings.
 * Each service is a card with status, starting price, and Add or Edit.
 */
export function PartnerServicesScreen({ mode }: PartnerServicesScreenProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const { user, refreshPartnerApproval } = useAuth();
  const { isWeb } = useResponsiveLayout();
  useSuppressWebScreenHeader();
  const {
    services,
    washAndFoldPricing,
    dryCleaningPricing,
    tailoringPricing,
    pressPricing,
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
    press: pressPricing,
  };

  const hasConfiguredServices = SERVICE_KEYS.some((key) => {
    const pricing = pricingByKey[key];
    return pricing?.rows != null && pricing.rows.length > 0;
  });
  const hasHomeServices = (["washAndFold", "dryCleaning", "press", "tailoring"] as const).some((key) => {
    const pricing = pricingByKey[key];
    return pricing?.rows != null && pricing.rows.length > 0;
  });

  const normalizedPickupAmount = (pickupDeliveryPricing.amount ?? "").trim();
  const hasPickupAmount = normalizedPickupAmount.length > 0;

  const showRiderRequirementAlert = () => {
    showAppAlert("Required", onboardingStrings.riderDetailsIncomplete);
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
      showAppAlert(
        onboardingStrings.pickupRidersOnlyTitle,
        onboardingStrings.pickupRidersOnlyMessage,
      );
      return;
    }
    if (!hasPickupAmount) {
      showAppAlert("Required", onboardingStrings.pickupDeliveryAmountRequired);
      return;
    }

    const pickupSaved = await savePickupDeliveryPricing();
    if (!pickupSaved) {
      showAppAlert("Error", "Could not save pickup settings. Please try again.");
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
      showAppAlert(
        "Configuration error",
        "Supabase is not configured. Please set your Supabase URL and anon key.",
      );
      return;
    }

    if (!hasHomeServices) {
      showAppAlert("Required", onboardingStrings.homeServiceRequired);
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const resolvedUserId =
        user?.id ??
        (await supabase.auth.getSession()).data.session?.user?.id ??
        null;
      if (!resolvedUserId) {
        showAppAlert("Error", "Missing user ID. Please sign in again.");
        return;
      }

      const persistedServiceResult = await submitOnboardingServices();
      if (!persistedServiceResult.ok) {
        showAppAlert(
          "Error",
          persistedServiceResult.error ?? "Could not save services before submitting KYC.",
        );
        return;
      }

      if (!hasHomeServices) {
        showAppAlert("Required", onboardingStrings.homeServiceRequired);
        return;
      }

      if (!hasConfiguredServices) {
        showAppAlert("Error", "Please add at least one service before submitting.");
        return;
      }

      if (pickupDeliveryPricing.enabled && !hasPickupAmount) {
        showAppAlert("Required", onboardingStrings.pickupDeliveryAmountRequired);
        return;
      }

      const { data: persistedServices, error: persistedServicesError } = await supabase
        .from("partner_services")
        .select("name,category,price_display")
        .eq("user_id", resolvedUserId)
        .order("created_at", { ascending: true });

      if (persistedServicesError) {
        showAppAlert("Error", `Could not load partner services. ${persistedServicesError.message}`);
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

      const HOME_SERVICE_CATEGORIES = new Set(["Wash & Fold", "Press", "Tailoring"]);
      if (!serviceLines.some((item) => HOME_SERVICE_CATEGORIES.has(item.category))) {
        showAppAlert("Required", onboardingStrings.homeServiceRequired);
        return;
      }

      if (serviceLines.length === 0) {
        showAppAlert("Error", "Please add at least one service before submitting.");
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
          showAppAlert("Error", partnerProfileError.message);
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
          showAppAlert("Database update required", kycResult.error);
        } else {
          showAppAlert("Error", kycResult.error);
        }
        return;
      }

      setSuccessModalVisible(true);
      void refreshPartnerApproval();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit onboarding request.";
      showAppAlert("Error", message);
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
      showAppAlert("Error", "Missing user ID. Please sign in again.");
      return;
    }

    if (pickupDeliveryPricing.enabled && !hasPickupAmount) {
      showAppAlert("Required", onboardingStrings.pickupDeliveryAmountRequired);
      return;
    }

    if (!(await ensurePickupRiderRequirements(resolvedUserId))) {
      return;
    }

    const servicesResult = await submitOnboardingServices();
    if (!servicesResult.ok) {
      showAppAlert(
        "Error",
        servicesResult.error ?? "Could not save service prices. Please try again.",
      );
      return;
    }
    const pickupOk = await savePickupDeliveryPricing();
    if (pickupOk) {
      showAppAlert("Saved", "Service prices and pickup settings have been saved.");
      return;
    }
    showAppAlert("Error", "Service prices saved, but pickup settings could not be saved.");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {!isWeb || isOnboarding ? (
        <PartnerHeader
          appearance="light"
          titleAlign="center"
          compact
          title={title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel={onboardingStrings.back}
        />
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>{onboardingStrings.chooseServicesTitle}</Text>
        <Text style={styles.subtitle}>{onboardingStrings.chooseServicesSubtitle}</Text>

        {SERVICE_KEYS.map((key) => {
          const pricing = pricingByKey[key];
          const copy = SERVICE_COPY[key];
          const hasPrices = pricing?.rows != null && pricing.rows.length > 0;
          const label = getServiceLabel(settingsStrings, key);
          const summary = pricingSummary(
            pricing,
            onboardingStrings,
            onboardingStrings[copy.addPrompt],
          );

          return (
            <Pressable
              key={key}
              onPress={() => handleServicePress(key)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <View style={[styles.artWell, { backgroundColor: copy.well }]}>
                <Image
                  source={copy.image}
                  style={styles.art}
                  contentFit={copy.fit}
                />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{label}</Text>
                <Text style={styles.cardDescription}>
                  {onboardingStrings[copy.description]}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    hasPrices ? styles.statusPillOn : styles.statusPillOff,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={hasPrices ? "check-circle" : "circle-outline"}
                    size={14}
                    color={hasPrices ? "#059669" : UI.muted}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      hasPrices ? styles.statusTextOn : styles.statusTextOff,
                    ]}
                  >
                    {hasPrices
                      ? onboardingStrings.serviceStatusConfigured
                      : onboardingStrings.serviceStatusNotConfigured}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>{summary}</Text>
              </View>
              {hasPrices ? (
                <View style={styles.editBtn}>
                  <Text style={styles.editBtnText}>{settingsStrings.edit}</Text>
                </View>
              ) : (
                <View style={styles.addBtn}>
                  <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>{onboardingStrings.add}</Text>
                </View>
              )}
            </Pressable>
          );
        })}

        <View style={styles.pickupCard}>
          <Pressable
            style={({ pressed }) => [
              styles.checkboxRow,
              pressed && styles.pressed,
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
                <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>
              {onboardingStrings.includePickupDelivery}
            </Text>
          </Pressable>

          <Text style={styles.pickupHint}>{onboardingStrings.pickupRidersRequiredHint}</Text>

          {pickupDeliveryPricing.enabled ? (
            <View style={styles.pickupAmountWrap}>
              <Text style={styles.pickupAmountLabel}>
                {onboardingStrings.pickupDeliveryAmountLabel}
                <Text style={styles.requiredAsterisk}> *</Text>
              </Text>
              <TextInput
                value={pickupDeliveryPricing.amount}
                onChangeText={(t) =>
                  setPickupDeliveryPricing((prev) => ({
                    ...prev,
                    amount: allowDecimalOnly(t),
                  }))
                }
                placeholder={onboardingStrings.pickupDeliveryAmountPlaceholder}
                placeholderTextColor={UI.muted}
                keyboardType="decimal-pad"
                style={styles.pickupInput}
              />
              <AppCtaButton
                label={onboardingStrings.configureRiderDetails}
                onPress={() => void handleOpenRiderDetail()}
                variant="outline"
                rightIcon="arrow-right"
                width="full"
                disabled={!hasPickupAmount}
              />
            </View>
          ) : null}
        </View>

        {isOnboarding ? (
          <AppCtaButton
            label={onboardingStrings.continue}
            onPress={() => void handleFinish()}
            rightIcon="arrow-right"
            width="full"
            disabled={isSubmittingRequest}
            loading={isSubmittingRequest}
            style={styles.continueBtn}
          />
        ) : (
          <AppCtaButton
            label={settingsStrings.save}
            onPress={() => void handleSaveSettings()}
            rightIcon="check"
            width="full"
            disabled={isSavingPickupDeliveryPricing || isSubmittingOnboardingServices}
            loading={isSavingPickupDeliveryPricing || isSubmittingOnboardingServices}
            style={styles.continueBtn}
          />
        )}
        {isOnboarding && !hasConfiguredServices ? (
          <Text style={styles.continueHint}>{onboardingStrings.addAtLeastOneService}</Text>
        ) : null}
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
                color="#FFFFFF"
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
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Poppins-Bold",
    color: UI.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    padding: 12,
    marginBottom: 14,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: {
    opacity: 0.92,
  },
  artWell: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  art: {
    width: "100%",
    height: "100%",
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillOn: {
    backgroundColor: "#D1FAE5",
  },
  statusPillOff: {
    backgroundColor: "#F3F4F6",
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  statusTextOn: {
    color: "#059669",
  },
  statusTextOff: {
    color: UI.muted,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  editBtn: {
    flexShrink: 0,
    minWidth: 64,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.blue,
  },
  addBtn: {
    flexShrink: 0,
    minWidth: 72,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: UI.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  addBtnText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  pickupCard: {
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  pickupHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roundCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: UI.chipBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  roundCheckboxChecked: {
    backgroundColor: UI.blue,
    borderColor: UI.blue,
  },
  checkboxLabel: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    flex: 1,
  },
  pickupAmountWrap: {
    marginTop: 14,
    gap: 8,
  },
  pickupAmountLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
  },
  requiredAsterisk: {
    color: UI.red,
    fontFamily: "Poppins-SemiBold",
  },
  pickupInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: UI.text,
  },
  continueBtn: {
    marginTop: 18,
  },
  continueHint: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: c.modalOverlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
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
