import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import { FormTextInput } from "@/components/form-text-input";
import { Input } from "@/components/ui/input";
import { AppButton } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { getStrings } from "@/locales";
import { ensureActiveUserProfile } from "@/lib/ensure-user-profile";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getDeviceCoordinatesWithStatus } from "@/utils/device-location";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

const HOURS = Array.from({ length: 12 }, (_, idx) => idx + 1);
const MINUTES = Array.from({ length: 60 }, (_, idx) => idx);
const PERIODS = ["AM", "PM"] as const;
const WHEEL_ITEM_HEIGHT = 40;
const MAX_BUSINESS_IMAGES = 10;
const BUSINESS_IMAGES_BUCKET = "business-images";

type StagedBusinessImage = {
  id: string;
  uri: string;
  uploaded: boolean;
};

type PartnerBusinessDetailsFormMode = "onboarding" | "profile";

const ROLE_SWITCH_RETURN_ROUTES: Record<string, "/(customer)/(tabs)/profile" | "/(customer)/userinfo"> = {
  customer_profile: "/(customer)/(tabs)/profile",
  customer_userinfo: "/(customer)/userinfo",
};

type Props = {
  mode: PartnerBusinessDetailsFormMode;
};

function normalizePhoneDigits(rawValue: string): string {
  let digits = rawValue.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
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
  if (period === "PM") hours24 += 12;
  date.setHours(hours24, minute, 0, 0);
  return date;
}

export function PartnerBusinessDetailsForm({ mode }: Props) {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string; returnTo?: string }>();
  const { locale } = useLocale();
  const { user, refreshRole } = useAuth();
  const s = getStrings(locale).partner.onboarding;
  const settings = getStrings(locale).partner.settings;

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
  const [businessImages, setBusinessImages] = useState<StagedBusinessImage[]>([]);
  const hourRef = useRef<ScrollView | null>(null);
  const minuteRef = useRef<ScrollView | null>(null);
  const periodRef = useRef<ScrollView | null>(null);

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
        "business_name, business_description, phone_number, available_time, address, latitude, longitude, business_images"
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBusinessName(data.business_name ?? "");
        setBusinessDescription(data.business_description ?? "");
        const rawPhone = data.phone_number ?? "";
        if (rawPhone.startsWith("+")) {
          const parsed = parsePhoneNumberFromString(rawPhone);
          if (parsed) {
            setPhoneNumber(parsed.nationalNumber as string);
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

        const imagesRaw = (data as { business_images?: unknown }).business_images;
        if (Array.isArray(imagesRaw)) {
          setBusinessImages(
            imagesRaw
              .filter((v): v is string => typeof v === "string")
              .map((url) => ({
                id: `remote-${url}`,
                uri: url,
                uploaded: true,
              }))
          );
        }
      });

    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle<{ phone: string | null }>()
      .then(({ data }) => {
        if (data?.phone?.trim() && phoneNumber.trim().length === 0) {
          const parsed = parsePhoneNumberFromString(data.phone.trim());
          if (parsed) {
            if (parsed.country) setCountryCode(parsed.country as CountryCode);
            setCallingCode(parsed.countryCallingCode as string);
            setPhoneNumber(parsed.nationalNumber as string);
          } else {
            setPhoneNumber(normalizePhoneDigits(data.phone));
          }
        }
      });
  }, [user?.id, phoneNumber]);

  const isBusinessNameMissing = businessName.trim().length === 0;
  const isBusinessDescriptionMissing = businessDescription.trim().length === 0;
  const isAddressMissing = address.trim().length === 0;
  const isPhoneMissing = phoneNumber.trim().length === 0;
  const isPhoneValid = !isPhoneMissing
    ? Boolean(parsePhoneNumberFromString(`+${callingCode}${phoneNumber}`)?.isValid())
    : false;
  const isAvailableTimeMissing = !startTime || !endTime;
  const isFormValid =
    !isBusinessNameMissing &&
    !isBusinessDescriptionMissing &&
    !isAddressMissing &&
    isPhoneValid &&
    isAvailableTimeValid;

  const openPicker = useCallback(
    (type: "start" | "end") => {
      const base = (() => {
        if (type === "start") {
          if (startTime) return startTime;
          const d = new Date();
          d.setHours(7, 0, 0, 0);
          return d;
        }
        if (endTime) return endTime;
        const d = new Date();
        d.setHours(19, 0, 0, 0);
        return d;
      })();
      const hours = base.getHours();
      setPickerHour(hours % 12 || 12);
      setPickerMinute(base.getMinutes());
      setPickerPeriod(hours >= 12 ? "PM" : "AM");
      setActivePicker(type);
      setTimeout(() => {
        hourRef.current?.scrollTo({ y: ((hours % 12 || 12) - 1) * WHEEL_ITEM_HEIGHT, animated: false });
        minuteRef.current?.scrollTo({ y: base.getMinutes() * WHEEL_ITEM_HEIGHT, animated: false });
        periodRef.current?.scrollTo({ y: (hours >= 12 ? 1 : 0) * WHEEL_ITEM_HEIGHT, animated: false });
      }, 0);
    },
    [startTime, endTime]
  );

  const handlePickerConfirm = useCallback(() => {
    if (!activePicker) return;
    const selected = new Date();
    let hours24 = pickerHour % 12;
    if (pickerPeriod === "PM") hours24 += 12;
    selected.setHours(hours24, pickerMinute, 0, 0);
    if (activePicker === "start") setStartTime(selected);
    else setEndTime(selected);
    setActivePicker(null);
  }, [activePicker, pickerHour, pickerMinute, pickerPeriod]);

  const getWheelIndex = (offsetY: number, length: number) => {
    const idx = Math.round(offsetY / WHEEL_ITEM_HEIGHT);
    return Math.max(0, Math.min(length - 1, idx));
  };

  const pickBusinessImages = useCallback(async () => {
    if (!supabase || !user?.id) return;
    if (businessImages.length >= MAX_BUSINESS_IMAGES) {
      Alert.alert("Limit reached", `Maximum ${MAX_BUSINESS_IMAGES} business images allowed.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to upload business images.");
      return;
    }
    const remaining = MAX_BUSINESS_IMAGES - businessImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const staged: StagedBusinessImage[] = [];
    result.assets.forEach((asset, index) => {
      if (!asset.uri) return;
      staged.push({
        id: `local-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        uri: asset.uri,
        uploaded: false,
      });
    });
    setBusinessImages((prev) => [...prev, ...staged].slice(0, MAX_BUSINESS_IMAGES));
  }, [businessImages.length, user?.id]);

  const removeBusinessImage = useCallback((imageId: string) => {
    setBusinessImages((prev) => prev.filter((item) => item.id !== imageId));
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (mode === "onboarding" && params.from === "role_switch") {
      void (async () => {
        if (user?.id && isSupabaseConfigured() && supabase) {
          try {
            const { error } = await supabase
              .from("profiles")
              .update({ role: "customer", updated_at: new Date().toISOString() })
              .eq("id", user.id);
            if (error) throw error;
            await refreshRole();
          } catch {
            // Still return to customer even if role revert fails.
          }
        }
        const returnRoute =
          ROLE_SWITCH_RETURN_ROUTES[
            typeof params.returnTo === "string" ? params.returnTo : ""
          ] ?? "/(customer)/(tabs)/profile";
        router.replace(returnRoute);
      })();
      return;
    }

    if (mode === "profile") {
      router.replace("/(partner)/(tabs)/profile");
      return;
    }

    router.replace("/(partner)/(tabs)");
  }, [mode, params.from, params.returnTo, refreshRole, router, user?.id]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack]),
  );

  const handleSubmit = useCallback(async () => {
    if (isSaving) return;
    setSubmitAttempted(true);
    if (!isFormValid) return;
    if (!isSupabaseConfigured() || !supabase) {
      Alert.alert("Configuration error", "Supabase is not configured.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Authentication error", "Please sign in again and try.");
      return;
    }

    const profileReady = await ensureActiveUserProfile(user);
    if (!profileReady.ok) {
      Alert.alert("Account error", profileReady.error);
      return;
    }

    setIsSaving(true);
    try {
      const locationResult = await getDeviceCoordinatesWithStatus();
      console.log("[partner-location] location status:", locationResult.status);
      console.log("[partner-location] coordinates:", locationResult.coords);
      if (!locationResult.coords) {
        if (locationResult.status === "denied") {
          Alert.alert(
            "Location permission required",
            "Please allow location permission so we can place your business marker on the map.",
          );
        } else {
          Alert.alert(
            "Location unavailable",
            "We could not detect your current location. Please try again in an open area with GPS enabled.",
          );
        }
        return;
      }
      const coords = locationResult.coords;
      console.log("[partner-location] using coords for profile:", {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (!coords) {
        Alert.alert(
          "Location unavailable",
          "Unable to detect your current location. Please try again.",
        );
        return;
      }
      const fullPhone = `+${callingCode}${phoneNumber}`;
      const parsedPhoneObj = parsePhoneNumberFromString(fullPhone);
      const normalizedPhone = parsedPhoneObj ? parsedPhoneObj.number : fullPhone;

      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < businessImages.length; i += 1) {
        const image = businessImages[i];
        if (image.uploaded) {
          uploadedImageUrls.push(image.uri);
          continue;
        }
        const lower = image.uri.toLowerCase();
        const isJpeg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");
        const ext = isJpeg ? "jpg" : "png";
        const contentType = isJpeg ? "image/jpeg" : "image/png";
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const file = new FileSystem.File(image.uri);
        const bytes = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from(BUSINESS_IMAGES_BUCKET)
          .upload(path, bytes, { upsert: true, contentType });
        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage.from(BUSINESS_IMAGES_BUCKET).getPublicUrl(path);
        uploadedImageUrls.push(publicUrlData.publicUrl);
      }

      const payload: {
        id: string;
        business_name: string;
        business_description: string;
        phone_number: string;
        available_time: string;
        address: string;
        business_images: string[];
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
        business_images: uploadedImageUrls,
        updated_at: new Date().toISOString(),
      };
      payload.latitude = coords.latitude;
      payload.longitude = coords.longitude;
      console.log("[partner-location] payload coordinates:", {
        latitude: payload.latitude,
        longitude: payload.longitude,
      });

      const { error } = await supabase.from("partner_profiles").upsert(payload, {
        onConflict: "id",
      });
      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      setBusinessImages(
        uploadedImageUrls.map((url) => ({
          id: `remote-${url}`,
          uri: url,
          uploaded: true,
        }))
      );

      if (mode === "onboarding") {
        router.push("/(partner)/onboarding/step2");
      } else {
        router.replace("/(partner)/(tabs)/profile");
      }
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
    address,
    businessName,
    businessDescription,
    phoneNumber,
    businessImages,
    normalizedAvailableTime,
    callingCode,
    mode,
    router,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader
        title={mode === "onboarding" ? s.step1Title : "Business detail"}
        leftIcon="arrow-left"
        onLeftPress={handleBack}
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
          {submitAttempted && isPhoneMissing ? (
            <Text style={styles.errorText}>
              {s.requiredFieldError ?? "This field is required."}
            </Text>
          ) : null}
          <Input
            variant="phone"
            placeholder="Business contact number"
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
          <Text style={styles.phoneHintText}>
            This number is shown as your business contact and can be different from your profile phone.
          </Text>

          <Text style={styles.businessNameLabel}>Business Available Time</Text>
          {submitAttempted && !isPhoneMissing && !isPhoneValid ? (
            <Text style={styles.errorText}>Enter a valid mobile number for {countryCode}.</Text>
          ) : null}
          <View style={styles.timeRow}>
            <Pressable style={styles.timeInputHalf} onPress={() => openPicker("start")}>
              <Text style={[styles.timeInputText, !startTimeLabel && styles.timeInputPlaceholder]}>
                {startTimeLabel || s.startTimePlaceholder}
              </Text>
            </Pressable>
            <Pressable style={styles.timeInputHalf} onPress={() => openPicker("end")}>
              <Text style={[styles.timeInputText, !endTimeLabel && styles.timeInputPlaceholder]}>
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

          <Modal
            transparent
            visible={Boolean(activePicker)}
            animationType="fade"
            onRequestClose={() => setActivePicker(null)}
          >
            <View style={styles.modalOverlay}>
              <Pressable style={styles.modalBackdrop} onPress={() => setActivePicker(null)} />
              <View style={styles.modalCard}>
                <Text style={styles.pickerTitle}>
                  {activePicker === "start" ? s.startTimePlaceholder : s.endTimePlaceholder}
                </Text>
                <View style={styles.wheelContainer}>
                  <View style={styles.wheelHighlight} />
                  <ScrollView
                    ref={hourRef}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, HOURS.length);
                      setPickerHour(HOURS[idx]);
                    }}
                    onScrollEndDrag={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, HOURS.length);
                      setPickerHour(HOURS[idx]);
                    }}
                    style={styles.wheelList}
                    contentContainerStyle={styles.wheelContent}
                  >
                    {HOURS.map((item) => (
                      <View key={`hour-${item}`} style={styles.wheelItem}>
                        <Text style={[styles.wheelText, item === pickerHour && styles.wheelTextSelected]}>
                          {String(item).padStart(2, "0")}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  <ScrollView
                    ref={minuteRef}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, MINUTES.length);
                      setPickerMinute(MINUTES[idx]);
                    }}
                    onScrollEndDrag={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, MINUTES.length);
                      setPickerMinute(MINUTES[idx]);
                    }}
                    style={styles.wheelList}
                    contentContainerStyle={styles.wheelContent}
                  >
                    {MINUTES.map((item) => (
                      <View key={`minute-${item}`} style={styles.wheelItem}>
                        <Text style={[styles.wheelText, item === pickerMinute && styles.wheelTextSelected]}>
                          {String(item).padStart(2, "0")}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  <ScrollView
                    ref={periodRef}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, PERIODS.length);
                      setPickerPeriod(PERIODS[idx]);
                    }}
                    onScrollEndDrag={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, PERIODS.length);
                      setPickerPeriod(PERIODS[idx]);
                    }}
                    style={styles.wheelList}
                    contentContainerStyle={styles.wheelContent}
                  >
                    {PERIODS.map((item) => (
                      <View key={`period-${item}`} style={styles.wheelItem}>
                        <Text style={[styles.wheelText, item === pickerPeriod && styles.wheelTextSelected]}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.pickerActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setActivePicker(null)}>
                    <Text style={styles.cancelBtnText}>{s.back}</Text>
                  </Pressable>
                  <Pressable style={styles.doneBtn} onPress={handlePickerConfirm}>
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

          <Text style={styles.businessNameLabel}>
            Business Images ({businessImages.length}/{MAX_BUSINESS_IMAGES})
          </Text>
          <View style={styles.businessImagesWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessImagesRow}>
              {businessImages.map((image) => (
                <View key={image.id} style={styles.businessImageItem}>
                  <Image source={{ uri: image.uri }} style={styles.businessImage} />
                  {!image.uploaded ? (
                    <View style={styles.imageDraftBadge}>
                      <Text style={styles.imageDraftBadgeText}>Draft</Text>
                    </View>
                  ) : null}
                  <Pressable style={styles.businessImageRemove} onPress={() => removeBusinessImage(image.id)}>
                    <Text style={styles.businessImageRemoveText}>x</Text>
                  </Pressable>
                </View>
              ))}
              {businessImages.length < MAX_BUSINESS_IMAGES ? (
                <Pressable
                  onPress={pickBusinessImages}
                  style={({ pressed }) => [styles.addBusinessImageBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.addBusinessImageText}>+ Add image</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>

          <AppButton
            label={mode === "onboarding" ? s.next : settings.save}
            onPress={handleSubmit}
            variant="filled"
            rightIcon={mode === "onboarding" ? "arrow-right" : "check"}
            fullWidth
            loading={isSaving}
            disabled={isSaving}
            style={styles.nextBtn}
            accessibilityLabel={mode === "onboarding" ? s.next : settings.save}
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
    marginBottom: 8,
  },
  phoneHintText: {
    color: theme.colors.blue500,
    fontSize: theme.fontSize.descText,
    marginBottom: 12,
    paddingHorizontal: 8,
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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
  businessImagesWrap: {
    marginBottom: 16,
  },
  businessImagesRow: {
    gap: 10,
    paddingRight: 8,
  },
  businessImageItem: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.blue900,
  },
  businessImage: {
    width: "100%",
    height: "100%",
  },
  businessImageRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  businessImageRemoveText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  imageDraftBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageDraftBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  addBusinessImageBtn: {
    width: 120,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.blue900,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  addBusinessImageText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.smallText,
    fontWeight: "600",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.8,
  },
});
