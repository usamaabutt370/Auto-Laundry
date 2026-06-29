import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { type CountryCode } from "react-native-country-picker-modal";

import { showAppAlert } from "@/components/app-alert";
import { FormTextInput } from "@/components/form-text-input";
import { PartnerHeader } from "@/components/partner-header";
import { AppButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";
import { ensureActiveUserProfile } from "@/lib/ensure-user-profile";
import { fetchPartnerPickupDeliveryEnabled } from "@/lib/partner-pickup-rider-requirements";
import {
  fetchPartnerRiders,
  replacePartnerRiders,
  uploadRiderPhoto,
  type PartnerRiderInput,
} from "@/lib/partner-riders";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const c = theme.colors;
const fs = theme.fontSize;

type StagedRider = {
  id: string;
  name: string;
  phone: string;
  callingCode: string;
  countryCode: CountryCode;
  photoUri: string;
  photoUploaded: boolean;
};

function normalizePhoneDigits(rawValue: string): string {
  let digits = rawValue.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 15);
}

function createEmptyRider(): StagedRider {
  return {
    id: `rider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    phone: "",
    callingCode: "92",
    countryCode: "PK",
    photoUri: "",
    photoUploaded: false,
  };
}

function RequiredFieldLabel({ label }: { label: string }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      <Text style={styles.requiredAsterisk}> *</Text>
    </Text>
  );
}

export function PartnerRiderRegistrationForm() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();
  const s = getStrings(locale).partner.onboarding;

  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("PK");
  const [callingCode, setCallingCode] = useState("92");
  const [riders, setRiders] = useState<StagedRider[]>([createEmptyRider()]);
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSavedRiderDetails = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const pickupEnabled = await fetchPartnerPickupDeliveryEnabled(user.id);
      if (!pickupEnabled) {
        showAppAlert(s.pickupRidersOnlyTitle, s.pickupRidersOnlyMessage, [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }

      const [{ data: profile }, existingRiders] = await Promise.all([
        supabase
          .from("partner_profiles")
          .select("business_name, phone_number, address, riders_responsibility_accepted_at")
          .eq("id", user.id)
          .maybeSingle<{
            business_name: string | null;
            phone_number: string | null;
            address: string | null;
            riders_responsibility_accepted_at: string | null;
          }>(),
        fetchPartnerRiders(user.id),
      ]);

      setBusinessName(profile?.business_name ?? "");
      setAddress(profile?.address ?? "");
      setResponsibilityAccepted(Boolean(profile?.riders_responsibility_accepted_at));
      setSubmitAttempted(false);

      const rawPhone = profile?.phone_number ?? "";
      if (rawPhone.startsWith("+")) {
        const parsed = parsePhoneNumberFromString(rawPhone);
        if (parsed) {
          if (parsed.country) setCountryCode(parsed.country as CountryCode);
          setCallingCode(parsed.countryCallingCode as string);
          setPhoneNumber(parsed.nationalNumber as string);
        } else {
          setPhoneNumber(normalizePhoneDigits(rawPhone));
        }
      } else {
        setPhoneNumber(normalizePhoneDigits(rawPhone));
      }

      if (existingRiders.length > 0) {
        setRiders(
          existingRiders.map((rider) => {
            let riderPhone = rider.phone;
            let riderCallingCode = "92";
            let riderCountryCode: CountryCode = "PK";
            if (rider.phone.startsWith("+")) {
              const parsed = parsePhoneNumberFromString(rider.phone);
              if (parsed) {
                riderCallingCode = parsed.countryCallingCode as string;
                if (parsed.country) riderCountryCode = parsed.country as CountryCode;
                riderPhone = parsed.nationalNumber as string;
              }
            }
            return {
              id: rider.id,
              name: rider.name,
              phone: normalizePhoneDigits(riderPhone),
              callingCode: riderCallingCode,
              countryCode: riderCountryCode,
              photoUri: rider.photoUrl,
              photoUploaded: true,
            };
          }),
        );
      } else {
        setRiders([createEmptyRider()]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, s.pickupRidersOnlyMessage, s.pickupRidersOnlyTitle, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadSavedRiderDetails();
    }, [loadSavedRiderDetails]),
  );

  const isBusinessNameMissing = businessName.trim().length === 0;
  const isAddressMissing = address.trim().length === 0;
  const isPhoneMissing = phoneNumber.trim().length === 0;
  const isPhoneValid = !isPhoneMissing
    ? Boolean(parsePhoneNumberFromString(`+${callingCode}${phoneNumber}`)?.isValid())
    : false;

  const isRiderComplete = (rider: StagedRider) =>
    rider.name.trim().length > 0 &&
    rider.phone.trim().length > 0 &&
    Boolean(parsePhoneNumberFromString(`+${rider.callingCode}${rider.phone}`)?.isValid()) &&
    rider.photoUri.trim().length > 0;

  const completedRiders = riders.filter(isRiderComplete);
  const hasAtLeastOneRider = completedRiders.length > 0;

  const updateRider = useCallback((riderId: string, patch: Partial<StagedRider>) => {
    setRiders((prev) => prev.map((rider) => (rider.id === riderId ? { ...rider, ...patch } : rider)));
  }, []);

  const addRider = useCallback(() => {
    setRiders((prev) => [...prev, createEmptyRider()]);
  }, []);

  const removeRider = useCallback((riderId: string) => {
    setRiders((prev) => {
      const next = prev.filter((rider) => rider.id !== riderId);
      return next.length > 0 ? next : [createEmptyRider()];
    });
  }, []);

  const pickRiderPhoto = useCallback(async (riderId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAppAlert(s.riderPhotoPermissionTitle, s.riderPhotoPermissionMessage);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    updateRider(riderId, {
      photoUri: result.assets[0].uri,
      photoUploaded: false,
    });
  }, [s.riderPhotoPermissionMessage, s.riderPhotoPermissionTitle, updateRider]);

  const handleSubmit = useCallback(async () => {
    if (isSaving) return;
    setSubmitAttempted(true);

    if (
      isBusinessNameMissing ||
      isAddressMissing ||
      !isPhoneValid ||
      !hasAtLeastOneRider ||
      !responsibilityAccepted
    ) {
      return;
    }

    if (!isSupabaseConfigured() || !supabase || !user?.id) {
      showAppAlert("Configuration error", "Supabase is not configured.");
      return;
    }

    const profileReady = await ensureActiveUserProfile(user);
    if (!profileReady.ok) {
      showAppAlert("Account error", profileReady.error);
      return;
    }

    setIsSaving(true);
    try {
      const fullPhone = `+${callingCode}${phoneNumber}`;
      const parsedPhone = parsePhoneNumberFromString(fullPhone);
      const normalizedPhone = parsedPhone ? parsedPhone.number : fullPhone;

      const responsibilityAcceptedAt = responsibilityAccepted
        ? new Date().toISOString()
        : null;

      const { error: profileError } = await supabase.from("partner_profiles").upsert(
        {
          id: user.id,
          business_name: businessName.trim(),
          phone_number: normalizedPhone,
          address: address.trim(),
          riders_responsibility_accepted_at: responsibilityAcceptedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (profileError) {
        showAppAlert("Error", profileError.message);
        return;
      }

      const riderPayload: PartnerRiderInput[] = [];
      for (const rider of completedRiders) {
        let photoUrl = rider.photoUri;
        if (!rider.photoUploaded) {
          const uploadResult = await uploadRiderPhoto(user.id, rider.photoUri);
          if (!uploadResult.ok) {
            showAppAlert("Error", uploadResult.error);
            return;
          }
          photoUrl = uploadResult.url;
        }

        const riderFullPhone = `+${rider.callingCode}${rider.phone}`;
        const parsedRiderPhone = parsePhoneNumberFromString(riderFullPhone);
        const normalizedRiderPhone = parsedRiderPhone ? parsedRiderPhone.number : riderFullPhone;

        riderPayload.push({
          name: rider.name.trim(),
          phone: normalizedRiderPhone,
          photoUrl,
        });
      }

      const ridersSaveResult = await replacePartnerRiders(user.id, riderPayload);
      if (!ridersSaveResult.ok) {
        showAppAlert("Error", ridersSaveResult.error);
        return;
      }

      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save rider details.";
      showAppAlert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [
    address,
    businessName,
    callingCode,
    completedRiders,
    isAddressMissing,
    isBusinessNameMissing,
    isPhoneValid,
    isSaving,
    phoneNumber,
    responsibilityAccepted,
    router,
    user?.id,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <PartnerHeader
        title={s.riderRegistrationTitle}
        leftIcon="arrow-left"
        onLeftPress={() => router.back()}
        leftAccessibilityLabel={s.back}
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
          <Text style={styles.heading}>{s.riderRegistrationHeading}</Text>
          <Text style={styles.subheading}>{s.riderRegistrationSubtitle}</Text>

          <RequiredFieldLabel label={s.businessNamePlaceholder} />
          <FormTextInput
            placeholder={s.businessNamePlaceholder}
            value={businessName}
            onChangeText={setBusinessName}
          />
          {submitAttempted && isBusinessNameMissing ? (
            <Text style={styles.errorText}>{s.requiredFieldError}</Text>
          ) : null}

          <RequiredFieldLabel label={s.phoneNumberPlaceholder} />
          <Input
            variant="phone"
            placeholder={s.phoneNumberPlaceholder}
            value={phoneNumber}
            onChangeText={(value) => setPhoneNumber(normalizePhoneDigits(value))}
            selectedCca2={countryCode}
            selectedCallingCode={callingCode}
            onCountrySelect={(selected) => {
              setCountryCode(selected.cca2);
              setCallingCode(selected.callingCode);
            }}
            containerStyle={styles.phoneInput}
          />
          {submitAttempted && isPhoneMissing ? (
            <Text style={styles.errorText}>{s.requiredFieldError}</Text>
          ) : null}
          {submitAttempted && !isPhoneMissing && !isPhoneValid ? (
            <Text style={styles.errorText}>{s.riderPhoneInvalid}</Text>
          ) : null}

          <RequiredFieldLabel label={s.addressPlaceholder} />
          <FormTextInput
            placeholder={s.addressPlaceholder}
            value={address}
            onChangeText={setAddress}
          />
          {submitAttempted && isAddressMissing ? (
            <Text style={styles.errorText}>{s.requiredFieldError}</Text>
          ) : null}

          <View style={styles.ridersSection}>
            <Text style={styles.sectionTitle}>
              {s.riderDetailsSectionTitle}
              <Text style={styles.requiredAsterisk}> *</Text>
            </Text>
            <Text style={styles.sectionHint}>{s.riderDetailsSectionHint}</Text>

            {riders.map((rider, index) => {
              const riderPhoneValid = rider.phone.trim().length > 0
                ? Boolean(parsePhoneNumberFromString(`+${rider.callingCode}${rider.phone}`)?.isValid())
                : false;
              const showRiderErrors = submitAttempted;

              return (
                <View key={rider.id} style={styles.riderCard}>
                  <View style={styles.riderCardHeader}>
                    <Text style={styles.riderCardTitle}>
                      {s.riderCardTitle.replace("{index}", String(index + 1))}
                    </Text>
                    {riders.length > 1 ? (
                      <Pressable
                        onPress={() => removeRider(rider.id)}
                        accessibilityRole="button"
                        accessibilityLabel={s.removeRider}
                      >
                        <Text style={styles.removeRiderText}>{s.removeRider}</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <RequiredFieldLabel label={s.riderNameLabel} />
                  <FormTextInput
                    placeholder={s.riderNamePlaceholder}
                    value={rider.name}
                    onChangeText={(value) => updateRider(rider.id, { name: value })}
                  />
                  {showRiderErrors && rider.name.trim().length === 0 ? (
                    <Text style={styles.errorText}>{s.requiredFieldError}</Text>
                  ) : null}

                  <RequiredFieldLabel label={s.riderPhoneLabel} />
                  <Input
                    variant="phone"
                    placeholder={s.riderPhonePlaceholder}
                    value={rider.phone}
                    onChangeText={(value) =>
                      updateRider(rider.id, { phone: normalizePhoneDigits(value) })
                    }
                    selectedCca2={rider.countryCode}
                    selectedCallingCode={rider.callingCode}
                    onCountrySelect={(selected) =>
                      updateRider(rider.id, {
                        countryCode: selected.cca2,
                        callingCode: selected.callingCode,
                      })
                    }
                    containerStyle={styles.phoneInput}
                  />
                  {showRiderErrors && rider.phone.trim().length === 0 ? (
                    <Text style={styles.errorText}>{s.requiredFieldError}</Text>
                  ) : null}
                  {showRiderErrors && rider.phone.trim().length > 0 && !riderPhoneValid ? (
                    <Text style={styles.errorText}>{s.riderPhoneInvalid}</Text>
                  ) : null}

                  <RequiredFieldLabel label={s.riderPhotoLabel} />
                  <Pressable
                    style={({ pressed }) => [
                      styles.photoPicker,
                      pressed && styles.photoPickerPressed,
                    ]}
                    onPress={() => pickRiderPhoto(rider.id)}
                    accessibilityRole="button"
                    accessibilityLabel={s.riderPhotoLabel}
                  >
                    {rider.photoUri ? (
                      <Image source={{ uri: rider.photoUri }} style={styles.photoPreview} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <MaterialCommunityIcons name="account" size={36} color={c.blue500} />
                        <Text style={styles.photoPlaceholderText}>{s.riderPhotoPlaceholder}</Text>
                      </View>
                    )}
                  </Pressable>
                  {showRiderErrors && rider.photoUri.trim().length === 0 ? (
                    <Text style={styles.errorText}>{s.riderPhotoRequired}</Text>
                  ) : null}
                </View>
              );
            })}

            <AppButton
              label={s.addRider}
              onPress={addRider}
              variant="outline"
              leftIcon="plus"
              fullWidth
              style={styles.addRiderBtn}
              accessibilityLabel={s.addRider}
            />

            {submitAttempted && !hasAtLeastOneRider ? (
              <Text style={styles.errorText}>{s.riderMinimumRequired}</Text>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.checkboxRow, pressed && styles.checkboxRowPressed]}
            onPress={() => setResponsibilityAccepted((prev) => !prev)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: responsibilityAccepted }}
            accessibilityLabel={s.riderResponsibilityLabel}
          >
            <View
              style={[
                styles.roundCheckbox,
                responsibilityAccepted && styles.roundCheckboxChecked,
              ]}
            >
              {responsibilityAccepted ? (
                <MaterialCommunityIcons name="check" size={14} color={c.background} />
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>
              {s.riderResponsibilityLabel}
              <Text style={styles.requiredAsterisk}> *</Text>
            </Text>
          </Pressable>
          {submitAttempted && !responsibilityAccepted ? (
            <Text style={styles.errorText}>{s.riderResponsibilityRequired}</Text>
          ) : null}

          <AppButton
            label={s.finish}
            onPress={handleSubmit}
            variant="filled"
            leftIcon="arrow-left"
            fullWidth
            loading={isSaving || isLoading}
            disabled={isSaving || isLoading}
            style={styles.finishBtn}
            accessibilityLabel={s.finish}
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
  keyboardView: {
    flex: 1,
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
    marginBottom: 8,
  },
  subheading: {
    fontSize: fs.descText,
    color: c.blue500,
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: fs.descText,
    fontWeight: "500",
    color: c.white,
    marginBottom: 8,
    marginTop: 4,
  },
  requiredAsterisk: {
    color: c.white,
    fontWeight: "600",
  },
  phoneInput: {
    marginBottom: 8,
  },
  errorText: {
    color: "#f87171",
    fontSize: fs.descText,
    marginBottom: 8,
  },
  ridersSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: fs.descText,
    color: c.blue500,
    marginBottom: 14,
    lineHeight: 20,
  },
  riderCard: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.modalBorder,
    padding: 16,
    marginBottom: 14,
  },
  riderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  riderCardTitle: {
    fontSize: fs.smallText,
    fontWeight: "600",
    color: c.white,
  },
  removeRiderText: {
    fontSize: fs.descText,
    color: "#f87171",
    fontWeight: "500",
  },
  photoPicker: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.modalBorder,
    overflow: "hidden",
    marginBottom: 8,
  },
  photoPickerPressed: {
    opacity: 0.9,
  },
  photoPreview: {
    width: "100%",
    height: 180,
    backgroundColor: c.background,
  },
  photoPlaceholder: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.background,
  },
  photoPlaceholderText: {
    fontSize: fs.descText,
    color: c.blue500,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  addRiderBtn: {
    marginTop: 4,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 20,
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
    marginTop: 2,
  },
  roundCheckboxChecked: {
    backgroundColor: c.blue500,
    borderColor: c.blue500,
  },
  checkboxLabel: {
    fontSize: fs.descText,
    fontWeight: "500",
    color: c.white,
    flex: 1,
    lineHeight: 21,
  },
  finishBtn: {
    marginTop: 24,
  },
});
