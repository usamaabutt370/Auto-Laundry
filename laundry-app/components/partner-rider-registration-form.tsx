import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { type CountryCode } from "react-native-country-picker-modal";

import { showAppAlert } from "@/components/app-alert";
import { AppHeader } from "@/components/app-header";
import { AppCtaButton } from "@/components/ui/cta-button";
import { Input } from "@/components/ui/input";
import { UI } from "@/constants/theme";
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

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

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
      <StatusBar style="dark" />
      <AppHeader
        appearance="light"
        compact
        title={s.riderRegistrationTitle}
        subtitle={s.riderRegistrationSubtitle}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
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
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{s.pickupContactTitle}</Text>
            <Text style={styles.sectionHint}>{s.pickupContactHint}</Text>

            <RequiredFieldLabel label={s.businessNamePlaceholder} />
            <TextInput
              style={styles.fieldInput}
              placeholder={s.businessNamePlaceholder}
              placeholderTextColor={UI.muted}
              value={businessName}
              onChangeText={setBusinessName}
            />
            {submitAttempted && isBusinessNameMissing ? (
              <Text style={styles.errorText}>{s.requiredFieldError}</Text>
            ) : null}

            <RequiredFieldLabel label={s.phoneNumberPlaceholder} />
            <Input
              appearance="light"
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
            <TextInput
              style={styles.fieldInput}
              placeholder={s.addressPlaceholder}
              placeholderTextColor={UI.muted}
              value={address}
              onChangeText={setAddress}
            />
            {submitAttempted && isAddressMissing ? (
              <Text style={styles.errorText}>{s.requiredFieldError}</Text>
            ) : null}
          </View>

          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadCopy}>
              <Text style={styles.sectionTitle}>
                {s.riderDetailsSectionTitle}
                <Text style={styles.requiredAsterisk}> *</Text>
              </Text>
              <Text style={styles.sectionHint}>{s.riderDetailsSectionHint}</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                {fill(s.ridersReadyCount, {
                  ready: completedRiders.length,
                  total: riders.length,
                })}
              </Text>
            </View>
          </View>

          {riders.map((rider, index) => {
            const riderPhoneValid =
              rider.phone.trim().length > 0
                ? Boolean(
                    parsePhoneNumberFromString(`+${rider.callingCode}${rider.phone}`)?.isValid(),
                  )
                : false;
            const nameOk = rider.name.trim().length > 0;
            const photoOk = rider.photoUri.trim().length > 0;
            const status =
              nameOk && riderPhoneValid && photoOk
                ? "ready"
                : nameOk && riderPhoneValid
                  ? "photo"
                  : "incomplete";
            const showRiderErrors = submitAttempted;

            return (
              <View key={rider.id} style={styles.riderCard}>
                <View style={styles.riderTop}>
                  <Pressable
                    onPress={() => pickRiderPhoto(rider.id)}
                    style={({ pressed }) => [styles.photoBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={s.riderPhotoLabel}
                  >
                    {photoOk ? (
                      <Image source={{ uri: rider.photoUri }} style={styles.photo} />
                    ) : (
                      <View style={styles.photoEmpty}>
                        <MaterialCommunityIcons
                          name="camera-plus-outline"
                          size={26}
                          color={UI.blue}
                        />
                      </View>
                    )}
                    <View style={styles.cameraBadge}>
                      <MaterialCommunityIcons name="camera" size={12} color="#FFFFFF" />
                    </View>
                  </Pressable>

                  <View style={styles.riderIdentity}>
                    <Text style={styles.riderCardTitle}>
                      {s.riderCardTitle.replace("{index}", String(index + 1))}
                    </Text>
                    <Text style={styles.photoCaption}>{s.riderPhotoLabel}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        status === "ready" && styles.statusReady,
                        status === "photo" && styles.statusPhoto,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={
                          status === "ready"
                            ? "check-circle"
                            : status === "photo"
                              ? "camera-outline"
                              : "alert-circle-outline"
                        }
                        size={13}
                        color={
                          status === "ready"
                            ? "#059669"
                            : status === "photo"
                              ? "#B45309"
                              : UI.muted
                        }
                      />
                      <Text
                        style={[
                          styles.statusText,
                          status === "ready" && styles.statusTextReady,
                          status === "photo" && styles.statusTextPhoto,
                        ]}
                      >
                        {status === "ready"
                          ? s.riderStatusReady
                          : status === "photo"
                            ? s.riderStatusPhoto
                            : s.riderStatusIncomplete}
                      </Text>
                    </View>
                  </View>

                  {riders.length > 1 ? (
                    <Pressable
                      onPress={() => removeRider(rider.id)}
                      style={styles.removeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={s.removeRider}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={UI.red} />
                    </Pressable>
                  ) : null}
                </View>

                <RequiredFieldLabel label={s.riderNameLabel} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder={s.riderNamePlaceholder}
                  placeholderTextColor={UI.muted}
                  value={rider.name}
                  onChangeText={(value) => updateRider(rider.id, { name: value })}
                />
                {showRiderErrors && !nameOk ? (
                  <Text style={styles.errorText}>{s.requiredFieldError}</Text>
                ) : null}

                <RequiredFieldLabel label={s.riderPhoneLabel} />
                <Input
                  appearance="light"
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
                {showRiderErrors && !photoOk ? (
                  <Text style={styles.errorText}>{s.riderPhotoRequired}</Text>
                ) : null}
              </View>
            );
          })}

          <Pressable
            onPress={addRider}
            style={({ pressed }) => [styles.addRider, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={s.addRider}
          >
            <MaterialCommunityIcons name="plus" size={18} color={UI.blue} />
            <Text style={styles.addRiderText}>{s.addRider}</Text>
          </Pressable>
          {submitAttempted && !hasAtLeastOneRider ? (
            <Text style={styles.errorText}>{s.riderMinimumRequired}</Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.ackCard, pressed && styles.pressed]}
            onPress={() => setResponsibilityAccepted((prev) => !prev)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: responsibilityAccepted }}
            accessibilityLabel={s.riderResponsibilityLabel}
          >
            <View style={styles.ackIcon}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={UI.purple} />
            </View>
            <Text style={styles.ackLabel}>
              {s.riderResponsibilityLabel}
              <Text style={styles.requiredAsterisk}> *</Text>
            </Text>
            <View
              style={[styles.roundCheckbox, responsibilityAccepted && styles.roundCheckboxChecked]}
            >
              {responsibilityAccepted ? (
                <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
              ) : null}
            </View>
          </Pressable>
          {submitAttempted && !responsibilityAccepted ? (
            <Text style={styles.errorText}>{s.riderResponsibilityRequired}</Text>
          ) : null}

          <AppCtaButton
            label={s.finish}
            onPress={handleSubmit}
            rightIcon="check"
            width="full"
            loading={isSaving || isLoading}
            disabled={isSaving || isLoading}
            style={styles.finishBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
  },
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#E8ECF2",
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  sectionHeadCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.purpleDeep,
  },
  sectionHint: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  countPill: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  countPillText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: UI.purpleDeep,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    marginBottom: 6,
    marginTop: 2,
  },
  requiredAsterisk: {
    color: UI.red,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.border,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: UI.text,
    marginBottom: 10,
  },
  phoneInput: {
    marginBottom: 10,
  },
  errorText: {
    color: UI.red,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginTop: -4,
    marginBottom: 8,
  },
  riderCard: {
    borderWidth: 1,
    borderColor: "#E8ECF2",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  riderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  photoBtn: {
    width: 76,
    height: 76,
  },
  photo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: UI.iconWell,
  },
  photoEmpty: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: UI.blue,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: UI.blue,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  riderIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  riderCardTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: UI.text,
  },
  photoCaption: {
    fontSize: 12,
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
    backgroundColor: "#F3F4F6",
  },
  statusReady: {
    backgroundColor: "#D1FAE5",
  },
  statusPhoto: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
  },
  statusTextReady: {
    color: "#059669",
  },
  statusTextPhoto: {
    color: "#B45309",
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.redBg,
  },
  addRider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: UI.blue,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 8,
    backgroundColor: "#F8FAFF",
  },
  addRiderText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.blue,
  },
  ackCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    backgroundColor: "#F8F7FF",
  },
  ackIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ackLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Regular",
    color: UI.text,
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
    marginTop: 2,
  },
  roundCheckboxChecked: {
    backgroundColor: UI.purple,
    borderColor: UI.purple,
  },
  pressed: {
    opacity: 0.88,
  },
  finishBtn: {
    marginTop: 18,
  },
});

