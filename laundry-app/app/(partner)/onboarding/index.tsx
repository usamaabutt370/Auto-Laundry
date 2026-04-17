import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Input } from "@/components";
import { FormTextInput } from "@/components/form-text-input";
import { AppButton } from "@/components/ui/button";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { getStrings } from "@/locales";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getCoordinatesWithFallback } from "@/utils/geocoding";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { type CountryCode } from "react-native-country-picker-modal";

const PHONE_DIGITS_MAX = 10;
const HOURS = Array.from({ length: 12 }, (_, idx) => idx + 1);
const MINUTES = Array.from({ length: 60 }, (_, idx) => idx);
const PERIODS = ["AM", "PM"] as const;
const WHEEL_ITEM_HEIGHT = 40;

function normalizePhoneDigits(rawValue: string): string {
  let digits = rawValue.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  // Most international numbers are 15 digits max
  return digits.slice(0, 15);
}

function formatTimeLabel(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const minuteLabel = String(minutes).padStart(2, "0");
  return `${hour12}:${minuteLabel} ${period}`;
}

function parseTimeLabelToDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const date = new Date();
  let hours24 = hour % 12;
  if (period === "PM") {
    hours24 += 12;
  }
  date.setHours(hours24, minute, 0, 0);
  return date;
}

export default function PartnerOnboardingStep1() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();
  const s = getStrings(locale).partner.onboarding;

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("PK");
  const [callingCode, setCallingCode] = useState("92");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerPeriod, setPickerPeriod] = useState<(typeof PERIODS)[number]>("AM");
  const [address, setAddress] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hourRef = useRef<FlatList<number> | null>(null);
  const minuteRef = useRef<FlatList<number> | null>(null);
  const periodRef = useRef<FlatList<(typeof PERIODS)[number]> | null>(null);

  const startTimeLabel = startTime ? formatTimeLabel(startTime) : "";
  const endTimeLabel = endTime ? formatTimeLabel(endTime) : "";
  const isAvailableTimeValid =
    Boolean(startTime && endTime) &&
    startTime!.getHours() * 60 + startTime!.getMinutes() <
      endTime!.getHours() * 60 + endTime!.getMinutes();
  const normalizedAvailableTime =
    startTime && endTime ? `${startTimeLabel} - ${endTimeLabel}` : "";

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) return;
    supabase
      .from("partner_profiles")
      .select(
        "business_name, business_description, phone_number, available_time, address, latitude, longitude"
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBusinessName(data.business_name ?? "");
          setBusinessDescription(data.business_description ?? "");
          const rawPhone = data.phone_number ?? "";
          if (rawPhone.startsWith("+")) {
            const parsed = parsePhoneNumberFromString(rawPhone);
            if (parsed) {
              setPhoneNumber(parsed.nationalNumber as string);
              setCountryCode(parsed.country as CountryCode);
              setCallingCode(parsed.countryCallingCode as string);
            } else {
              setPhoneNumber(normalizePhoneDigits(rawPhone));
            }
          } else {
            setPhoneNumber(normalizePhoneDigits(rawPhone));
          }
          const rawAvailable = (data.available_time ?? "").trim();
          const [rawStart = "", rawEnd = ""] = rawAvailable
            .split("-")
            .map((v: string) => v.trim());
          setStartTime(parseTimeLabelToDate(rawStart));
          setEndTime(parseTimeLabelToDate(rawEnd));
          setAddress(data.address ?? "");
        }
      });
  }, [user?.id]);

  const isBusinessNameMissing = businessName.trim().length === 0;
  const isBusinessDescriptionMissing = businessDescription.trim().length === 0;
  const isAddressMissing = address.trim().length === 0;
  const isPhoneMissing = phoneNumber.trim().length === 0;
  const fullPhone = `+${callingCode}${phoneNumber}`;
  const parsedPhoneObj = parsePhoneNumberFromString(fullPhone);
  const isPhoneValid = Boolean(parsedPhoneObj && parsedPhoneObj.isValid());

  const isAvailableTimeMissing = !startTime || !endTime;
  const isFormValid =
    !isBusinessNameMissing &&
    !isBusinessDescriptionMissing &&
    !isAddressMissing &&
    isPhoneValid &&
    isAvailableTimeValid;

  const openPicker = useCallback(
    (type: "start" | "end") => {
      const base = type === "start" ? startTime ?? new Date() : endTime ?? new Date();
      const hours = base.getHours();
      const hour = hours % 12 || 12;
      const minute = base.getMinutes();
      const period = hours >= 12 ? "PM" : "AM";
      setPickerHour(hour);
      setPickerMinute(minute);
      setPickerPeriod(period);
      setActivePicker(type);
      setTimeout(() => {
        hourRef.current?.scrollToOffset({
          offset: (hour - 1) * WHEEL_ITEM_HEIGHT,
          animated: false,
        });
        minuteRef.current?.scrollToOffset({
          offset: minute * WHEEL_ITEM_HEIGHT,
          animated: false,
        });
        periodRef.current?.scrollToOffset({
          offset: (period === "AM" ? 0 : 1) * WHEEL_ITEM_HEIGHT,
          animated: false,
        });
      }, 0);
    },
    [startTime, endTime]
  );

  const handlePickerConfirm = useCallback(() => {
    if (!activePicker) return;
    const selected = new Date();
    let hours24 = pickerHour % 12;
    if (pickerPeriod === "PM") {
      hours24 += 12;
    }
    selected.setHours(hours24, pickerMinute, 0, 0);
    if (activePicker === "start") {
      setStartTime(selected);
    } else {
      setEndTime(selected);
    }
    setActivePicker(null);
  }, [activePicker, pickerHour, pickerMinute, pickerPeriod]);

  const getWheelIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);

  const handleNext = useCallback(async () => {
    if (isSaving) return;
    setSubmitAttempted(true);
    if (!isFormValid) return;
    if (!isSupabaseConfigured() || !supabase) {
      Alert.alert(
        "Configuration error",
        "Supabase is not configured. Please add your Supabase URL and anon key to the environment."
      );
      return;
    }

    if (!user?.id) {
      Alert.alert("Authentication error", "Please sign in again and try.");
      return;
    }

    setIsSaving(true);
    try {
      const coords = await getCoordinatesWithFallback(address.trim());
      const fullPhone = `+${callingCode}${phoneNumber}`;
      const parsedPhoneObj = parsePhoneNumberFromString(fullPhone);
      const normalizedPhone = parsedPhoneObj ? parsedPhoneObj.number : fullPhone;

      const payload: {
        id: string;
        business_name: string;
        business_description: string;
        phone_number: string;
        available_time: string;
        address: string;
        updated_at: string;
        latitude?: number;
        longitude?: number;
      } = {
        id: user.id,
        business_name: businessName.trim(),
        business_description: businessDescription.trim(),
        phone_number: normalizedPhone,
        available_time: normalizedAvailableTime.toUpperCase(),
        address: address.trim(),
        updated_at: new Date().toISOString(),
      };
      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      } else {
        console.warn("OSM geocoding failed for address:", address.trim());
      }
      const { error } = await supabase.from("partner_profiles").upsert(payload, {
        onConflict: "id",
      });

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      router.push("/(partner)/onboarding/step2");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to save details.";
      Alert.alert("Save failed", message);
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    isFormValid,
    user?.id,
    businessName,
    businessDescription,
    phoneNumber,
    normalizedAvailableTime,
    address,
    router,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <PartnerHeader
        title={s.step1Title}
        // subtitle={s.step1Subtitle}
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
        <Text style={styles.businessNameLabel}>Business Name</Text>
        <FormTextInput
          placeholder={s.businessNamePlaceholder}
          value={businessName}
          onChangeText={setBusinessName}
        />
        <Text style={styles.businessNameLabel}>Business Contact Number</Text>
        {submitAttempted && isBusinessNameMissing ? (
          <Text style={styles.errorText}>
            {s.requiredFieldError ?? "This field is required."}
          </Text>
        ) : null}
        <Input
          variant="phone"
          placeholder={s.phoneNumberPlaceholder}
          value={phoneNumber}
          onChangeText={(value) => setPhoneNumber(normalizePhoneDigits(value))}
          selectedCca2={countryCode}
          selectedCallingCode={callingCode}
          onCountrySelect={(c) => {
            setCountryCode(c.cca2);
            setCallingCode(c.callingCode);
          }}
          containerStyle={styles.phoneInput}
        />
        <Text style={styles.businessNameLabel}>Business Available Time</Text>

        {submitAttempted && isPhoneMissing ? (
          <Text style={styles.errorText}>
            {s.requiredFieldError ?? "This field is required."}
          </Text>
        ) : null}
        {submitAttempted && !isPhoneMissing && !isPhoneValid ? (
          <Text style={styles.errorText}>
            {s.phoneNumberHintInvalid ?? "Enter a valid 10-digit phone number."}
          </Text>
        ) : null}
        <View style={styles.timeRow}>
          <Pressable
            style={styles.timeInputHalf}
            onPress={() => openPicker("start")}
            accessibilityRole="button"
            accessibilityLabel={s.startTimePlaceholder}
          >
            <Text
              style={[
                styles.timeInputText,
                !startTimeLabel && styles.timeInputPlaceholder,
              ]}
            >
              {startTimeLabel || s.startTimePlaceholder}
            </Text>
          </Pressable>
          <Pressable
            style={styles.timeInputHalf}
            onPress={() => openPicker("end")}
            accessibilityRole="button"
            accessibilityLabel={s.endTimePlaceholder}
          >
            <Text
              style={[
                styles.timeInputText,
                !endTimeLabel && styles.timeInputPlaceholder,
              ]}
            >
              {endTimeLabel || s.endTimePlaceholder}
            </Text>
          </Pressable>
        </View>
        {submitAttempted && isAvailableTimeMissing ? (
          <Text style={styles.errorText}>
            {s.requiredFieldError ?? "This field is required."}
          </Text>
        ) : null}
        {submitAttempted && !isAvailableTimeMissing && !isAvailableTimeValid ? (
          <Text style={styles.errorText}>
            {s.availableTimeRangeInvalid ?? "End time must be after start time."}
          </Text>
        ) : null}
        <Modal transparent visible={Boolean(activePicker)} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.pickerTitle}>
                {activePicker === "start" ? s.startTimePlaceholder : s.endTimePlaceholder}
              </Text>
              <View style={styles.wheelContainer}>
                <View style={styles.wheelHighlight} />
                <FlatList
                  ref={hourRef}
                  data={HOURS}
                  keyExtractor={(item) => `hour-${item}`}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={WHEEL_ITEM_HEIGHT}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: WHEEL_ITEM_HEIGHT,
                    offset: WHEEL_ITEM_HEIGHT * index,
                    index,
                  })}
                  onMomentumScrollEnd={(event) => {
                    const idx = Math.min(11, Math.max(0, getWheelIndex(event)));
                    setPickerHour(HOURS[idx]);
                  }}
                  style={styles.wheelList}
                  contentContainerStyle={styles.wheelContent}
                  renderItem={({ item }) => (
                    <View style={styles.wheelItem}>
                      <Text
                        style={[
                          styles.wheelText,
                          item === pickerHour && styles.wheelTextSelected,
                        ]}
                      >
                        {String(item).padStart(2, "0")}
                      </Text>
                    </View>
                  )}
                />
                <FlatList
                  ref={minuteRef}
                  data={MINUTES}
                  keyExtractor={(item) => `minute-${item}`}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={WHEEL_ITEM_HEIGHT}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: WHEEL_ITEM_HEIGHT,
                    offset: WHEEL_ITEM_HEIGHT * index,
                    index,
                  })}
                  onMomentumScrollEnd={(event) => {
                    const idx = Math.min(59, Math.max(0, getWheelIndex(event)));
                    setPickerMinute(MINUTES[idx]);
                  }}
                  style={styles.wheelList}
                  contentContainerStyle={styles.wheelContent}
                  renderItem={({ item }) => (
                    <View style={styles.wheelItem}>
                      <Text
                        style={[
                          styles.wheelText,
                          item === pickerMinute && styles.wheelTextSelected,
                        ]}
                      >
                        {String(item).padStart(2, "0")}
                      </Text>
                    </View>
                  )}
                />
                <FlatList
                  ref={periodRef}
                  data={PERIODS}
                  keyExtractor={(item) => `period-${item}`}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={WHEEL_ITEM_HEIGHT}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: WHEEL_ITEM_HEIGHT,
                    offset: WHEEL_ITEM_HEIGHT * index,
                    index,
                  })}
                  onMomentumScrollEnd={(event) => {
                    const idx = Math.min(1, Math.max(0, getWheelIndex(event)));
                    setPickerPeriod(PERIODS[idx]);
                  }}
                  style={styles.wheelList}
                  contentContainerStyle={styles.wheelContent}
                  renderItem={({ item }) => (
                    <View style={styles.wheelItem}>
                      <Text
                        style={[
                          styles.wheelText,
                          item === pickerPeriod && styles.wheelTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                  )}
                />
                <View pointerEvents="none" style={styles.wheelFadeTop} />
                <View pointerEvents="none" style={styles.wheelFadeBottom} />
              </View>
              <View style={styles.pickerActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setActivePicker(null)}
                  accessibilityRole="button"
                  accessibilityLabel={s.back}
                >
                  <Text style={styles.cancelBtnText}>{s.back}</Text>
                </Pressable>
                <Pressable
                  style={styles.doneBtn}
                  onPress={handlePickerConfirm}
                  accessibilityRole="button"
                  accessibilityLabel={s.confirm}
                >
                  <Text style={styles.doneBtnText}>{s.confirm}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <Text style={styles.businessNameLabel}>Business Address</Text>
        <FormTextInput
          placeholder={s.addressPlaceholder}
          value={address}
          onChangeText={setAddress}
        />
        {submitAttempted && isAddressMissing ? (
          <Text style={styles.errorText}>
            {s.requiredFieldError ?? "This field is required."}
          </Text>
        ) : null}
        <Text style={styles.businessNameLabel}>Business Description</Text>
        <FormTextInput
          placeholder={s.businessDescriptionPlaceholder}
          value={businessDescription}
          onChangeText={setBusinessDescription}
          multiline
          numberOfLines={4}
        />
        {submitAttempted && isBusinessDescriptionMissing ? (
          <Text style={styles.errorText}>
            {s.requiredFieldError ?? "This field is required."}
          </Text>
        ) : null}
        <AppButton
          label={s.next}
          onPress={handleNext}
          variant="filled"
          rightIcon="arrow-right"
          fullWidth
          loading={isSaving}
          disabled={isSaving}
          style={styles.nextBtn}
          accessibilityLabel={s.next}
        />
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  nextBtn: {
    marginTop: 8,
  },
  phoneInput: {
    marginBottom: 16,
  },
  timeInput: {
    backgroundColor: theme.colors.blue900,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingVertical: 17,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timeInputHalf: {
    width: "47%",
    backgroundColor: theme.colors.blue900,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingVertical: 17,
    paddingHorizontal: 14,
  },
  timeInputText: {
    fontSize: theme.fontSize.smallText,
    color: theme.colors.white,
  },
  timeInputPlaceholder: {
    color: theme.colors.blue500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: theme.colors.blue900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 12,
  },
  pickerTitle: {
    color: theme.colors.white,
    fontSize: theme.fontSize.smallText,
    marginBottom: 8,
  },
  wheelContainer: {
    flexDirection: "row",
    gap: 8,
    height: WHEEL_ITEM_HEIGHT * 5,
    position: "relative",
    overflow: "hidden",
  },
  wheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: WHEEL_ITEM_HEIGHT * 2,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 2,
  },
  wheelList: {
    flex: 1,
  },
  wheelContent: {
    paddingVertical: WHEEL_ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: theme.fontSize.smallText,
    fontWeight: "500",
  },
  wheelTextSelected: {
    color: theme.colors.white,
    fontSize: theme.fontSize.smallTitle,
    fontWeight: "700",
  },
  wheelFadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: WHEEL_ITEM_HEIGHT * 1.5,
    backgroundColor: "rgba(52,116,136,0.55)",
    zIndex: 3,
  },
  wheelFadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: WHEEL_ITEM_HEIGHT * 1.5,
    backgroundColor: "rgba(52,116,136,0.55)",
    zIndex: 3,
  },
  pickerActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: theme.colors.blue500,
    fontSize: theme.fontSize.smallText,
  },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneBtnText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.smallText,
    fontWeight: "600",
  },
  errorText: {
    color: "#FFB3B3",
    fontSize: theme.fontSize.smallText,
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  businessNameLabel: {
    fontSize: theme.fontSize.xSmallText,
    color: theme.colors.white,
    marginBottom: 8,
  },
});
